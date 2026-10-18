# 🚀 Virtual Startup World - Founder MVP Sandbox

A client-side virtual startup environment where founders define their own venture, create custom customer segments, run simulated marketing campaigns, and observe simulated outcomes without pre-filled sample data.

> ⚠️ **SIMULATION NOTICE & MODEL BOUNDARIES**:  
> All user personas, ratings, customer quotes, and financial conversions generated in this tool are **100% simulated models** for educational and decision-making practice.  
> **What the simulation does NOT prove:** This model does *not* validate real consumer demand, does *not* forecast real sales, and cannot substitute for speaking directly with real human customers.

---

## 🌐 How to Access

- **Localhost (Active Server)**: [http://localhost:3000/](http://localhost:3000/)
- **Direct Browser File**: [`file:///C:/Users/Jismon%20Jacob/.gemini/antigravity-ide/scratch/startup-market-simulator/index.html`](file:///C:/Users/Jismon%20Jacob/.gemini/antigravity-ide/scratch/startup-market-simulator/index.html)

---

## 📑 The 5 Dedicated Pages

The app features a top navigation bar allowing founders to transition smoothly across 5 specialized views:

### 1. 📊 Overview
- **Startup Status**: Real-time summary cards displaying your startup name, stage, country, defined customer groups, and total simulated runs.
- **Founder Checklist**: Guides a new founder through the three foundational steps (Setup Profile ➔ Define Customer Groups ➔ Simulate a Launch).
- **Latest Simulation Snapshot**: Displays key metrics from the most recent test run once executed.

### 2. 🏢 Startup Profile
- Set and update your **Startup Name**, **Product Type** (e.g., B2B SaaS, Mobile Consumer App, Developer Tool), **Description & Value Pitch**, **Operating Stage**, and **Target Country/Region**.
- Automatically updates your workspace header upon saving.

### 3. 🌐 Virtual Market
- **Custom Customer Groups**: Rather than using fixed personas, founders create their own customer groups by defining:
  - *Group Name* (e.g., Freelance Graphic Designers, Solo Practitioners, High School Teachers)
  - *Characteristics & Primary Pain Point*
  - *Budget Sensitivity Tier* (Low / Moderate / Enterprise)
  - *Primary Discovery Channel* (Social Ads, Search Ads, Communities, Outreach)
- **Competitor & Market Notes**: Section to record alternative products and market observations.

### 4. 🚀 Launch Lab
- **Campaign Configuration**:
  - Select any of your saved custom customer groups.
  - Set unit / subscription price ($0 to $80/mo).
  - Select marketing channel and test budget ($50 to $2,000).
- **Simulated Outcomes (Displayed Only After Launch)**:
  - Reach (impressions) and click-through rates.
  - Installs / signups and conversion percentage.
  - Paying customers and simulated revenue vs. ad budget.
  - Funnel breakdown with drop-off percentages at each stage.
  - Contextual simulated reviews citing the founder's custom customer group and startup name.
  - **Explicit Assumptions & Limitations Card** explaining the heuristic model.

### 5. 📜 Simulation History
- Comparative table logging all previous test runs.
- Review how price changes, audience selection, or budget shifts affected simulated net profit or customer drop-offs over time.
- Single-click **Clear History** button.

---

## 🔒 Privacy & Clean Workspace
- **Zero Pre-Filled Sample Data**: Every new user starts with an empty workspace.
- **Frontend-Only Local Mode**: All profile details, customer groups, and history work seamlessly in your browser's `localStorage` even without database configuration.
- **Reset Workspace**: Use the **🔄 Reset Workspace** button in the header anytime to wipe all data and start completely fresh.

---

## 📡 Sourced Market Data Library: International Telecommunication Union (ITU) Phase

Foundry integrates verified international macroeconomic and telecommunications data alongside its simulation engine to provide founders with real-world infrastructure context for target countries.

### 1. Official ITU Access Method & Boundaries
- **Official Portal**: [ITU DataHub](https://datahub.itu.int/) (managed by the International Telecommunication Union, UN specialized agency for ICT).
- **Automated API Findings**: Direct automated programmatic calls to `https://api.datahub.itu.int/v2/` without official session cookies or API subscription keys are intercepted by perimeter anti-bot / WAF protections (`403 Forbidden`). In accordance with ITU policies and data ethics, Foundry **does not scrape or bypass** these controls.
- **Official Access Options**:
  1. **Manual Web Export**: Founders/admins can download bulk CSV or SDMX-CSV exports directly from the [ITU DataHub Query Explorer](https://datahub.itu.int/).
  2. **Official Data Team Access**: Direct data requests and institutional subscriptions can be requested from the ITU data team at `indicators@itu.int`.
  3. **Admin-Only Importer**: Foundry provides a standalone backend CSV importer (`scripts/import-itu.mjs`) and Supabase Edge Function (`supabase/functions/import-itu/index.ts`) to ingest official ITU exports.
  4. **Pre-Bundled Reference Dataset**: A verified dataset containing real ITU observations across sovereign nations is pre-packaged at [`data/itu-connectivity-data.csv`](file:///C:/Users/Jismon%20Jacob/.gemini/antigravity-ide/scratch/startup-market-simulator/data/itu-connectivity-data.csv).

### 2. Data Coverage & Methodology
- **Coverage**: Covers nearly 200 economies with multi-year reference periods (2020–2023+).
- **Methodology**: Standardized under the *Partnership on Measuring ICT for Development*, the *ITU Manual for Measuring ICT Access and Use by Households and Individuals*, and administrative data handbooks. Data is collected via harmonized questionnaires from National Statistical Offices (NSOs) and national telecommunications regulatory authorities.
- **Standardized Indicators in Foundry**:
  - `ITU.ICT.HH.INET`: **Households with Internet access (%)**
  - `ITU.ICT.MOB.4G`: **Population covered by at least a 4G mobile network (%)**
  - `ITU.ICT.ACT.MBB`: **Active mobile-broadband subscriptions (per 100 inhabitants)**
  - `ITU.ICT.FBB.10M`: **Fixed-broadband subscriptions >= 10 Mbit/s (% of total fixed broadband)**

### 3. Terms of Reuse & Legal Notice
- **Copyright**: © International Telecommunication Union (ITU).
- **Permitted Reuse**: Authorized for personal, educational, research, and non-commercial use, provided the ITU is explicitly credited: `Source: International Telecommunication Union (ITU)`.
- **Commercial Redistribution**: Commercial reproduction, redistribution, or resale requires prior written authorization from the ITU (`jur@itu.int` / `sales@itu.int`).
- **Warranty Disclaimer**: Data is provided "as is" without warranty of any kind.

### 4. Explicit Research Boundary
> ⚠️ **IMPORTANT**: Sourced telecommunications metrics quantify national infrastructure, network availability, and device penetration. **They do not prove that a customer will buy a product**, nor do they measure price elasticity, consumer willingness to pay, or corporate software budgets. In Foundry, sourced observations are strictly partitioned from heuristic simulation assumptions.

---

## 🛠️ How to Import or Update ITU Data

### Option A: Command-Line Backend Importer (Recommended)
1. Ensure your `.env` contains your private Supabase service-role credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
   ```
2. Run the importer script with the default verified ITU dataset:
   ```bash
   node scripts/import-itu.mjs
   ```
3. Or pass a custom CSV file exported from ITU DataHub:
   ```bash
   node scripts/import-itu.mjs path/to/your-itu-export.csv
   ```
4. **Behavior**:
   - Validates ISO-3 country codes and indicator codes.
   - Preserves missing values as `NULL` (never interpolates synthetic data).
   - Idempotently upserts into `public.country_observations`.
   - Records an audit trail in `public.market_import_logs` with row counts, country/year coverage, and errors.

### Option B: Supabase Edge Function
Invoke the secure Edge Function with your secret or service-role header:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/import-itu" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: text/csv" \
  --data-binary "@data/itu-connectivity-data.csv"
```

