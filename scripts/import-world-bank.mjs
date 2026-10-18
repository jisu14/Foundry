// ==============================================================================
// Script: scripts/import-world-bank.mjs
// Description: Standalone backend runner for the World Bank Indicators API importer.
// Usage: node scripts/import-world-bank.mjs [start_year:end_year]
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const INDICATORS = [
  {
    code: 'SP.POP.TOTL',
    name: 'Population, total',
    unit: 'people',
    topic: 'Demographics & Market Size'
  },
  {
    code: 'NY.GDP.PCAP.CD',
    name: 'GDP per capita (current US$)',
    unit: 'current US$',
    topic: 'Economic Context'
  },
  {
    code: 'IT.NET.USER.ZS',
    name: 'Individuals using the Internet (% of population)',
    unit: '% of population',
    topic: 'Digital Infrastructure & Connectivity'
  },
  {
    code: 'IT.CEL.SETS.P2',
    name: 'Mobile cellular subscriptions (per 100 people)',
    unit: 'subscriptions per 100 people',
    topic: 'Mobile Infrastructure'
  },
  {
    code: 'IT.NET.BBND.P2',
    name: 'Fixed broadband subscriptions (per 100 people)',
    unit: 'subscriptions per 100 people',
    topic: 'Broadband Infrastructure'
  }
];

const SOURCE_META = {
  id: 'world_bank',
  name: 'World Development Indicators (WDI)',
  publisher: 'The World Bank Group',
  source_url: 'https://data.worldbank.org/',
  methodology_url: 'https://databank.worldbank.org/source/world-development-indicators',
  api_endpoint: 'https://api.worldbank.org/v2/',
  reuse_terms: 'Creative Commons Attribution 4.0 International (CC-BY 4.0). Data can be shared and adapted provided appropriate credit is given: World Bank, World Development Indicators.',
  attribution: 'World Bank, World Development Indicators (WDI). Licensed under CC-BY 4.0.',
  disclaimer: 'Country-level macroeconomic and infrastructure indicators provide baseline geographical and infrastructure context. They do not measure individual purchasing intent, corporate software budgets, or willingness to buy.'
};

const dateRange = process.argv[2] || '2015:2024';

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

