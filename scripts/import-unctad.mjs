// ==============================================================================
// Script: scripts/import-unctad.mjs
// Description: Admin-only backend importer for UN Trade and Development (UNCTADstat)
//              e-commerce and digital economy indicators.
// Usage: node scripts/import-unctad.mjs [path/to/unctad-export.csv]
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

// Load .env without third-party dependencies
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
  id: 'unctad',
  name: 'UNCTADstat (UN Trade and Development Data Hub)',
  publisher: 'United Nations Conference on Trade and Development (UNCTAD)',
  source_url: 'https://unctadstat.unctad.org/',
  methodology_url: 'https://unctadstat.unctad.org/EN/Methodology.html',
  api_endpoint: 'https://unctadstat.unctad.org/EN/DataCentre.html',
  reuse_terms: 'Creative Commons Attribution 3.0 IGO (CC-BY 3.0 IGO). Reproduction, sharing, and distribution permitted with mandatory attribution: Source: United Nations Trade and Development (UNCTAD). Data provided as is without warranty.',
  attribution: 'United Nations Trade and Development (UNCTAD), UNCTADstat Data Hub. Licensed under CC-BY 3.0 IGO.',
  disclaimer: 'E-commerce and digital trade metrics quantify national commercial digital infrastructure, enterprise connectivity, and cross-border digitally deliverable services. They do not predict or prove demand for a specific product, nor do they measure individual price elasticity or willingness to pay.'
};

