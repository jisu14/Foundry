const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const outSqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261018000016_seed_country_observations.sql');

// Map sources from CSV / baseline
const SOURCE_MAP = {
  'itu': 'itu_datahub',
  'itu_datahub': 'itu_datahub',
  'world_bank_findex': 'global_findex',
  'global_findex': 'global_findex',
  'eurostat': 'eurostat',
  'unctadstat': 'unctad',
  'unctad': 'unctad',
  'world_bank': 'world_bank',
  'world_bank_wdi': 'world_bank'
};

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const observations = [];

// 1. Process ITU CSV
const ituCsv = fs.readFileSync(path.join(dataDir, 'itu-connectivity-data.csv'), 'utf8').trim().split('\n');
const ituHeader = ituCsv[0].split(',');
for (let i = 1; i < ituCsv.length; i++) {
  const parts = ituCsv[i].split(',');
  if (parts.length >= 6) {
    const [country_code, country_name, indicator_code, year, value, unit, source_url, obs_status] = parts;
    const numVal = value === '' || value.toUpperCase() === 'NULL' ? null : parseFloat(value);
    observations.push({
      country_code: country_code.trim(),
      country_name: country_name.trim(),
      indicator_code: indicator_code.trim(),
      year: parseInt(year.trim(), 10),
      value: isNaN(numVal) ? null : numVal,
      unit: unit.trim(),
      source_id: 'itu_datahub',
      metadata: { source_url, obs_status }
    });
  }
}

