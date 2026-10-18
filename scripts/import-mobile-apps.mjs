/**
 * ==============================================================================
 * Foundry: Mobile Apps Industry Data Pack Importer
 * Source: Eurostat Digital Economy & Society Statistics (isoc_sk_dskl_i21, isoc_ci_ac_i)
 * 
 * Rules:
 *  - Uses backend-only Supabase service-role key (bypasses RLS for write ops).
 *  - Implements permitted official Eurostat access method only.
 *  - Validates ISO-3 country codes, years, and values.
 *  - Preserves missing values as NULL without inventing sample data.
 *  - Maintains audit trail in public.market_import_logs.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid external dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
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

// Check CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('--paid-license') || args.includes('--restricted-help')) {
  console.log(`
==============================================================================
FOUNDRY MOBILE APPS DATA PACK: ACCESS METHODS & RESTRICTED LICENSES
==============================================================================

1. PERMISSION-CLEARED / OPEN DATA (Eurostat):
   • Dataset: Eurostat Digital Skills & ICT Household Surveys (isoc_sk_dskl_i21, isoc_ci_ac_i)
   • Access: Open REST API & bulk TSV/CSV downloads. Free commercial & non-commercial reuse.
   • Command: node scripts/import-mobile-apps.mjs [path-to-eurostat-data.csv]

2. COMMERCIAL PAID / RESTRICTED APP INTELLIGENCE (Sensor Tower, data.ai, Appfigures):
   • Download counts, revenue spend estimates, and MAU/DAU are proprietary commercial data.
   • These sources require commercial enterprise subscriptions ($30,000–$75,000+/yr).
   • To import verified Sensor Tower or data.ai data, you must provide:
     1. An official licensed CSV export (e.g., from Sensor Tower Store Intelligence).
     2. Validated columns: country_code (ISO-3), indicator_code, year, value, unit.
     3. An active enterprise authorization rider permitting storage.
   • Command for licensed custom file:
     node scripts/import-mobile-apps.mjs path/to/your-licensed-app-data.csv

Foundry strictly rejects unverified web scraping and does not fabricate numbers.
==============================================================================
`);
  process.exit(0);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\x1b[31m[ERROR] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in environment or .env file.\x1b[0m');
  console.error('Make sure you have your private service_role key (not the public anon key).');
  console.error('Run "node scripts/import-mobile-apps.mjs --help" to view license documentation.');
  process.exit(1);
}

const SOURCE_META = {
  id: 'eurostat',
  name: 'Eurostat Digital Economy & Mobile App Statistics',
  publisher: 'Eurostat (Statistical Office of the European Union)',
  source_url: 'https://ec.europa.eu/eurostat',
  methodology_url: 'https://ec.europa.eu/eurostat/cache/metadata/en/isoc_i_esms.htm',
  api_endpoint: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/',
  reuse_terms: 'European Commission Decision 2011/833/EU on the reuse of Commission documents. Free for commercial and non-commercial reuse with mandatory attribution: Source: Eurostat. Data provided as is without warranty.',
  attribution: 'Eurostat Digital Economy and Society Statistics (isoc_sk_dskl_i21, isoc_ci_ac_i). Licensed under Commission Decision 2011/833/EU.',
  disclaimer: 'Mobile app installation and category usage statistics establish national digital proficiency and smartphone habituation. They do not prove commercial conversion or customer willingness to pay for a specific startup\'s app.'
};

const VALID_INDICATORS = new Map([
  [
    'EUROSTAT.APP.INSTALL',
    {
      name: 'Individuals who downloaded or installed software or apps (% of individuals)',
      unit: '% of individuals',
      topic: 'Mobile Apps & Software Ecosystem',
      limitations: 'Measures population technical capability and general propensity to install software. Downloading an app does not prove engagement, willingness to pay, recurring subscription conversion, or retention for a specific startup product.'
    }
  ],
  [
    'EUROSTAT.APP.CONFIG',
    {
      name: 'Individuals who changed settings of software, apps, or devices (% of individuals)',
      unit: '% of individuals',
      topic: 'Mobile Apps & Software Ecosystem',
      limitations: 'Demonstrates digital proficiency with app settings and device permissions. A high configuration rate indicates lower tech friction, but does not indicate available software budget or commercial purchase intent.'
    }
  ],
  [
    'EUROSTAT.APP.BANK',
    {
      name: 'Individuals using mobile app or internet banking (% of individuals)',
      unit: '% of individuals',
      topic: 'Fintech & Mobile Banking Apps',
      limitations: 'Refers specifically to formal financial banking utility apps. Active mobile banking adoption indicates payment-rail familiarity, not willingness to purchase third-party consumer or SaaS subscriptions.'
    }
  ],
  [
    'EUROSTAT.APP.HEALTH',
    {
      name: 'Individuals accessing health records or digital health apps (% of individuals)',
      unit: '% of individuals',
      topic: 'Digital Health & Wellness Apps',
      limitations: 'Refers to digital healthcare interaction and mobile wellness tracking. Does not predict clinical diagnostic app adoption or willingness to pay out-of-pocket for health subscriptions.'
    }
  ],
  [
    'EUROSTAT.APP.STREAM',
    {
      name: 'Individuals streaming video, TV, or video content via apps (% of individuals)',
      unit: '% of individuals',
      topic: 'Entertainment & Video Apps',
      limitations: 'Measures consumer attention and digital entertainment media consumption. High video streaming usage does not imply willingness to subscribe to new niche video or creator tools.'
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
  const startTime = new Date();
  console.log('============================================================');
  console.log('FOUNDRY: MOBILE APPS INDUSTRY DATA PACK INGESTION');
  console.log(`Execution Started: ${startTime.toISOString()}`);
  console.log(`Target Backend:    ${SUPABASE_URL}`);
  console.log('============================================================\n');

  // 1. Initial Audit Log Entry
  let importLogId = null;
  try {
    const initialLog = await supabaseRequest('market_import_logs', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        source_id: SOURCE_META.id,
        started_at: startTime.toISOString(),
        status: 'running',
        summary: 'Initiating Eurostat Mobile Apps industry pack ingestion run.'
      })
    });
    if (Array.isArray(initialLog) && initialLog[0]) {
      importLogId = initialLog[0].id;
      console.log(`[AUDIT LOG] Created execution log run ID: ${importLogId}`);
    }
  } catch (err) {
    console.warn(`[AUDIT WARNING] Could not initialize audit log row: ${err.message}`);
  }

  try {
    // 2. Upsert Eurostat Data Source Record
    console.log('[STEP 1/4] Upserting Eurostat source definition...');
    await supabaseRequest('market_data_sources?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        id: SOURCE_META.id,
        name: SOURCE_META.name,
        publisher: SOURCE_META.publisher,
        source_url: SOURCE_META.source_url,
        methodology_url: SOURCE_META.methodology_url,
        api_endpoint: SOURCE_META.api_endpoint,
        reuse_terms: SOURCE_META.reuse_terms,
        last_checked_at: new Date().toISOString()
      }])
    });
    console.log('✓ Source record registered successfully.');

    // 3. Upsert Eurostat Mobile App Indicators
    console.log('[STEP 2/4] Upserting Mobile App indicator catalog...');
    const indicatorsPayload = Array.from(VALID_INDICATORS.entries()).map(([code, meta]) => ({
      id: code,
      source_id: SOURCE_META.id,
      name: meta.name,
      definition: meta.name,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));

    await supabaseRequest('market_indicators?on_conflict=id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(indicatorsPayload)
    });
    console.log(`✓ ${indicatorsPayload.length} Mobile App indicators verified in catalog.`);

    // 4. Resolve and Parse Data CSV
    console.log('[STEP 3/4] Parsing official mobile app data observations...');
    const targetFile = args[0] || path.resolve(__dirname, '../data/mobile-apps-data.csv');
    if (!fs.existsSync(targetFile)) {
      throw new Error(`Data file not found at: ${targetFile}`);
    }
    console.log(`Reading dataset from: ${targetFile}`);

    const fileContent = fs.readFileSync(targetFile, 'utf8');
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);

    const colCountryCode = headers.indexOf('country_code');
    const colCountryName = headers.indexOf('country_name');
    const colIndicator = headers.indexOf('indicator_code');
    const colYear = headers.indexOf('year');
    const colValue = headers.indexOf('value');
    const colUnit = headers.indexOf('unit');
    const colSourceUrl = headers.indexOf('source_url');
    const colNotes = headers.indexOf('coverage_notes');

    if (colCountryCode === -1 || colIndicator === -1 || colYear === -1 || colValue === -1) {
      throw new Error('CSV is missing required headers: country_code, indicator_code, year, value');
    }

    const observationsToUpsert = [];
    const errors = [];
    const observedCountries = new Set();
    const observedYears = new Set();
    const observationsByIndicator = new Map();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const row = parseCsvLine(line);
      if (row.length < 4) continue;

      const rawCountry = row[colCountryCode]?.trim().toUpperCase();
      const countryName = colCountryName !== -1 ? row[colCountryName]?.trim() : rawCountry;
      const indicatorCode = row[colIndicator]?.trim();
      const rawYear = row[colYear]?.trim();
      const rawValue = row[colValue]?.trim();
      const unit = colUnit !== -1 ? row[colUnit]?.trim() : '% of individuals';
      const sourceUrl = colSourceUrl !== -1 ? row[colSourceUrl]?.trim() : SOURCE_META.source_url;
      const notes = colNotes !== -1 ? row[colNotes]?.trim() : null;

      // Validation 1: Country Code
      if (!rawCountry || rawCountry.length !== 3) {
        errors.push({ line: i + 1, error: `Invalid ISO-3 country code: "${rawCountry}"` });
        continue;
      }

      // Validation 2: Indicator Code
      if (!VALID_INDICATORS.has(indicatorCode)) {
        errors.push({ line: i + 1, error: `Unregistered indicator code: "${indicatorCode}"` });
        continue;
      }

      // Validation 3: Year
      const year = parseInt(rawYear, 10);
      if (isNaN(year) || year < 2000 || year > 2030) {
        errors.push({ line: i + 1, error: `Invalid reference year: "${rawYear}"` });
        continue;
      }

      // Validation 4: Value (Allow null for missing data preservation)
      let numericValue = null;
      if (rawValue !== '' && rawValue !== undefined && rawValue !== 'null' && rawValue !== 'NULL' && rawValue !== ':') {
        const parsed = parseFloat(rawValue);
        if (isNaN(parsed)) {
          errors.push({ line: i + 1, error: `Invalid numeric value: "${rawValue}"` });
          continue;
        }
        numericValue = parsed;
      }

      observedCountries.add(rawCountry);
      observedYears.add(year);

      if (!observationsByIndicator.has(indicatorCode)) {
        observationsByIndicator.set(indicatorCode, { total: 0, reported: 0, missing: 0 });
      }
      const stat = observationsByIndicator.get(indicatorCode);
      stat.total++;
      if (numericValue !== null) {
        stat.reported++;
      } else {
        stat.missing++;
      }

      observationsToUpsert.push({
        country_code: rawCountry,
        country_name: countryName,
        indicator_code: indicatorCode,
        year: year,
        value: numericValue,
        unit: unit,
        source_id: SOURCE_META.id,
        imported_at: new Date().toISOString(),
        metadata: {
          source_name: SOURCE_META.name,
          publisher: SOURCE_META.publisher,
          source_url: sourceUrl,
          coverage_notes: notes,
          attribution: SOURCE_META.attribution,
          limitations: VALID_INDICATORS.get(indicatorCode).limitations,
          disclaimer: SOURCE_META.disclaimer
        }
      });
    }

    console.log(`✓ Parsed ${observationsToUpsert.length} observation records from CSV.`);
    if (errors.length > 0) {
      console.warn(`⚠ Encountered ${errors.length} validation issues (skipped invalid rows):`);
      errors.slice(0, 5).forEach(e => console.warn(`  • Line ${e.line}: ${e.error}`));
      if (errors.length > 5) console.warn(`  ...and ${errors.length - 5} more.`);
    }

    // 5. Batch Upsert to Supabase
    console.log('[STEP 4/4] Upserting country observations to Supabase in batches...');
    const BATCH_SIZE = 100;
    let totalUpserted = 0;

    for (let i = 0; i < observationsToUpsert.length; i += BATCH_SIZE) {
      const chunk = observationsToUpsert.slice(i, i + BATCH_SIZE);
      await supabaseRequest('country_observations?on_conflict=country_code,indicator_code,year', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(chunk)
      });
      totalUpserted += chunk.length;
      process.stdout.write(`\rUpserted ${totalUpserted} / ${observationsToUpsert.length} records...`);
    }
    console.log('\n✓ Batch upsert completed successfully.');

    // 6. Coverage Breakdown
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
      `Eurostat Mobile Apps Industry Pack Ingestion Completed. Successfully stored ${totalUpserted} records across ${observedCountries.size} countries and ${observationsByIndicator.size} mobile indicators (${yearRangeStr}).`,
      `Missing data preserved: Verified NULLs retained without synthetic data generation.`,
      coverageDetails.join('\n')
    ].join('\n\n');

    const finalStatus = errors.length > 0 ? (totalUpserted > 0 ? 'partial_failure' : 'failed') : 'success';

    // 7. Update Market Import Audit Log
    if (importLogId) {
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
    }

    console.log('\n============================================================');
    console.log(`IMPORT EXECUTION FINISHED: Status [${finalStatus.toUpperCase()}]`);
    console.log(summaryText);
    console.log('============================================================\n');

  } catch (err) {
    console.error(`\n\x1b[31m[FATAL ERROR] Ingestion failed: ${err.message}\x1b[0m`);
    if (importLogId) {
      try {
        await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            completed_at: new Date().toISOString(),
            status: 'failed',
            errors: [{ message: err.message, stack: err.stack }],
            summary: `Fatal error during Eurostat mobile apps ingestion: ${err.message}`
          })
        });
      } catch (_) {}
    }
    process.exit(1);
  }
}

runImporter();
