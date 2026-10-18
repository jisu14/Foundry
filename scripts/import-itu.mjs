// ==============================================================================
// Script: scripts/import-itu.mjs
// Description: Admin-only backend importer for International Telecommunication Union (ITU)
//              digital access and connectivity indicators.
// Usage: node scripts/import-itu.mjs [path/to/itu-data.csv]
// Requirements: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
  id: 'itu',
  name: 'ITU DataHub / ICT Indicators Database',
  publisher: 'International Telecommunication Union (ITU)',
  source_url: 'https://datahub.itu.int/',
  methodology_url: 'https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx',
  api_endpoint: 'https://api.datahub.itu.int/v2/',
  reuse_terms: 'ITU Copyright & Disclaimer. Permitted for non-commercial, research, and educational purposes with mandatory attribution: Source: International Telecommunication Union (ITU). Commercial redistribution requires prior written permission (sales@itu.int / jur@itu.int). Data provided as is without warranty.',
  attribution: 'Source: International Telecommunication Union (ITU), ITU DataHub.',
  disclaimer: 'Digital access and connectivity metrics quantify national telecommunications infrastructure, mobile coverage, and household device penetration. They do not validate customer demand, price tolerance, product-market fit, or software purchasing intent.'
};

const VALID_INDICATORS = new Map([
  [
    'ITU.ICT.HH.INET',
    {
      name: 'Households with Internet access (%)',
      unit: '% of households',
      topic: 'Digital Infrastructure & Connectivity',
      limitations: 'Measures domestic household connectivity infrastructure, not individual user activity, broadband bandwidth tier, network latency, or household disposable income. It does not measure customer readiness to purchase digital software or pay for consumer apps.'
    }
  ],
  [
    'ITU.ICT.MOB.4G',
    {
      name: 'Population covered by at least a 4G mobile network (%)',
      unit: '% of population',
      topic: 'Mobile Infrastructure',
      limitations: 'Indicates mobile cellular signal availability across residential geography. Physical signal coverage does not imply smartphone device ownership, active mobile data subscriptions, data bundle affordability, or reliable connection speeds under network congestion.'
    }
  ],
  [
    'ITU.ICT.ACT.MBB',
    {
      name: 'Active mobile-broadband subscriptions (per 100 inhabitants)',
      unit: 'subscriptions per 100 inhabitants',
      topic: 'Mobile Infrastructure',
      limitations: 'Measures subscription volume rather than unique individual human users. Metric can exceed 100 due to enterprise fleet accounts, multi-SIM devices, and machine-to-machine cards. Does not measure data consumption volume, network speed tiers, or consumer software spending.'
    }
  ],
  [
    'ITU.ICT.FBB.10M',
    {
      name: 'Fixed broadband subscriptions >= 10 Mbit/s (% of total fixed broadband)',
      unit: '% of fixed broadband subscriptions',
      topic: 'Broadband Infrastructure',
      limitations: 'Measures contracted speed tiers among existing fixed-line subscribers, not actual real-world throughput, latency, packet loss, or business IT spending. Does not account for households or small businesses without fixed wireline access.'
    }
  ]
]);

// Helper for Supabase REST API requests using service-role authorization
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase REST error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

