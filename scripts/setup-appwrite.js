/**
 * Foundry: Appwrite Automated Database & Collections Provisioner
 * Connects to Appwrite Cloud (https://fra.cloud.appwrite.io/v1) or Self-Hosted Appwrite
 * Creates database 'foundry_db' and all required collections with document-level security.
 *
 * Usage:
 *   node scripts/setup-appwrite.js <PROJECT_ID> <API_KEY> [ENDPOINT]
 *
 * Example:
 *   node scripts/setup-appwrite.js 66abc123... standard_secret_key... https://fra.cloud.appwrite.io/v1
 */

const https = require('https');
const http = require('http');

const PROJECT_ID = process.argv[2] || process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.argv[3] || process.env.APPWRITE_API_KEY;
const ENDPOINT = (process.argv[4] || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const DATABASE_ID = 'foundry_db';
const DATABASE_NAME = 'Foundry Database';

if (!PROJECT_ID || !API_KEY) {
  console.log(`
================================================================================
Foundry: Appwrite Database Setup Tool
================================================================================
Usage:
  node scripts/setup-appwrite.js <PROJECT_ID> <API_KEY> [ENDPOINT]

Arguments:
  PROJECT_ID : Your Appwrite Project ID (from Appwrite Cloud Console)
  API_KEY    : Your Appwrite Server API Key (from Project Settings > API Keys)
               (Required Scopes: databases.read, databases.write, collections.read, collections.write, attributes.read, attributes.write)
  ENDPOINT   : Optional endpoint (defaults to https://fra.cloud.appwrite.io/v1)

Example:
  node scripts/setup-appwrite.js 67... standard_appwrite_api_key_here
================================================================================
`);
  process.exit(1);
}

// Helper to make Appwrite REST API calls
function appwriteRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${ENDPOINT}${path}`);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
      }
    };

    const req = client.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = {};
        try {
          json = data ? JSON.parse(data) : {};
        } catch (_) {
          json = { raw: data };
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json);
        } else if (res.statusCode === 409) {
          // Resource already exists
          resolve({ alreadyExists: true, ...json });
        } else {
          reject(new Error(`[${res.statusCode}] ${json.message || data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const COLLECTIONS = [
  {
    id: 'founder_profiles',
    name: 'Founder Profiles',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'startup_name', type: 'string', size: 255, required: false },
      { key: 'business_model', type: 'string', size: 100, required: false },
      { key: 'industry_domain', type: 'string', size: 100, required: false },
      { key: 'target_customer_type', type: 'string', size: 100, required: false },
      { key: 'stage', type: 'string', size: 100, required: false },
      { key: 'home_country', type: 'string', size: 10, required: false },
      { key: 'raw_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'updated_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'customer_groups',
    name: 'Customer Groups',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'workspace_id', type: 'string', size: 255, required: false },
      { key: 'name', type: 'string', size: 255, required: false },
      { key: 'segment_type', type: 'string', size: 100, required: false },
      { key: 'reach_estimate', type: 'integer', required: false },
      { key: 'channel_cost', type: 'float', required: false },
      { key: 'channels_json', type: 'string', size: 65535, required: false, default: '[]' },
      { key: 'raw_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'competitor_notes',
    name: 'Competitor Notes',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'notes_json', type: 'string', size: 65535, required: false, default: '[]' },
      { key: 'updated_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'campaigns',
    name: 'Marketing Campaigns',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'target_tribe_id', type: 'string', size: 255, required: false },
      { key: 'pricing_monthly', type: 'float', required: false },
      { key: 'marketing_channel', type: 'string', size: 100, required: false },
      { key: 'test_budget', type: 'float', required: false },
      { key: 'target_country', type: 'string', size: 10, required: false },
      { key: 'raw_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'updated_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'simulation_runs',
    name: 'Simulation Runs',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'run_id', type: 'string', size: 255, required: true },
      { key: 'target_country', type: 'string', size: 10, required: false },
      { key: 'industry_domain', type: 'string', size: 100, required: false },
      { key: 'pricing_monthly', type: 'float', required: false },
      { key: 'test_budget', type: 'float', required: false },
      { key: 'marketing_channel', type: 'string', size: 100, required: false },
      { key: 'results_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'cohort_report_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'scenarios_json', type: 'string', size: 65535, required: false, default: '[]' },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'daily_cohort_reports',
    name: 'Daily Cohort Reports',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'simulation_run_id', type: 'string', size: 255, required: true },
      { key: 'day_index', type: 'integer', required: false },
      { key: 'active_users', type: 'integer', required: false },
      { key: 'new_signups', type: 'integer', required: false },
      { key: 'conversions', type: 'integer', required: false },
      { key: 'revenue', type: 'float', required: false },
      { key: 'churn', type: 'float', required: false },
      { key: 'events_json', type: 'string', size: 65535, required: false, default: '[]' },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'founder_real_evidence',
    name: 'Founder Real Evidence',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'study_title', type: 'string', size: 255, required: false },
      { key: 'method', type: 'string', size: 100, required: false },
      { key: 'sample_size', type: 'integer', required: false },
      { key: 'observed_conversion_rate', type: 'float', required: false },
      { key: 'notes', type: 'string', size: 65535, required: false },
      { key: 'privacy_status', type: 'string', size: 50, required: false, default: 'private' },
      { key: 'linked_simulation_run_id', type: 'string', size: 255, required: false },
      { key: 'raw_json', type: 'string', size: 65535, required: false, default: '{}' },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'beta_feedback_reports',
    name: 'Beta Feedback Reports',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: false },
      { key: 'category', type: 'string', size: 100, required: false },
      { key: 'simulation_run_id', type: 'string', size: 255, required: false },
      { key: 'observed_output', type: 'string', size: 4000, required: false },
      { key: 'expected_output', type: 'string', size: 4000, required: false },
      { key: 'feedback_text', type: 'string', size: 65535, required: false },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'user_roles',
    name: 'User Roles',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'role', type: 'string', size: 50, required: false, default: 'founder' },
      { key: 'granted_at', type: 'string', size: 50, required: false }
    ]
  },
  {
    id: 'grounded_research_reports',
    name: 'Grounded Research Reports',
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'country_code', type: 'string', size: 10, required: false },
      { key: 'industry_domain', type: 'string', size: 100, required: false },
      { key: 'question', type: 'string', size: 1000, required: false },
      { key: 'synthesis_markdown', type: 'string', size: 65535, required: false },
      { key: 'citations_json', type: 'string', size: 65535, required: false, default: '[]' },
      { key: 'created_at', type: 'string', size: 50, required: false }
    ]
  }
];

