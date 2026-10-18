// ==============================================================================
// Script: scripts/import-global-findex.mjs
// Description: Automated and Admin-file backend importer for the World Bank
//              Global Financial Inclusion (Global Findex) Database.
// Usage:
//   1. Automated API mode: node scripts/import-global-findex.mjs
//   2. Admin CSV mode:    node scripts/import-global-findex.mjs path/to/findex-export.csv
// Requirements: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  fetchWithRetry,
  sanitizeError,
  validateAndDeduplicateObservations,
  chunkedUpsertObservations,
  updateSourceOperationalStatus
} from './utils/production-importer.mjs';

// Simple .env parser to avoid third-party dependencies
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/(^['"]|['"]$)/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\x1b[31m[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment or .env file.\x1b[0m');
  console.error('Make sure you have your private service_role key (not the public anon key).');
  process.exit(1);
}

const SOURCE_META = {
  id: 'global_findex',
  name: 'Global Financial Inclusion (Global Findex) Database',
  publisher: 'The World Bank Group',
  source_url: 'https://www.worldbank.org/en/publication/globalfindex',
  methodology_url: 'https://databank.worldbank.org/source/global-financial-inclusion',
  api_endpoint: 'https://api.worldbank.org/v2/country/all/indicator/{id}?source=28&format=json',
  reuse_terms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0). Open non-commercial and commercial sharing and adaptation with mandatory attribution: The World Bank: Global Financial Inclusion (Global Findex) Database.',
  attribution: 'The World Bank Group, Global Financial Inclusion (Global Findex) Database. Licensed under CC-BY 4.0.',
  disclaimer: 'Payment and account ownership statistics establish national financial infrastructure readiness. They do not predict or prove that an individual customer will buy a product, nor do they measure price elasticity, individual willingness to pay, or customer conversion.'
};

const VALID_INDICATORS = new Map([
  [
    'account.t.d',
    {
      name: 'Account ownership (% age 15+)',
      unit: '% of population age 15+',
      topic: 'Financial Inclusion & Payments',
      limitations: 'Quantifies population-level access to formal banking and mobile money rails. Account possession does not measure active account usage, average balances, purchasing power, disposable income, or willingness to purchase online subscription software.'
    }
  ],
  [
    'g20.any',
    {
      name: 'Made or received digital payments (% age 15+)',
      unit: '% of population age 15+',
      topic: 'Digital Payments & Transaction Behavior',
      limitations: 'Measures baseline familiarity with digital payment instruments across the national population. Having made or received a digital payment (such as for utilities or remittances) does not validate demand, interest, or willingness to buy a specific software product.'
    }
  ],
  [
    'fin2.t.d',
    {
      name: 'Owns a debit card (% age 15+)',
      unit: '% of population age 15+',
      topic: 'Payment Cards & Infrastructure',
      limitations: 'Measures card issuance penetration. Does not measure international transaction support, online e-commerce activation, card authorization success rates, or consumer willingness to authorize recurring subscription charges.'
    }
  ],
  [
    'fin10',
    {
      name: 'Owns a credit card (% age 15+)',
      unit: '% of population age 15+',
      topic: 'Payment Cards & Infrastructure',
      limitations: 'Refers to formal revolving consumer credit card penetration. Heavily influenced by national banking regulations, underwriting standards, and income distribution. Does not indicate corporate expense card availability or willingness to buy.'
    }
  ],
  [
    'g20.made',
    {
      name: 'Made a digital payment (% age 15+)',
      unit: '% of population age 15+',
      topic: 'Digital Payments & Transaction Behavior',
      limitations: 'Captures the outbound transmission of funds through digital rails. Does not distinguish between high-value transactions and small utility payments, nor does it guarantee customer conversion for new digital services.'
    }
  ]
]);