// 2. Process Global Findex CSV (handling possible quotes)
function parseCsvLine(line) {
  const result = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const findexCsv = fs.readFileSync(path.join(dataDir, 'global-findex-data.csv'), 'utf8').trim().split('\n');
for (let i = 1; i < findexCsv.length; i++) {
  const parts = parseCsvLine(findexCsv[i]);
  if (parts.length >= 6) {
    const [country_code, country_name, indicator_code, year, value, unit, source_url, target_population, survey_breakdown] = parts;
    const numVal = value === '' || value.toUpperCase() === 'NULL' ? null : parseFloat(value);
    observations.push({
      country_code: country_code.trim(),
      country_name: country_name.trim(),
      indicator_code: indicator_code.trim(),
      year: parseInt(year.trim(), 10),
      value: isNaN(numVal) ? null : numVal,
      unit: unit.trim(),
      source_id: 'global_findex',
      metadata: { source_url, target_population, survey_breakdown }
    });
  }
}

// 3. Process UNCTAD CSV
const unctadCsv = fs.readFileSync(path.join(dataDir, 'unctad-digital-economy-data.csv'), 'utf8').trim().split('\n');
for (let i = 1; i < unctadCsv.length; i++) {
  const parts = parseCsvLine(unctadCsv[i]);
  if (parts.length >= 6) {
    const [country_code, country_name, indicator_code, year, value, unit, source_url, obs_status, coverage_notes] = parts;
    const numVal = value === '' || value.toUpperCase() === 'NULL' ? null : parseFloat(value);
    observations.push({
      country_code: country_code.trim(),
      country_name: country_name.trim(),
      indicator_code: indicator_code.trim(),
      year: parseInt(year.trim(), 10),
      value: isNaN(numVal) ? null : numVal,
      unit: unit.trim(),
      source_id: 'unctad',
      metadata: { source_url, obs_status, coverage_notes }
    });
  }
}

// 4. Process Mobile Apps / Eurostat CSV
const eurostatCsv = fs.readFileSync(path.join(dataDir, 'mobile-apps-data.csv'), 'utf8').trim().split('\n');
for (let i = 1; i < eurostatCsv.length; i++) {
  const parts = parseCsvLine(eurostatCsv[i]);
  if (parts.length >= 6) {
    const [country_code, country_name, indicator_code, year, value, unit, source_url, obs_status, coverage_notes] = parts;
    const numVal = value === '' || value.toUpperCase() === 'NULL' ? null : parseFloat(value);
    observations.push({
      country_code: country_code.trim(),
      country_name: country_name.trim(),
      indicator_code: indicator_code.trim(),
      year: parseInt(year.trim(), 10),
      value: isNaN(numVal) ? null : numVal,
      unit: unit.trim(),
      source_id: 'eurostat',
      metadata: { source_url, obs_status, coverage_notes }
    });
  }
}

// 5. World Bank observations
const WB_DATA = [
  { code: 'USA', name: 'United States', pop: 334914895, gdp: 81695, netUser: 91.8, celSets: 110.2, bbnd: 38.6 },
  { code: 'DEU', name: 'Germany', pop: 84482267, gdp: 52824, netUser: 93.3, celSets: 128.5, bbnd: 44.5 },
  { code: 'GBR', name: 'United Kingdom', pop: 68350000, gdp: 48866, netUser: 96.7, celSets: 118.4, bbnd: 41.2 },
  { code: 'FRA', name: 'France', pop: 68170228, gdp: 44460, netUser: 92.0, celSets: 116.3, bbnd: 46.8 },
  { code: 'IND', name: 'India', pop: 1428627663, gdp: 2484, netUser: 52.0, celSets: 82.5, bbnd: 2.6 },
  { code: 'BRA', name: 'Brazil', pop: 215313498, gdp: 10043, netUser: 80.5, celSets: 104.2, bbnd: 20.8 },
  { code: 'KEN', name: 'Kenya', pop: 55100586, gdp: 2099, netUser: 29.5, celSets: 114.8, bbnd: 1.8 },
  { code: 'JPN', name: 'Japan', pop: 124516650, gdp: 33831, netUser: 90.2, celSets: 161.4, bbnd: 35.7 },
  { code: 'SGP', name: 'Singapore', pop: 5917600, gdp: 84734, netUser: 96.0, celSets: 160.2, bbnd: 26.5 },
  { code: 'NGA', name: 'Nigeria', pop: 223804632, gdp: 1621, netUser: 35.5, celSets: 99.1, bbnd: 4.8 },
  { code: 'CAN', name: 'Canada', pop: 40097761, gdp: 53371, netUser: 94.0, celSets: 92.4, bbnd: 42.1 }
];

for (const c of WB_DATA) {
  observations.push({
    country_code: c.code, country_name: c.name, indicator_code: 'SP.POP.TOTL', year: 2023, value: c.pop, unit: 'people', source_id: 'world_bank', metadata: {}
  });
  observations.push({
    country_code: c.code, country_name: c.name, indicator_code: 'NY.GDP.PCAP.CD', year: 2023, value: c.gdp, unit: 'current US$', source_id: 'world_bank', metadata: {}
  });
  observations.push({
    country_code: c.code, country_name: c.name, indicator_code: 'IT.NET.USER.ZS', year: 2023, value: c.netUser, unit: '% of population', source_id: 'world_bank', metadata: {}
  });
  observations.push({
    country_code: c.code, country_name: c.name, indicator_code: 'IT.CEL.SETS.P2', year: 2023, value: c.celSets, unit: 'subscriptions per 100 people', source_id: 'world_bank', metadata: {}
  });
  observations.push({
    country_code: c.code, country_name: c.name, indicator_code: 'IT.NET.BBND.P2', year: 2023, value: c.bbnd, unit: 'subscriptions per 100 people', source_id: 'world_bank', metadata: {}
  });
}

console.log(`Parsed total of ${observations.length} observations.`);

// Deduplicate on (country_code, indicator_code, year)
const dedupMap = new Map();
for (const obs of observations) {
  const key = `${obs.country_code}_${obs.indicator_code}_${obs.year}`;
  dedupMap.set(key, obs);
}
const uniqueObs = Array.from(dedupMap.values());
console.log(`Unique observations after deduplication: ${uniqueObs.length}`);

// Generate SQL
let sql = `-- ==============================================================================
-- Migration: 20261018000016_seed_country_observations.sql
-- Description: Seed verified sovereign country-level observations (World Bank, ITU, Findex, UNCTAD, Eurostat)
-- Note: Fully idempotent using ON CONFLICT (country_code, indicator_code, year) DO NOTHING
-- ==============================================================================

`;

const batchSize = 100;
for (let i = 0; i < uniqueObs.length; i += batchSize) {
  const batch = uniqueObs.slice(i, i + batchSize);
  sql += `INSERT INTO public.country_observations (country_code, country_name, indicator_code, year, value, unit, source_id, metadata)\nVALUES\n`;
  const valueRows = batch.map(o => {
    const valStr = o.value === null ? 'NULL' : o.value;
    const metaStr = escapeSql(JSON.stringify(o.metadata || {}));
    return `  (${escapeSql(o.country_code)}, ${escapeSql(o.country_name)}, ${escapeSql(o.indicator_code)}, ${o.year}, ${valStr}, ${escapeSql(o.unit)}, ${escapeSql(o.source_id)}, ${metaStr}::jsonb)`;
  });
  sql += valueRows.join(',\n') + '\n';
  sql += `ON CONFLICT (country_code, indicator_code, year) DO NOTHING;\n\n`;
}

fs.writeFileSync(outSqlPath, sql, 'utf8');
console.log(`Wrote seed migration to ${outSqlPath}`);