async function main() {
  console.log(`[Foundry Appwrite Provisioner] Connecting to ${ENDPOINT}...`);
  console.log(`[Foundry Appwrite Provisioner] Target Project: ${PROJECT_ID}`);

  // 1. Ensure Database
  try {
    console.log(`Creating/Verifying Database: ${DATABASE_ID} (${DATABASE_NAME})...`);
    await appwriteRequest('POST', '/databases', {
      databaseId: DATABASE_ID,
      name: DATABASE_NAME,
      enabled: true
    });
    console.log(`✓ Database '${DATABASE_ID}' created.`);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log(`✓ Database '${DATABASE_ID}' already exists.`);
    } else {
      console.error(`Error with database:`, err.message);
    }
  }

  // 2. Create Collections & Attributes
  for (const col of COLLECTIONS) {
    try {
      console.log(`\nConfiguring Collection: '${col.id}' (${col.name})...`);
      await appwriteRequest('POST', `/databases/${DATABASE_ID}/collections`, {
        collectionId: col.id,
        name: col.name,
        permissions: ['read("users")', 'create("users")', 'update("users")', 'delete("users")'],
        documentSecurity: true,
        enabled: true
      });
      console.log(`✓ Collection '${col.id}' created with documentSecurity=true.`);
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log(`✓ Collection '${col.id}' already exists.`);
      } else {
        console.warn(`Collection creation notice:`, err.message);
      }
    }

    // Provision attributes
    for (const attr of col.attributes) {
      try {
        const attrPath = `/databases/${DATABASE_ID}/collections/${col.id}/attributes/${attr.type}`;
        const payload = {
          key: attr.key,
          required: Boolean(attr.required)
        };
        if (attr.type === 'string') {
          payload.size = attr.size || 255;
          if (attr.default !== undefined) payload.default = attr.default;
        } else if (attr.type === 'integer' || attr.type === 'float') {
          if (attr.default !== undefined) payload.default = attr.default;
        }

        await appwriteRequest('POST', attrPath, payload);
        console.log(`  + Added attribute: ${attr.key} (${attr.type})`);
        await sleep(150); // Small pause for Appwrite schema locks
      } catch (attrErr) {
        if (attrErr.message && attrErr.message.includes('already exists')) {
          // Attribute already present
        } else {
          console.warn(`  - Attribute '${attr.key}': ${attrErr.message}`);
        }
      }
    }
  }

  console.log(`\n================================================================================`);
  console.log(`🎉 Foundry Appwrite Cloud Setup Completed Successfully!`);
  console.log(`Database ID:   ${DATABASE_ID}`);
  console.log(`Collections:   ${COLLECTIONS.length} collections provisioned`);
  console.log(`Endpoint:      ${ENDPOINT}`);
  console.log(`Project ID:    ${PROJECT_ID}`);
  console.log(`================================================================================`);
}

main().catch(err => {
  console.error('\n❌ Fatal Setup Error:', err);
  process.exit(1);
});