// Simple robust CSV line parser handling quotes and commas
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
  const csvArg = process.argv[2] || path.join(process.cwd(), 'data', 'itu-connectivity-data.csv');
  const resolvedCsvPath = path.resolve(process.cwd(), csvArg);

  console.log('------------------------------------------------------------');
  console.log('Starting ITU Digital Access & Connectivity Data Importer');
  console.log(`Source Catalog: ${SOURCE_META.name} (${SOURCE_META.id})`);
  console.log(`Target CSV File: ${resolvedCsvPath}`);
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(resolvedCsvPath)) {
    console.error(`\x1b[31m[ERROR] CSV file not found at path: ${resolvedCsvPath}\x1b[0m`);
    process.exit(1);
  }

  const importLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // 1. Ensure ITU Source and Indicators are seeded in catalog
  console.log('Verifying ITU source and indicator definitions in Supabase catalog...');
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
      definition: `${meta.name}. Measured by National Statistical Offices / Regulatory Authorities under ITU standards.`,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));

    await supabaseRequest('market_indicators?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(indicatorPayload)
    });
    console.log('✓ ITU Source and Indicator catalog records confirmed.');
  } catch (catalogErr) {
    console.error('[Error] Could not initialize ITU catalog records:', catalogErr.message);
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
        summary: `Admin-only ITU CSV ingestion initiated from ${path.basename(resolvedCsvPath)}.`
      })
    });
    console.log(`[Audit Log] Created execution log ID: ${importLogId}`);
  } catch (logErr) {
    console.error('[Error] Could not create initial market_import_logs record:', logErr.message);
    process.exit(1);
  }

  const errors = [];
  const observedCountries = new Map(); // iso3 -> country_name
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
      obs_status: header.indexOf('obs_status')
    };

    if (colIndex.country_code === -1 || colIndex.indicator_code === -1 || colIndex.year === -1) {
      throw new Error(`CSV is missing required columns. Required: country_code, indicator_code, year. Found: ${header.join(', ')}`);
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

      // Validate Country ISO-3
      if (!rawIso3 || rawIso3.length !== 3 || !/^[A-Z]{3}$/.test(rawIso3)) {
        errors.push({ line: lineNum, message: `Invalid ISO-3 country code: "${rawIso3}"` });
        continue;
      }

      // Validate Indicator Code
      if (!VALID_INDICATORS.has(rawIndicator)) {
        errors.push({ line: lineNum, message: `Unknown or unapproved ITU indicator code: "${rawIndicator}"` });
        continue;
      }

      // Validate Year
      const year = parseInt(rawYearStr, 10);
      if (isNaN(year) || year < 1960 || year > 2100) {
        errors.push({ line: lineNum, message: `Invalid reference year: "${rawYearStr}"` });
        continue;
      }

      // Value: strictly preserve missing values as NULL.
      let numericVal = null;
      if (rawValStr !== '' && rawValStr !== null && rawValStr !== undefined && rawValStr.toUpperCase() !== 'NA') {
        const parsed = Number(rawValStr);
        if (!isNaN(parsed)) {
          numericVal = parsed;
        } else {
          errors.push({ line: lineNum, message: `Non-numeric value "${rawValStr}" treated as missing (NULL).` });
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
          import_file: path.basename(resolvedCsvPath)
        }
      });
    }

    console.log(`Parsed ${observationsToUpsert.length} observation records from CSV (${errors.length} validation issues flagged).`);

    // 4. Batch upsert into country_observations (chunk size 200)
    const CHUNK_SIZE = 200;
    let totalUpserted = 0;

    for (let i = 0; i < observationsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = observationsToUpsert.slice(i, i + CHUNK_SIZE);
      await supabaseRequest('country_observations?on_conflict=country_code,indicator_code,year', {
        method: 'POST',
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(chunk)
      });
      totalUpserted += chunk.length;
      process.stdout.write(`\rUpserted ${totalUpserted} / ${observationsToUpsert.length} records...`);
    }
    console.log('\n✓ Batch upsert completed successfully.');

    // 5. Build Comprehensive Coverage Summary
    const sortedYears = Array.from(observedYears).sort((a, b) => a - b);
    const yearRangeStr = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : 'N/A';
    const coverageDetails = [];
    coverageDetails.push(`Total Economies Covered: ${observedCountries.size} sovereign nations.`);
    coverageDetails.push(`Reference Year Window: ${yearRangeStr} (Years: ${sortedYears.join(', ')}).`);
    coverageDetails.push('Indicator Coverage Breakdown:');
    for (const [code, stat] of observationsByIndicator.entries()) {
      coverageDetails.push(`  • ${code}: ${stat.reported} reported values, ${stat.missing} missing values preserved as NULL (Total ${stat.total}).`);
    }

    const summaryText = [
      `ITU Ingestion Completed. Successfully stored ${totalUpserted} observations across ${observedCountries.size} countries and ${observationsByIndicator.size} indicators (${yearRangeStr}).`,
      `Missing data preserved: Verified NULLs stored without synthetic estimation.`,
      coverageDetails.join('\n')
    ].join('\n\n');

    const finalStatus = errors.length > 0 ? (totalUpserted > 0 ? 'partial_failure' : 'failed') : 'success';

    // 6. Update Market Import Audit Log
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
        summary: summaryText
      })
    });

    console.log('\n============================================================');
    console.log(`IMPORT EXECUTION FINISHED: Status [${finalStatus.toUpperCase()}]`);
    console.log(summaryText);
    console.log('============================================================\n');

  } catch (err) {
    console.error(`\n\x1b[31m[FATAL ERROR] Ingestion failed: ${err.message}\x1b[0m`);
    try {
      await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          status: 'failed',
          errors: [{ message: err.message, stack: err.stack }],
          summary: `Fatal error during ITU CSV ingestion: ${err.message}`
        })
      });
    } catch (_) {}
    process.exit(1);
  }
}

runImporter();