const VALID_INDICATORS = new Map([
  [
    'UNCTAD.ECOMM.B2C.IDX',
    {
      name: 'UNCTAD B2C E-commerce Index (0–100)',
      unit: 'Index (0–100)',
      topic: 'E-Commerce & Digital Economy',
      limitations: 'Measures structural macroeconomic readiness and transaction infrastructure, not individual purchasing volume, consumer product preference, or commercial conversion for a specific startup.'
    }
  ],
  [
    'UNCTAD.ECOMM.DDS.SHR',
    {
      name: 'Share of digitally deliverable services in total services exports (%)',
      unit: '% of total services exports',
      topic: 'Digital Trade & Services',
      limitations: 'Measures national macro-export competitiveness in cross-border digital services. It does not measure domestic commercial SaaS demand, local software spending power, or willingness to pay.'
    }
  ],
  [
    'UNCTAD.ECOMM.ENT.RCV',
    {
      name: 'Enterprises receiving orders online (% of enterprises)',
      unit: '% of enterprises',
      topic: 'Enterprise ICT Adoption',
      limitations: 'Measures commercial digital sales channel adoption among formal firms. Does not measure order profitability, transaction volume, or enterprise budget readiness for new software tools.'
    }
  ],
  [
    'UNCTAD.ECOMM.ENT.WEB',
    {
      name: 'Enterprises with a website (% of enterprises)',
      unit: '% of enterprises',
      topic: 'Enterprise ICT Adoption',
      limitations: 'Indicates baseline corporate web presence. Having a homepage does not indicate cloud software maturity, modern tech stack adoption, or willingness to purchase enterprise software.'
    }
  ],
  [
    'UNCTAD.ECOMM.IND.BUY',
    {
      name: 'Individuals who purchased goods or services online (% of individuals)',
      unit: '% of individuals',
      topic: 'E-Commerce & Digital Economy',
      limitations: 'Measures general consumer e-commerce participation across all commercial sectors (retail, groceries, transport). Past online shopping activity does not prove customer interest or demand for a specific startup\'s offering.'
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
  const csvArg = process.argv[2] || path.join(process.cwd(), 'data', 'unctad-digital-economy-data.csv');
  const resolvedCsvPath = path.resolve(process.cwd(), csvArg);

  console.log('------------------------------------------------------------');
  console.log('Starting UNCTADstat E-Commerce & Digital Economy Importer');
  console.log(`Source Catalog: ${SOURCE_META.name} (${SOURCE_META.id})`);
  console.log(`Target CSV File: ${resolvedCsvPath}`);
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(resolvedCsvPath)) {
    console.error(`\x1b[31m[ERROR] CSV file not found at path: ${resolvedCsvPath}\x1b[0m`);
    process.exit(1);
  }

  const importLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // 1. Ensure UNCTAD Source and Indicator records are registered in Supabase catalog
  console.log('Verifying UNCTADstat source and indicator definitions in Supabase catalog...');
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
      definition: `${meta.name}. Compiled by UNCTAD from national statistical systems and international partner agencies.`,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));

    await supabaseRequest('market_indicators?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(indicatorPayload)
    });
    console.log('✓ UNCTAD Source and Indicator catalog records verified.');
  } catch (catalogErr) {
    console.error('[Error] Could not initialize UNCTAD catalog records:', catalogErr.message);
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
        summary: `UNCTADstat CSV ingestion initiated from ${path.basename(resolvedCsvPath)}.`
      })
    });
    console.log(`[Audit Log] Created execution log ID: ${importLogId}`);
  } catch (logErr) {
    console.error('[Error] Could not create initial market_import_logs record:', logErr.message);
    process.exit(1);
  }

  const errors = [];
  const observedCountries = new Map();
  const observedYears = new Set();
  const observationsByIndicator = new Map();
  const observationsToUpsert = [];

  try {
    // 3. Read and parse CSV
    const fileContent = fs.readFileSync(resolvedCsvPath, 'utf8');
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
      obs_status: header.indexOf('obs_status'),
      coverage_notes: header.indexOf('coverage_notes')
    };

    if (colIndex.country_code === -1 || colIndex.indicator_code === -1 || colIndex.year === -1) {
      throw new Error(`CSV is missing required columns (country_code, indicator_code, year). Found: ${header.join(', ')}`);
    }

    for (let lineNum = 2; lineNum <= lines.length; lineNum++) {
      const rawLine = lines[lineNum - 1];
      const cols = parseCsvLine(rawLine);

      const rawIso3 = (cols[colIndex.country_code] || '').trim().toUpperCase();
      const rawCountryName = (colIndex.country_name !== -1 && cols[colIndex.country_name]) ? cols[colIndex.country_name].trim() : rawIso3;
      const rawIndicator = (cols[colIndex.indicator_code] || '').trim();
      const rawYearStr = cols[colIndex.year] || '';
      const rawValStr = colIndex.value !== -1 ? cols[colIndex.value] : '';
      const rawUnit = colIndex.unit !== -1 && cols[colIndex.unit] ? cols[colIndex.unit].trim() : '';
      const rawUrl = colIndex.source_url !== -1 && cols[colIndex.source_url] ? cols[colIndex.source_url].trim() : SOURCE_META.source_url;
      const rawObsStatus = colIndex.obs_status !== -1 && cols[colIndex.obs_status] ? cols[colIndex.obs_status].trim() : null;
      const rawCoverageNotes = colIndex.coverage_notes !== -1 && cols[colIndex.coverage_notes] ? cols[colIndex.coverage_notes].trim() : 'National coverage';

      // Validate ISO-3 Country Code
      if (!rawIso3 || rawIso3.length !== 3 || !/^[A-Z]{3}$/.test(rawIso3)) {
        errors.push({ line: lineNum, message: `Invalid ISO-3 country code: "${rawIso3}"` });
        continue;
      }

      // Validate Indicator Code
      if (!VALID_INDICATORS.has(rawIndicator)) {
        errors.push({ line: lineNum, message: `Unknown UNCTAD indicator code: "${rawIndicator}"` });
        continue;
      }

      // Validate Year
      const year = parseInt(rawYearStr, 10);
      if (isNaN(year) || year < 1960 || year > 2100) {
        errors.push({ line: lineNum, message: `Invalid year: "${rawYearStr}"` });
        continue;
      }

      // Preserve missing values as NULL
      let numericVal = null;
      if (rawValStr !== '' && rawValStr !== null && rawValStr !== undefined && rawValStr.toUpperCase() !== 'NA') {
        const parsed = Number(rawValStr);
        if (!isNaN(parsed)) {
          numericVal = parsed;
        } else {
          errors.push({ line: lineNum, message: `Non-numeric value "${rawValStr}" stored as NULL.` });
        }
      }

      const indicatorMeta = VALID_INDICATORS.get(rawIndicator);
      const unit = rawUnit || indicatorMeta.unit;

      observedCountries.set(rawIso3, rawCountryName);
      observedYears.add(year);

      if (!observationsByIndicator.has(rawIndicator)) {
        observationsByIndicator.set(rawIndicator, { total: 0, reported: 0, missing: 0 });
      }
      const stats = observationsByIndicator.get(rawIndicator);
      stats.total++;
      if (numericVal !== null) stats.reported++;
      else stats.missing++;

      observationsToUpsert.push({
        country_code: rawIso3,
        country_name: rawCountryName,
        indicator_code: rawIndicator,
        year: year,
        value: numericVal,
        unit: unit,
        source_id: SOURCE_META.id,
        imported_at: new Date().toISOString(),
        metadata: {
          source_name: SOURCE_META.name,
          publisher: SOURCE_META.publisher,
          source_url: rawUrl,
          methodology_url: SOURCE_META.methodology_url,
          reuse_terms: SOURCE_META.reuse_terms,
          attribution: SOURCE_META.attribution,
          disclaimer: SOURCE_META.disclaimer,
          limitations: indicatorMeta.limitations,
          reference_period: String(year),
          topic: indicatorMeta.topic,
          obs_status: rawObsStatus,
          coverage_notes: rawCoverageNotes,
          import_file: path.basename(resolvedCsvPath)
        }
      });
    }

    console.log(`Parsed ${observationsToUpsert.length} observation records from CSV.`);

    // 4. Validate, quarantine corrupted records, and deduplicate before sending
    const { validObservations, quarantined, stats } = validateAndDeduplicateObservations(observationsToUpsert);
    if (quarantined.length > 0) {
      console.warn(`  ⚠ Quarantined ${quarantined.length} malformed records from CSV.`);
      errors.push(...quarantined.map(q => ({ row: q.row, error: q.reason })));
    }
    if (stats.duplicatesResolved > 0) {
      console.log(`  ℹ Deduplicated ${stats.duplicatesResolved} duplicate records in input.`);
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
    const yearRangeStr = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : 'N/A';
    const coverageDetails = [];
    coverageDetails.push(`Total Sovereign Economies: ${observedCountries.size} nations.`);
    coverageDetails.push(`Reference Period Range: ${yearRangeStr} (${sortedYears.join(', ')}).`);
    coverageDetails.push('Indicator Coverage Breakdown:');
    for (const [code, stat] of observationsByIndicator.entries()) {
      coverageDetails.push(`  • ${code}: ${stat.reported} reported values, ${stat.missing} missing values preserved as NULL (Total ${stat.total}).`);
    }

    const summaryText = [
      `UNCTADstat Ingestion Completed. Successfully stored ${totalUpserted} records across ${observedCountries.size} countries and ${observationsByIndicator.size} digital economy indicators (${yearRangeStr}).`,
      `Missing data preserved: Verified NULLs retained without synthetic data generation.`,
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
    console.log(`IMPORT EXECUTION FINISHED: Status [${finalStatus.toUpperCase()}]`);
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
          summary: `Fatal error during UNCTADstat ingestion: ${sanitizeError(err.message)}`
        })
      });
      await updateSourceOperationalStatus(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOURCE_META.id, 'failed');
    } catch (_) {}
    process.exit(1);
  }
}

runImporter();
