# Foundry Database Backup & Disaster Recovery Runbook

**Target Application:** Foundry — Virtual Startup Market Simulator  
**Database Engine:** PostgreSQL 15+ (Hosted on Supabase)  
**Document Version:** 1.0 (Production Operational Standard)  
**Last Updated:** October 2026

---

## 1. Overview & Service Level Objectives

This runbook establishes disaster recovery (DR) protocols, backup cadences, and restoration procedures for the Foundry database. Foundry stores two tiers of data:
1. **Public Reference Datasets (Reproducible):** Macroeconomic, connectivity, e-commerce, and mobile app indicators sourced from official providers (World Bank, ITU, Global Findex, UNCTAD, Eurostat).
2. **Founder Proprietary Workspaces (Non-Reproducible):** Founder startup profiles, customized place configurations, experiment notes, and historical simulation run outputs.

### Service Level Objectives (SLOs)

| Metric | Free Tier (Daily Snapshot) | Supabase Pro / PITR Tier | Self-Managed Logical Dump |
| :--- | :---: | :---: | :---: |
| **Recovery Point Objective (RPO)** | 24 Hours | ≤ 2 Minutes (Continuous WAL) | Configured schedule (e.g. 12 Hours) |
| **Recovery Time Objective (RTO)** | < 1 Hour | < 15 Minutes (Instant Branch) | < 30 Minutes (`pg_restore`) |
| **Backup Retention** | 7 Days | 7 Days (expandable to 30 Days) | As configured (e.g. S3 / GCS 90 Days) |

---

## 2. Backup Architecture & Tiers

### Tier 1: Supabase Native Automated Backups (Managed)
* **Free Tier:** Supabase takes automated daily logical backups of your PostgreSQL database around 00:00 UTC. These are retained for 7 days. Backups do not count toward your database storage quota.
* **Pro Tier ($25/mo):** Includes continuous Write-Ahead Log (WAL) archiving and 7-day Point-in-Time Recovery (PITR). Allows restoration to any specific second within the retention window.

### Tier 2: Automated External Logical Backups (`pg_dump`)
For multi-cloud redundancy or zero-dependency disaster recovery, Foundry provides an automated `pg_dump` backup script that runs via GitHub Actions or local cron.

#### Recommended Daily Dump Command
Run via secure shell with the Supabase direct database connection string (from Supabase Dashboard → Project Settings → Database → Connection string):

```bash
# Set database connection URI (keep credentials restricted)
export DB_URI="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Execute compressed custom-format pg_dump
pg_dump "$DB_URI" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="foundry_backup_$(date +%Y%m%d_%H%M%S).dump"
```

#### Selective Market Data vs. Founder Workspace Backup
To backup only the reproducible market data schema and observations:
```bash
pg_dump "$DB_URI" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --table=public.market_data_sources \
  --table=public.market_indicators \
  --table=public.country_observations \
  --table=public.market_import_logs \
  --file="foundry_market_data_$(date +%Y%m%d).dump"
```

To backup only founder workspace data:
```bash
pg_dump "$DB_URI" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --table=public.profiles \
  --table=public.startups \
  --table=public.market_places \
  --table=public.simulation_runs \
  --file="foundry_workspaces_$(date +%Y%m%d).dump"
```

---

## 3. Disaster Recovery & Restoration Procedures

### Scenario A: Selective Market Data Corruption or Rollback
* **Incident:** An upstream API provided bad or corrupted data that passed through ingestion, or schema modifications broke indicator mappings.
* **Resolution Steps:**
  1. Inspect the latest import log ID in `public.market_import_logs` to isolate the affected batch:
     ```sql
     SELECT id, source_id, started_at, records_imported, status 
     FROM public.market_import_logs 
     ORDER BY started_at DESC LIMIT 5;
     ```
  2. If a specific source is corrupted, purge its observations:
     ```sql
     -- Remove corrupted observations for source
     DELETE FROM public.country_observations WHERE source_id = 'affected_source_id';
     
     -- Mark source status as awaiting ingest
     UPDATE public.market_data_sources 
     SET last_import_status = 'pending', consecutive_failures = 0
     WHERE id = 'affected_source_id';
     ```
  3. Trigger an immediate clean re-ingest:
     ```bash
     node scripts/import-world-bank.mjs
     # or node scripts/run-all-scheduled-imports.mjs --force
     ```

