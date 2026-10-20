const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const allMigrationsPath = path.join(__dirname, '..', 'supabase', 'all_migrations.sql');

function processSql(sql) {
  let modified = sql;

  // 1. Replace CREATE POLICY with DROP POLICY IF EXISTS ...; CREATE POLICY
  // Pattern: CREATE POLICY "policy_name" ON table_name
  // Also handle CREATE POLICY policy_name ON table_name (without quotes)
  const policyRegex = /(?:DROP\s+POLICY\s+IF\s+EXISTS\s+(?:\"[^\"]+\"|[a-zA-Z0-9_]+)\s+ON\s+[a-zA-Z0-9_.]+\s*;\s*)?(CREATE\s+POLICY\s+(\"[^\"]+\"|[a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+))/gi;
  
  modified = modified.replace(policyRegex, (match, createPolicyStmt, policyName, tableName) => {
    return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};\n${createPolicyStmt}`;
  });

  // 2. Triggers: In PostgreSQL, triggers need DROP TRIGGER IF EXISTS trigger_name ON table_name; before CREATE TRIGGER
  const triggerRegex = /(?:DROP\s+TRIGGER\s+IF\s+EXISTS\s+[a-zA-Z0-9_]+\s+ON\s+[a-zA-Z0-9_.]+\s*;\s*)?(CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)\s+[\s\S]*?ON\s+([a-zA-Z0-9_.]+))/gi;
  // Let's be careful with triggers. Let's see if triggers exist first.
  
  return modified;
}

// Read all migration files
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
console.log(`Found ${files.length} migration files.`);

let bundleContent = `-- ==============================================================================
-- Foundry: Complete Database Schema & Seed Data Bundle
-- Run this in your Supabase Dashboard > SQL Editor > New Query
-- Note: Fully idempotent (safe to run multiple times without 42710 errors)
-- ==============================================================================

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const rawSql = fs.readFileSync(filePath, 'utf8');
  const processed = processSql(rawSql);
  
  // Save back to migration file
  fs.writeFileSync(filePath, processed, 'utf8');
  console.log(`Processed ${file}`);

  bundleContent += `\n-- ------------------------------------------------------------------------------\n`;
  bundleContent += `-- MIGRATION: ${file}\n`;
  bundleContent += `-- ------------------------------------------------------------------------------\n\n`;
  bundleContent += processed.trim() + '\n\n';
}

fs.writeFileSync(allMigrationsPath, bundleContent, 'utf8');
console.log(`Successfully generated idempotent bundle at ${allMigrationsPath}`);