async function runImporter() {
  console.log('------------------------------------------------------------');
  console.log(`Starting World Bank Indicators Importer (Date Range: ${dateRange})`);
  console.log('Target Indicators:', INDICATORS.map(i => i.code).join(', '));
  console.log('------------------------------------------------------------');

  const importLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // 1. Create audit log entry with status 'running'
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
        summary: `Started World Bank WDI ingestion for 5 indicators (${dateRange}).`
      })
    });
    console.log(`[Log Created] Audit Log ID: ${importLogId}`);
  } catch (err) {
    console.error('[Error] Could not initialize market_import_logs:', err.message);
    process.exit(1);
  }

  const errors = [];
  const successfulIndicators = [];
  const observedCountries = new Set();
  let totalObservationsUpserted = 0;

  try {
    // 2. Fetch authoritative country list to exclude regional aggregates
    console.log('Fetching World Bank sovereign country directory...');
    const countryMap = new Map();
    const countryRes = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=350');
    if (!countryRes.ok) throw new Error(`HTTP ${countryRes.status} fetching country metadata`);
    const countryData = await countryRes.json();
    const rawCountries = countryData[1] || [];

    for (const c of rawCountries) {
      const isAggregate = !c.region || c.region.value === 'Aggregates' || c.region.id === 'NA';
      const iso3 = (c.id || '').trim().toUpperCase();
      if (!isAggregate && iso3.length === 3) {
        countryMap.set(iso3, {
          code: iso3,
          name: c.name || iso3
        });
      }
    }
    console.log(`Identified ${countryMap.size} verified sovereign countries (regional aggregates excluded).`);

    // 3. Process each of the 5 indicators
    for (const indicator of INDICATORS) {
      console.log(`\nFetching ${indicator.code} (${indicator.name})...`);
      try {
        let page = 1;
        let totalPages = 1;
        const observations = [];

        while (page <= totalPages) {
          const apiUrl = `https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json&date=${dateRange}&per_page=1000&page=${page}`;
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status} from World Bank API for ${indicator.code}`);

          const json = await res.json();
          const pageMeta = json[0];
          const rawItems = json[1] || [];

          totalPages = pageMeta?.pages || 1;

          for (const item of rawItems) {
            const rawIso3 = (item.countryiso3code || item.country?.id || '').trim().toUpperCase();

            // Strictly filter out regional aggregates
            if (!rawIso3 || rawIso3.length !== 3 || !countryMap.has(rawIso3)) {
              continue;
            }

            const year = parseInt(item.date, 10);
            if (isNaN(year) || year < 1960 || year > 2100) {
              continue;
            }

            // Preserve missing values as null. Never invent or fill gaps with synthetic numbers.
            let numericVal = null;
            if (item.value !== null && item.value !== undefined) {
              const parsed = Number(item.value);
              if (!isNaN(parsed)) {
                numericVal = parsed;
              }
            }

            const countryInfo = countryMap.get(rawIso3);
            observedCountries.add(rawIso3);

            observations.push({
              country_code: countryInfo.code,
              country_name: countryInfo.name,
              indicator_code: indicator.code,
              year: year,
              value: numericVal,
              unit: indicator.unit,
              source_id: SOURCE_META.id,
              imported_at: new Date().toISOString(),
              metadata: {
                source_name: SOURCE_META.name,
                source_url: `https://data.worldbank.org/indicator/${indicator.code}`,
                methodology_url: SOURCE_META.methodology_url,
                reuse_terms: SOURCE_META.reuse_terms,
                attribution: SOURCE_META.attribution,
                disclaimer: SOURCE_META.disclaimer,
                reference_period: String(year),
                topic: indicator.topic,
                obs_status: item.obs_status || null,
                decimal: item.decimal ?? 0
              }
            });
          }

          page++;
        }

        // Upsert batch in chunks of 250 rows to keep payloads optimal
        const CHUNK_SIZE = 250;
        let indicatorUpsertCount = 0;
        for (let i = 0; i < observations.length; i += CHUNK_SIZE) {
          const chunk = observations.slice(i, i + CHUNK_SIZE);
          await supabaseRequest('country_observations?on_conflict=country_code,indicator_code,year', {
            method: 'POST',
            headers: {
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(chunk)
          });
          indicatorUpsertCount += chunk.length;
        }

        totalObservationsUpserted += indicatorUpsertCount;
        successfulIndicators.push(indicator.code);
        console.log(`  ✓ Successfully upserted ${indicatorUpsertCount} observations for ${indicator.code}`);
      } catch (indErr) {
        console.error(`  ✗ Failed indicator ${indicator.code}: ${indErr.message}`);
        errors.push({
          indicator: indicator.code,
          message: indErr.message || String(indErr),
          timestamp: new Date().toISOString()
        });
      }
    }

    // 4. Update audit log
    const completedAt = new Date().toISOString();
    let finalStatus = 'success';
    if (errors.length > 0) {
      finalStatus = successfulIndicators.length > 0 ? 'partial_failure' : 'failed';
    }

    const summaryText = `Import ${finalStatus}: ${totalObservationsUpserted} observations processed across ${observedCountries.size} sovereign countries for ${successfulIndicators.length}/${INDICATORS.length} indicators. Regional aggregates excluded.`;

    await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed_at: completedAt,
        status: finalStatus,
        records_imported: totalObservationsUpserted,
        records_updated: totalObservationsUpserted,
        countries_count: observedCountries.size,
        indicators_count: successfulIndicators.length,
        errors: errors,
        summary: summaryText
      })
    });

    // Update last_checked_at on source catalog
    await supabaseRequest(`market_data_sources?id=eq.${SOURCE_META.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_checked_at: completedAt })
    });

    console.log('\n============================================================');
    console.log(`Import Complete! Status: ${finalStatus.toUpperCase()}`);
    console.log(`Summary: ${summaryText}`);
    console.log(`Audit Log ID: ${importLogId}`);
    console.log('============================================================');
  } catch (fatalErr) {
    const completedAt = new Date().toISOString();
    console.error('\n[FATAL ERROR]', fatalErr.message);

    errors.push({
      message: `Fatal error: ${fatalErr.message}`,
      timestamp: completedAt
    });

    await supabaseRequest(`market_import_logs?id=eq.${importLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed_at: completedAt,
        status: 'failed',
        errors: errors,
        summary: `Fatal failure: ${fatalErr.message}`
      })
    });

    process.exit(1);
  }
}

runImporter();