### Scenario B: Restoring from a Supabase Dashboard Snapshot
1. Navigate to the **Supabase Dashboard** → Select your Foundry project.
2. Go to **Project Settings** → **Database** → **Backups**.
3. Under **Scheduled Backups**, locate the backup corresponding to the desired date.
4. Click **Restore**.
   > *Note:* In Supabase Free/Pro tiers, restoring a full snapshot temporarily takes the database offline for 3–10 minutes while the snapshot is applied.
5. Verify application connectivity once the database reports active.

### Scenario C: Restoring using Point-in-Time Recovery (PITR)
*(Available on Supabase Pro / Enterprise)*
1. In the Supabase Dashboard, go to **Database** → **Backups** → **Point in time**.
2. Select the exact date and timestamp immediately preceding the corruption or accidental deletion.
3. Choose **Clone to new project** (recommended to verify integrity before cutting over) or **Restore to current project**.
4. If cloned to a new project:
   - Validate table counts and founder profiles.
   - Update `CFG_URL` and `CFG_ANON_KEY` in Foundry Cloud Settings or repository secrets.

### Scenario D: Restoring from an External `.dump` File
If restoring into a fresh PostgreSQL instance or recovering from catastrophic infrastructure loss:

```bash
# 1. Ensure target database exists and uuid-ossp / pgcrypto extensions are active
psql "$TARGET_DB_URI" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 2. Run schema migrations in order
# Apply all migrations from supabase/migrations/
for file in supabase/migrations/*.sql; do
  psql "$TARGET_DB_URI" -f "$file"
done

# 3. Restore data from custom-format dump
pg_restore \
  --dbname="$TARGET_DB_URI" \
  --no-owner \
  --no-privileges \
  --data-only \
  "foundry_backup_20261018.dump"
```

---

## 4. Post-Restoration Verification & Health Checklist

Immediately following any database restoration, execute this verification suite:

### 1. View Health Audit
Run:
```sql
SELECT source_id, operational_status, records_count, countries_covered_count, days_since_last_import
FROM public.v_market_sources_health;
```
*Expected Outcome:* Returns all 5 sources (`world_bank`, `itu_datahub`, `global_findex`, `unctadstat`, `eurostat`) with operational status nominal or awaiting ingest.

### 2. Observation Integrity Check
Run:
```sql
SELECT 
  count(*) AS total_observations,
  count(DISTINCT country_code) AS total_countries,
  count(DISTINCT indicator_code) AS total_indicators,
  min(year) AS earliest_year,
  max(year) AS latest_year
FROM public.country_observations;
```
*Expected Outcome:* Non-zero row count, ISO-3 country codes valid, values within finite bounds.

### 3. Row Level Security Verification
Verify that RLS remains enforced on all tables:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```
*Expected Outcome:* `rowsecurity` must be `true` for all tables.

### 4. Founder Multi-Tenant Boundary Test
Connect with the anon key and query `public.startups`. Query must return 0 rows when unauthenticated.

---

## 5. Automated Backup Schedule Recommendation

| Component | Tool / Mechanism | Frequency | Storage Location | Encryption |
| :--- | :--- | :---: | :--- | :---: |
| Full Database Snapshot | Supabase Managed | Daily (00:00 UTC) | Supabase Managed Storage | AES-256 |
| WAL Transaction Logs | Supabase PITR (Pro) | Continuous (real-time) | Supabase Managed Storage | AES-256 |
| Logical Market & Schema Dump | GitHub Actions / Runner | Weekly | Encrypted Artifact / Private S3 | KMS / GPG |
| Migration Scripts | Git / GitHub repository | On Every Commit | Version Controlled in Git | HTTPS / SSH |
