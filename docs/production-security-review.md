# Foundry Production Security Review: Market Data Backend & Multi-Tenant Isolation

**Target Application:** Foundry — Virtual Startup Market Simulator  
**Scope:** Supabase Database (PostgreSQL 15+), Ingestion Engine, PostgREST API, Client Storage, and Multi-Tenant Founder Isolation  
**Review Status:** Completed & Audited for Production Readiness  
**Local Verification Date:** October 2026

---

## 1. Executive Summary

This security review audits the database architecture, authorization policies, secret management, and network ingestion perimeter for Foundry's market data operations. Foundry combines **publicly accessible macroeconomic / industry benchmark indicators** with **strictly confidential founder startup workspaces**.

The architecture adheres to the **Principle of Least Privilege (PoLP)** and zero-trust perimeter defense:
1. **Zero Service-Role Leakage:** Frontend browser bundles and static HTML/JS files contain only public reference definitions and optionally the Supabase project URL and anon/publishable key (`SUPABASE_ANON_KEY`). The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) and third-party ingestion tokens are strictly quarantined to server-side / CI-CD ingestion environments.
2. **Deterministic Row Level Security (RLS):** All 8 production tables enforce explicit RLS with separated read/write policies. No unauthenticated or client-side authenticated actor can mutate, drop, or corrupt public market indicator records or peer founder models.
3. **Multi-Tenant Founder Workspace Isolation:** Startup profiles, simulation run logs, and market calibration datasets are isolated using Supabase Auth UUID bindings (`auth.uid() = user_id`).
4. **Ingestion Defense-in-Depth:** Ingestion payloads are sanitized, bounded (max 50,000 observations per run), schema-validated (ISO-3 regex, finite range checks), and sanitized against token leakage in public error logs.

---

## 2. Row Level Security (RLS) Policy Audit Matrix

Every database table in `public` has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Below is the verified policy audit:

| Table Name | RLS Enabled | Public/Anon Read | Authenticated Founder Read | Founder Write / Mutate | Service-Role / Admin Ingestion |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `public.market_data_sources` | **YES** | Read-Only (`USING (true)`) | Read-Only (`USING (true)`) | **DENIED** (no policy) | Full Access (Bypasses RLS) |
| `public.market_indicators` | **YES** | Read-Only (`USING (true)`) | Read-Only (`USING (true)`) | **DENIED** (no policy) | Full Access (Bypasses RLS) |
| `public.country_observations` | **YES** | Read-Only (`USING (true)`) | Read-Only (`USING (true)`) | **DENIED** (no policy) | Full Access (Bypasses RLS) |
| `public.market_import_logs` | **YES** | Read-Only (`USING (true)`) | Read-Only (`USING (true)`) | **DENIED** (no policy) | Full Access (Bypasses RLS) |
| `public.profiles` | **YES** | **DENIED** | Own profile only (`auth.uid() = id`) | Own profile only (`auth.uid() = id`) | Full Access |
| `public.startups` | **YES** | **DENIED** | Own startups only (`auth.uid() = user_id`) | Own startups only (`auth.uid() = user_id`) | Full Access |
| `public.market_places` | **YES** | **DENIED** | Own places via startup ownership | Own places via startup ownership | Full Access |
| `public.simulation_runs` | **YES** | **DENIED** | Own runs only (`auth.uid() = user_id`) | Own runs only (`auth.uid() = user_id`) | Full Access |

### Verification of Public Read Access for Market Data
* **Requirement:** Macroeconomic, connectivity, e-commerce, and mobile app statistics (World Bank, ITU, Global Findex, UNCTAD, Eurostat) must be queryable by any user exploring the market simulator or data coverage pages without requiring login.
* **Implementation:** Policies `Allow public read on market_data_sources`, `Allow public read on market_indicators`, `Allow public read on country_observations`, and `Allow public read on market_import_logs` grant `SELECT` access to both `anon` and `authenticated` roles (`FOR SELECT USING (true)`).
* **Security Guard:** `INSERT`, `UPDATE`, and `DELETE` privileges are strictly withheld from `anon` and `authenticated` roles. Client-side attempts to call `.insert()` or `.delete()` return HTTP 403 Forbidden / PostgREST policy denial.

### Verification of Founder Workspace Isolation
* **Requirement:** A founder’s startup profile, financial unit economics, market geography choices, launch experiments, and model runs must remain completely private to that founder.
* **Implementation:**
  - `public.startups`: Policy `startups_select_policy` enforces `USING (auth.uid() = user_id)`.
  - `public.simulation_runs`: Policy `simulation_runs_owner_policy` enforces `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
  - Cascading foreign keys (`ON DELETE CASCADE`) guarantee that account deletion purges orphaned simulation runs without leaking fragments into common storage.

---

## 3. Secret Management & Key Segregation

Foundry implements strict credential segregation:

```
┌────────────────────────────────────────────────────────┐
│                   PUBLIC CLIENT TIER                   │
│  - Browser / Frontend (index.html, app.js)             │
│  - Publishable Anon Key ONLY (SUPABASE_ANON_KEY)       │
│  - Read public market datasets & self workspace        │
└───────────────────────────┬────────────────────────────┘
                            │ PostgREST API (RLS Enforced)