// Helper for Supabase REST API requests using service-role authorization with retries
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetchWithRetry(url, {
    ...options,
    headers
  }, { maxRetries: 3, initialDelayMs: 1000 });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase REST error (${response.status}): ${sanitizeError(errorText)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

// CSV line parser supporting quotes and commas
function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

async function runImporter() {
  const fileArg = process.argv[2];
  const isCsvMode = Boolean(fileArg);
  const targetCsvPath = isCsvMode ? path.resolve(process.cwd(), fileArg) : null;

  console.log('------------------------------------------------------------');
  console.log('Starting World Bank Global Findex Ingestion');
  console.log(`Source: ${SOURCE_META.name} (${SOURCE_META.id})`);
  console.log(`Execution Mode: ${isCsvMode ? `Admin CSV File (${targetCsvPath})` : 'Automated World Bank Indicators API (V2, Source 28)'}`);
  console.log('------------------------------------------------------------');

  const importLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // 1. Seed Source and Indicator definitions in Supabase catalog
  console.log('Verifying Global Findex catalog records in database...');
  try {
    await supabaseRequest('market_data_sources?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify([SOURCE_META])
    });

    const indicatorPayload = Array.from(VALID_INDICATORS.entries()).map(([code, meta]) => ({
      id: code,
      source_id: SOURCE_META.id,
      name: meta.name,
      definition: `${meta.name}. Survey of adults age 15+ conducted via Gallup World Poll.`,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));

    await supabaseRequest('market_indicators?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(indicatorPayload)
    });
    console.log('✓ Global Findex Source and Indicator catalog records verified.');
  } catch (err) {
    console.error('[Error] Could not initialize Global Findex catalog:', err.message);
    process.exit(1);
  }

  // 2. Initialize Audit Log Entry with status 'running'
  try {
    await supabaseRequest('market_import_logs', {
      method: 'POST',
      body: JSON.stringify({
        id: importLogId,
        source_id: SOURCE_META.id,
        started_at: startedAt,
        status: 'running',
        records_imported: 0,
        records_updated: 0,
        countries_count: 0,
        indicators_count: 0,
        errors: [],
        summary: `Global Findex ingestion initiated via ${isCsvMode ? 'admin CSV' : 'automated API'}.`
      })
    });
    console.log(`[Audit Log] Created execution log ID: ${importLogId}`);
  } catch (err) {
    console.error('[Error] Could not create audit log:', err.message);
    process.exit(1);
  }

  const errors = [];
  const observedCountries = new Map();
  const observedYears = new Set();
  const observationsByIndicator = new Map();
  const observationsToUpsert = [];

  try {
    if (isCsvMode) {
      // -------------------------------------------------------------
      // ADMIN CSV IMPORT MODE
      // -------------------------------------------------------------
      if (!fs.existsSync(targetCsvPath)) {
        throw new Error(`Specified CSV file not found: ${targetCsvPath}`);
      }
      console.log(`Reading CSV file from ${targetCsvPath}...`);
      const fileContent = fs.readFileSync(targetCsvPath, 'utf8');
      const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

      if (lines.length <= 1) {
        throw new Error('CSV file is empty or contains only a header line.');
      }

      const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const colIndex = {
        country_code: header.indexOf('country_code'),
        country_name: header.indexOf('country_name'),
        indicator_code: header.indexOf('indicator_code'),
        year: header.indexOf('year'),
        value: header.indexOf('value'),
        unit: header.indexOf('unit'),
        source_url: header.indexOf('source_url'),
        target_population: header.indexOf('target_population'),
        survey_breakdown: header.indexOf('survey_breakdown')
      };

      if (colIndex.country_code === -1 || colIndex.indicator_code === -1 || colIndex.year === -1) {
        throw new Error(`CSV missing required columns (country_code, indicator_code, year).`);
      }

      for (let i = 2; i <= lines.length; i++) {
        const cols = parseCsvLine(lines[i - 1]);
        const iso3 = (cols[colIndex.country_code] || '').trim().toUpperCase();
        const countryName = (colIndex.country_name !== -1 && cols[colIndex.country_name]) ? cols[colIndex.country_name].trim() : iso3;
        const indCode = (cols[colIndex.indicator_code] || '').trim();
        const yearStr = cols[colIndex.year] || '';
        const valStr = colIndex.value !== -1 ? cols[colIndex.value] : '';
        const unit = (colIndex.unit !== -1 && cols[colIndex.unit]) ? cols[colIndex.unit].trim() : '% of population age 15+';
        const targetPop = (colIndex.target_population !== -1 && cols[colIndex.target_population]) ? cols[colIndex.target_population].trim() : 'Adults age 15+';
        const breakdown = (colIndex.survey_breakdown !== -1 && cols[colIndex.survey_breakdown]) ? cols[colIndex.survey_breakdown].trim() : 'National representative survey sample (Gallup World Poll)';

        if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) {
          errors.push({ line: i, message: `Invalid ISO-3 country code: "${iso3}"` });
          continue;
        }

        if (!VALID_INDICATORS.has(indCode)) {
          errors.push({ line: i, message: `Unrecognized Global Findex indicator code: "${indCode}"` });
          continue;
        }

        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year < 1960 || year > 2100) {
          errors.push({ line: i, message: `Invalid year: "${yearStr}"` });
          continue;
        }

        let numericVal = null;
        if (valStr !== '' && valStr !== null && valStr !== undefined && valStr.toUpperCase() !== 'NA') {
          const parsed = Number(valStr);
          if (!isNaN(parsed)) numericVal = parsed;
          else errors.push({ line: i, message: `Non-numeric value "${valStr}" treated as missing (NULL).` });
        }

        const indMeta = VALID_INDICATORS.get(indCode);
        observedCountries.set(iso3, countryName);
        observedYears.add(year);

        if (!observationsByIndicator.has(indCode)) {
          observationsByIndicator.set(indCode, { total: 0, reported: 0, missing: 0 });
        }
        const stats = observationsByIndicator.get(indCode);
        stats.total++;
        if (numericVal !== null) stats.reported++;
        else stats.missing++;

        observationsToUpsert.push({
          country_code: iso3,
          country_name: countryName,
          indicator_code: indCode,
          year: year,
          value: numericVal,
          unit: unit,
          source_id: SOURCE_META.id,
          imported_at: new Date().toISOString(),
          metadata: {
            source_name: SOURCE_META.name,
            publisher: SOURCE_META.publisher,
            source_url: SOURCE_META.source_url,
            methodology_url: SOURCE_META.methodology_url,
            reuse_terms: SOURCE_META.reuse_terms,
            attribution: SOURCE_META.attribution,
            disclaimer: SOURCE_META.disclaimer,
            limitations: indMeta.limitations,
            survey_wave: `${year} Survey Wave`,
            target_population: targetPop,
            survey_breakdown: breakdown,
            topic: indMeta.topic,
            import_type: 'admin_csv'
          }
        });
      }
    } else {
      // -------------------------------------------------------------
      // AUTOMATED WORLD BANK INDICATORS API (V2, SOURCE 28)
      // -------------------------------------------------------------
      console.log('Fetching sovereign countries directory to filter out regional aggregates...');
      const countryMap = new Map();
      const countryRes = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=350');
      if (!countryRes.ok) throw new Error(`HTTP ${countryRes.status} fetching country directory.`);
      const countryJson = await countryRes.json();
      const rawCountries = countryJson[1] || [];

      for (const c of rawCountries) {
        const isAggregate = !c.region || c.region.value === 'Aggregates' || c.region.id === 'NA';
        const iso3 = (c.id || '').trim().toUpperCase();
        if (!isAggregate && iso3.length === 3) {
          countryMap.set(iso3, c.name || iso3);
        }
      }
      console.log(`Identified ${countryMap.size} verified sovereign countries.`);

      // Query each approved Global Findex indicator across survey waves
      for (const [code, meta] of VALID_INDICATORS.entries()) {
        console.log(`\nFetching ${code} (${meta.name})...`);
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const apiUrl = `https://api.worldbank.org/v2/country/all/indicator/${code}?source=28&date=2014:2024&format=json&per_page=1000&page=${page}`;
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status} from World Bank API for ${code}`);

          const json = await res.json();
          const pageMeta = json[0];
          const rawItems = json[1] || [];
          totalPages = pageMeta?.pages || 1;

          for (const item of rawItems) {
            const rawIso3 = (item.country?.id || item.countryiso3code || '').trim().toUpperCase();
            if (!countryMap.has(rawIso3)) {
              // Exclude regional aggregates (e.g. WLD, EAP, ECA)
              continue;
            }

            const year = parseInt(item.date, 10);
            if (isNaN(year) || year < 1960 || year > 2100) continue;

            // Only capture official Global Findex triennial survey waves (2014, 2017, 2021, 2024)
            if (![2014, 2017, 2021, 2024].includes(year)) continue;

            let numericVal = null;
            if (item.value !== null && item.value !== undefined) {
              const parsed = Number(item.value);
              if (!isNaN(parsed)) numericVal = parsed;
            }

            const countryName = countryMap.get(rawIso3);
            observedCountries.set(rawIso3, countryName);
            observedYears.add(year);

            if (!observationsByIndicator.has(code)) {
              observationsByIndicator.set(code, { total: 0, reported: 0, missing: 0 });
            }
            const stats = observationsByIndicator.get(code);
            stats.total++;
            if (numericVal !== null) stats.reported++;
            else stats.missing++;

            observationsToUpsert.push({
              country_code: rawIso3,
              country_name: countryName,
              indicator_code: code,
              year: year,
              value: numericVal,
              unit: meta.unit,
              source_id: SOURCE_META.id,
              imported_at: new Date().toISOString(),
              metadata: {
                source_name: SOURCE_META.name,
                publisher: SOURCE_META.publisher,
                source_url: `https://databank.worldbank.org/source/global-financial-inclusion`,
                methodology_url: SOURCE_META.methodology_url,
                reuse_terms: SOURCE_META.reuse_terms,
                attribution: SOURCE_META.attribution,
                disclaimer: SOURCE_META.disclaimer,
                limitations: meta.limitations,
                survey_wave: `${year} Survey Wave`,
                target_population: 'Adults age 15+',
                survey_breakdown: 'Nationally representative survey sample (Gallup World Poll)',
                topic: meta.topic,
                import_type: 'automated_api'
              }
            });
          }
          page++;
        }
      }
    }

    console.log(`\nParsed ${observationsToUpsert.length} observation records from ${isCsvMode ? 'CSV' : 'API'}.`);

    // 4. Validate, quarantine corrupted records, and deduplicate before sending
    const { validObservations, quarantined, stats } = validateAndDeduplicateObservations(observationsToUpsert);
    if (quarantined.length > 0) {
      console.warn(`  ⚠ Quarantined ${quarantined.length} malformed records from input.`);
      errors.push(...quarantined.map(q => ({ row: q.row, error: q.reason })));
    }
    if (stats.duplicatesResolved > 0) {
      console.log(`  ℹ Deduplicated ${stats.duplicatesResolved} repeated records in input.`);
    }

    // 5. Batch upsert into country_observations with automatic retry
    const { totalUpserted, errors: chunkErrors } = await chunkedUpsertObservations(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      validObservations,
      { chunkSize: 250 }
    );

    if (chunkErrors.length > 0) {
      errors.push(...chunkErrors.map(ce => ({ error: ce.error })));
    }
    console.log(`\n✓ Upserted ${totalUpserted} records successfully.`);

    // 6. Generate Coverage Breakdown
    const sortedYears = Array.from(observedYears).sort((a, b) => a - b);
    const coverageDetails = [];
    coverageDetails.push(`Total Sovereign Economies: ${observedCountries.size} countries.`);
    coverageDetails.push(`Survey Waves Covered: ${sortedYears.join(', ')}.`);
    coverageDetails.push('Indicator Coverage Breakdown:');
    for (const [code, stat] of observationsByIndicator.entries()) {
      coverageDetails.push(`  • ${code}: ${stat.reported} reported observations, ${stat.missing} missing values preserved as NULL (Total: ${stat.total}).`);
    }

    const summaryText = [
      `Global Findex Ingestion Completed via ${isCsvMode ? 'admin CSV' : 'automated API'}. Successfully stored ${totalUpserted} records across ${observedCountries.size} sovereign nations and ${observationsByIndicator.size} indicators.`,
      `Missing Survey Wave Data: Preserved as verified NULLs without synthetic inflation.`,
      coverageDetails.join('\n')
    ].join('\n\n');

    const finalStatus = errors.length > 0 ? (totalUpserted > 0 ? 'partial_failure' : 'failed') : 'success';

    // 7. Update Market Import Audit Log
    await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed_at: new Date().toISOString(),
        status: finalStatus,
        records_imported: totalUpserted,
        records_updated: totalUpserted,
        countries_count: observedCountries.size,
        indicators_count: observationsByIndicator.size,
        errors: errors.slice(0, 50),
        summary: sanitizeError(summaryText)
      })
    });

    // Update operational status on source catalog
    await updateSourceOperationalStatus(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOURCE_META.id, finalStatus);

    console.log('\n============================================================');
    console.log(`IMPORT FINISHED: Status [${finalStatus.toUpperCase()}]`);
    console.log(summaryText);
    console.log('============================================================\n');

  } catch (err) {
    console.error(`\n\x1b[31m[FATAL ERROR] Ingestion failed: ${sanitizeError(err.message)}\x1b[0m`);
    try {
      await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          status: 'failed',
          errors: [{ message: sanitizeError(err.message) }],
          summary: `Fatal error during Global Findex ingestion: ${sanitizeError(err.message)}`
        })
      });
      await updateSourceOperationalStatus(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOURCE_META.id, 'failed');
    } catch (_) {}
    process.exit(1);
  }
}

runImporter();