┌───────────────────────────▼────────────────────────────┐
│                  SUPABASE CLOUD / DB                   │
│  - Row Level Security (RLS) active on all tables       │
│  - Views: v_market_sources_health                      │
│  - Constraints: chk_iso3, chk_obs_value_sanity         │
└───────────────────────────▲────────────────────────────┘
                            │ Service-Role Key (Bypasses RLS)
┌───────────────────────────┴────────────────────────────┐
│               RESTRICTED INGESTION RUNNERS             │
│  - GitHub Actions Workflow (market-data-refresh.yml)   │
│  - Scheduled Cron Orchestrator (run-all-scheduled.mjs) │
│  - Environment: SUPABASE_SERVICE_ROLE_KEY              │
│  - Automatic Credential Redaction in Error Logs        │
└────────────────────────────────────────────────────────┘
```

### Guidelines Enforced:
1. **Frontend Hygiene:**
   - No `service_role` string appears in `app.js`, `supabaseClient.js`, or `index.html`.
   - The cloud connection configuration modal (`#cloudConfigModal`) explicitly informs founders:
     > *"Client Security Notice: Enter only your Project URL and Publishable (Anon) Key. Never enter your service-role key or importer secret in the browser."*
2. **Environment Variable Safeguards:**
   - `.env` and `.env.local` are explicitly added to `.gitignore`.
   - Node.js importer scripts verify that `SUPABASE_SERVICE_ROLE_KEY` is present before attempting ingestion. If only `SUPABASE_ANON_KEY` is supplied, importers reject the run with an explicit error rather than attempting unauthorized writes.
3. **GitHub Actions Encrypted Secrets:**
   - Workflows consume secrets via repository secrets (`${{ secrets.SUPABASE_URL }}` and `${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`).
   - Secrets are masked in standard GitHub Actions execution logs.

---

## 4. Ingestion Engine Perimeter & Attack Vector Mitigations

Automated data pipelines consume feeds from external third-party HTTP endpoints. To guard against network tampering, server compromise, or malformed data feeds, `scripts/utils/production-importer.mjs` implements several defensive measures:

### A. Payload Denial-of-Service (DoS) and Size Bomb Prevention
* **Risk:** A compromised upstream API returns 500,000+ records, exhausting database buffer pools or PostgREST timeout thresholds.
* **Mitigation:**
  - `MAX_BATCH_SIZE` default limit: 50,000 items per ingestion execution.
  - Importer fails gracefully with `PayloadTooLargeError` before allocating heap memory or sending massive payloads to the database.

### B. ISO-3 Alpha Country Code Validation
* **Risk:** Upstream changes or data corruption inserting non-standard country identifiers, SQL injection strings, or arbitrary keys.
* **Mitigation:**
  - Strict regular expression enforcement: `/^[A-Z]{3}$/`.
  - Database constraint: `chk_country_obs_iso3_format CHECK (country_code ~ '^[A-Z]{3}$')`.

### C. Numerical Value Sanity Checks
* **Risk:** `NaN`, `Infinity`, extreme floating-point overflow, or corrupted negative figures contaminating simulation calibrations.
* **Mitigation:**
  - Importer sanitizes non-null values: checks `Number.isFinite(val)` and bounds values between `-1e14` and `+1e14`.
  - Database constraint: `chk_country_obs_value_sanity CHECK (value IS NULL OR (value > -1e14 AND value < 1e14))`.

### D. In-Memory Deduplication (PostgREST Merge Conflict Protection)
* **Risk:** If an upstream API returns duplicate `(country_code, indicator_code, year)` tuples within the same HTTP payload batch, PostgreSQL throws: `ON CONFLICT DO UPDATE command cannot affect row a second time`.
* **Mitigation:**
  - Ingestion engine uses composite Map key `country:indicator:year` to deduplicate records in memory before chunking.
  - Upsert chunks are limited to 250 records per HTTP request to ensure sub-second latency and zero payload truncation.

### E. Error Sanitization & Token Redaction in Audit Logs
* **Risk:** Database error messages or upstream HTTP exception stacks might capture authorization headers, JWT tokens, or API keys and store them in `public.market_import_logs.errors`, which are publicly readable.
* **Mitigation:**
  - `sanitizeError(err)` uses regular expressions to redact JWT patterns (`eyJ...`), Bearer tokens, and service keys before serializing errors into audit rows.

---

## 5. Security Checklist Before Production Deployment

- [x] RLS enabled and validated on all 8 application tables.
- [x] Public read verified for market data; write restricted to service role.
- [x] Multi-tenant founder workspace isolation confirmed via `auth.uid() = user_id`.
- [x] Ingestion token redaction implemented in `production-importer.mjs`.
- [x] Payload size boundaries and ISO-3 regex constraints active in database migrations.
- [ ] Founder Supabase Project: Run migration `20261018000008_production_operations_and_health.sql`.
- [ ] GitHub Repository: Set repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Supabase Dashboard: Verify Network Restrictions / IP allowlists if hosting on Supabase Team/Enterprise plan.
