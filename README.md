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

---

## 💳 Sourced Market Data Library: World Bank Global Findex Phase

Foundry incorporates the **World Bank Global Financial Inclusion (Global Findex)** database to contextualize national payment infrastructure, banking penetration, card ownership, and digital transaction behavior.

### 1. Official Global Findex Access Method & Coverage
- **Publisher**: Development Research Group, The World Bank Group (in partnership with Gallup, Inc., and supported by the Bill & Melinda Gates Foundation).
- **Official Documentation**: [Global Findex Portal](https://www.worldbank.org/en/publication/globalfindex) and [World Bank DataBank](https://databank.worldbank.org/source/global-financial-inclusion).
- **Access Endpoints**:
  - **Automated Public API**: World Bank Indicators API V2 (`https://api.worldbank.org/v2/country/all/indicator/{id}?source=28&format=json`). Free, open access under CC-BY 4.0.
  - **Permitted Bulk Downloads**: Country-level aggregate datasets downloadable via DataBank.
  - **Microdata Notice**: In accordance with user guidelines, individual-level respondent microdata is excluded. Only verified national aggregate indicators are ingested.
- **Reference Periods & Triennial Survey Waves**:
  - Global Findex is collected every three years (2011, 2014, 2017, 2021, and 2024).
  - Intermediate years without survey collections are preserved strictly as `NULL` without synthetic interpolation.
- **Target Population & Survey Breakdown**:
  - Target Population: Civilian, non-institutionalized population aged 15 and older.
  - Methodology: Nationally representative samples of approximately 1,000 to 1,500 randomly selected adults per economy, surveyed face-to-face or via telephone under the Gallup World Poll.

### 2. Standardized Global Findex Indicators
- `account.t.d`: **Account ownership (% age 15+)** – Percentage of adults holding an account at a formal financial institution or mobile money provider.
- `g20.any`: **Made or received digital payments (% age 15+)** – Percentage of adults using mobile money, cards, or phones/internet for payments or deposits.
- `fin2.t.d`: **Owns a debit card (% age 15+)** – Percentage of adults with a debit card tied to an account.
- `fin10`: **Owns a credit card (% age 15+)** – Percentage of adults with a formal revolving credit card.
- `g20.made`: **Made a digital payment (% age 15+)** – Outbound digital transaction activity.

### 3. Terms of Reuse & Legal Notice
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Attribution**: `Source: The World Bank Group, Global Financial Inclusion (Global Findex) Database.`
- **Permitted Use**: Open for personal, research, educational, and commercial purposes with proper attribution.

### 4. Explicit Payment & Account Research Boundary
> ⚠️ **CRITICAL BOUNDARY**: Account ownership, card issuance, and digital payment statistics quantify national banking infrastructure and transaction rails. **They do not prove that a customer will buy a product**, nor do they measure price elasticity, disposable income, or willingness to purchase online subscription software. Sourced statistics are strictly separated from heuristic simulation assumptions.

---

## 🛠️ How to Import or Update Global Findex Data

### Option A: Automated API Importer (Recommended)
Fetches directly from the official World Bank API (source 28), filters for sovereign countries, validates survey years, preserves missing data, and logs to `public.market_import_logs`:
```bash
node scripts/import-global-findex.mjs
```

### Option B: Admin CSV File Importer
To import a custom or offline CSV file exported from World Bank DataBank (or use the pre-bundled reference dataset at `data/global-findex-data.csv`):
```bash
node scripts/import-global-findex.mjs data/global-findex-data.csv
```

### Option C: Supabase Edge Function
Trigger the secure Global Findex Edge Function:
```bash
# Automated sync from World Bank API:
curl -X POST "https://your-project.supabase.co/functions/v1/import-global-findex" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Or ingest custom CSV:
curl -X POST "https://your-project.supabase.co/functions/v1/import-global-findex" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: text/csv" \
  --data-binary "@data/global-findex-data.csv"
```

---

## 🛍️ Sourced Market Data Library: UNCTADstat (Digital Economy & E-Commerce) Phase

Foundry integrates official statistics from the **United Nations Conference on Trade and Development (UNCTADstat Data Hub)** to evaluate national e-commerce readiness, enterprise web presence, digital ordering adoption, and cross-border digitally deliverable services trade.

### 1. Official UNCTADstat Access Method & Coverage
- **Publisher**: United Nations Conference on Trade and Development (UN Trade and Development - UNCTAD), Division on Technology and Logistics.
- **Official Documentation**: [UNCTAD Data Hub](https://unctadstat.unctad.org/) and [UNCTAD Digital Economy Theme](https://unctadstat.unctad.org/EN/DataCentre.html).
- **Access Architecture**:
  - UNCTADstat publishes comprehensive multi-dimensional data cubes via the UNCTADstat Data Centre, supporting customized table design and bulk CSV/SDMX exports.
  - While UN-wide SDMX web services support cross-agency harmonization, direct unauthenticated scraping of portal tables is avoided in adherence to institutional guidelines.
  - Foundry provides an admin-only backend CSV importer (`scripts/import-unctad.mjs`), a secure Supabase Edge Function (`supabase/functions/import-unctad/index.ts`), and an authoritative pre-bundled reference dataset (`data/unctad-digital-economy-data.csv`).
- **Country & Year Coverage**: Covers sovereign nations across annual reporting periods (2020–2023+). Intermediate or unconducted enterprise surveys are preserved as `NULL` without synthetic inflation.
- **Methodology Standards**: Developed under the *Partnership on Measuring ICT for Development* and the *UNCTAD Manual for the Production of Statistics on the Digital Economy*. Data is gathered harmoniously from National Statistical Offices (NSOs) and Eurostat.

### 2. Standardized UNCTAD Indicators
- `UNCTAD.ECOMM.B2C.IDX`: **UNCTAD B2C E-commerce Index (0–100)** – Composite index measuring preparedness for online shopping (arithmetic average of account ownership, internet use, server security, and postal reliability).
- `UNCTAD.ECOMM.DDS.SHR`: **Share of digitally deliverable services in total services exports (%)** – Proportion of cross-border services exports delivered over computer networks.
- `UNCTAD.ECOMM.ENT.RCV`: **Enterprises receiving orders online (% of enterprises)** – Formal firms with 10+ employees receiving commercial orders via web or apps.
- `UNCTAD.ECOMM.ENT.WEB`: **Enterprises with a website (% of enterprises)** – Formal firms maintaining an active public homepage.
- `UNCTAD.ECOMM.IND.BUY`: **Individuals who purchased goods or services online (% of individuals)** – Share of population engaging in consumer e-commerce.

### 3. Terms of Reuse & Attribution
- **License**: Creative Commons Attribution 3.0 IGO (**CC-BY 3.0 IGO**).
- **Attribution**: `Source: United Nations Trade and Development (UNCTAD).`
- **Permitted Reuse**: Open reproduction, adaptation, and sharing permitted for personal, research, educational, and commercial purposes with proper attribution.

### 4. Explicit Commercial Research Boundary
> ⚠️ **CRITICAL BOUNDARY**: E-commerce activity and digital trade metrics quantify national commercial digital infrastructure, enterprise connectivity, and cross-border digital services flows. **They do not prove that a customer will buy a specific product**, nor do they forecast individual willingness to pay, unit economics, or venture product-market fit. In Foundry, sourced observations are strictly partitioned from heuristic simulation assumptions.

---

## 🛠️ How to Import or Update UNCTAD Data

### Option A: Command-Line Backend Importer (Recommended)
1. Ensure your `.env` contains your private Supabase service-role credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
   ```
2. Run the importer using the verified reference dataset:
   ```bash
   node scripts/import-unctad.mjs
   ```
3. Or pass a custom CSV export downloaded from the UNCTADstat Data Centre:
   ```bash
   node scripts/import-unctad.mjs path/to/your-unctad-export.csv
   ```
4. **Behavior**:
   - Validates ISO-3 country codes and indicator codes.
   - Retains missing values as `NULL` (never fills gaps with synthetic data).
   - Idempotently upserts into `public.country_observations`.
   - Records an audit trail in `public.market_import_logs` with row counts, country/year coverage, and errors.

### Option B: Supabase Edge Function
Trigger ingestion via HTTP header authentication:
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/import-unctad" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: text/csv" \
  --data-binary "@data/unctad-digital-economy-data.csv"
```

---

## 🧭 Market Data Coverage & Ingestion Audit Page

Foundry includes a dedicated **Market Data Coverage & Ingestion Audit** page accessible directly via the sidebar navigation (`Data coverage` / `#coverage`).

### 1. Key Coverage Capabilities

- **Country Coverage per Indicator**: Displays exactly which sovereign economies have verified non-null records for each of Foundry's 19 indicators.
- **Temporal Span (Earliest & Latest Reference Years)**: Reports the historical span globally and per country pair (e.g. 2014–2024 for World Bank Global Findex, 2020–2023 for ITU, 2015–2023 for UNCTADstat).
- **Topic & Startup Industry Domain Matrix**: Maps all 11 topics and 4 data sources to venture sectors (Fintech & Banking Rails, Telecommunications, Consumer E-Commerce, Enterprise B2B SaaS, Macroeconomics).
- **Live Ingestion Health Audit**: Audits `public.market_import_logs` to show when each source was last imported, its execution status (`success`, `partial_failure`, `failed`, `running`), imported row counts, and detailed audit summaries.
- **Strict Data Integrity (Zero Synthetic Data)**: Gaps and unconducted surveys are explicitly shown as missing (`NULL`). No synthetic data is generated or imputed.
- **Interactive Drill-Down Modals**:
  - **Indicator Coverage Breakdown Modal**: Inspect all covered economies, earliest/latest years, sample values, official definitions, and methodology boundaries.
  - **Source Ingestion Audit Log Modal**: View live backend execution summaries, row counts, and exception logs.

---

## 🎯 How to Use the Coverage Page to Choose Your Next Industry Dataset

The **Identified Coverage Gaps & Next Industry Dataset Roadmap** panel (Section 4) is specifically designed to help founders and data engineers decide which dataset to ingest next based on empirical backend gaps:

### Step 1: Identify What Is Already Covered
- **Fintech & Payments**: World Bank Global Findex covers account ownership, debit/credit cards, and digital payment participation.
- **Telecommunications & Mobile**: ITU DataHub covers 4G mobile coverage, household internet penetration, and broadband speed tiers.
- **Consumer E-Commerce & Web Presence**: UNCTADstat covers B2C e-commerce readiness, online shopper share, and basic enterprise websites.
- **Macroeconomics**: World Bank WDI covers GDP per capita and population scale.

### Step 2: Examine the Identified Industry Gaps
The Coverage page highlights major venture sectors that currently have **0 records** in the backend:
1. **Healthcare & MedTech / Life Sciences**: Zero health expenditure, hospital bed density, or physician density data.
2. **CleanTech, Renewable Energy & Climate Transition**: Zero clean energy adoption, carbon intensity, or renewable grid share.
3. **Enterprise Cloud Software & AI Adoption**: UNCTAD only measures basic homepage/ordering presence; missing cloud tier usage, big data, and generative AI adoption.
4. **Venture Capital & Tech Ecosystem Investment**: Zero startup funding rounds, deal volume, or investor density data.
5. **Agriculture, FoodTech & AgriBusiness**: Zero crop yield, agricultural trade, or food security metrics.

### Step 3: Evaluate Candidate Datasets by Legal Terms & Ingestion Feasibility
| Uncovered Sector | Recommended Candidate Dataset | Official Provider | API & Access Method | Licensing Terms |
| :--- | :--- | :--- | :--- | :--- |
| **Enterprise Cloud & AI** | **Eurostat ICT Usage in Enterprises** (Cloud Services, AI & Big Data) | Eurostat / European Commission | SDMX REST API & Bulk TSV | Open Data with Attribution |
| **Healthcare & MedTech** | **Global Health Observatory (GHO)** | World Health Organization (WHO) | Athena OData API / GHO REST | CC-BY-NC-SA 3.0 IGO / Open Access |
| **CleanTech & Energy** | **Renewable Energy Statistics / Global Energy Review** | International Energy Agency (IEA) & IRENA | IRENA Open Data & Ember API | Open Access with Attribution |
| **Venture Capital** | **OECD Venture Capital Investments / Dealroom** | OECD Directorate for Science, Tech & Industry | OECD.Stat SDMX API & CSV Downloads | OECD Open Data |
| **AgriTech & Food** | **FAOSTAT Agricultural Production & Trade** | UN Food and Agriculture Organization (FAO) | FAOSTAT REST API & CSV Bulk | CC-BY-NC-SA 3.0 IGO |

### Step 4: Decision Rule for Your Next Dataset
- **If your focus is B2B Software / Enterprise Startups**: Prioritize **Eurostat Enterprise Cloud Computing & AI** to observe real commercial enterprise cloud buying habits.
- **If your focus is ClimateTech / Energy**: Prioritize **IRENA Renewable Energy Statistics** for national clean grid transition context.
- **If your focus is HealthTech / BioTech**: Prioritize **WHO Global Health Observatory** for health expenditure and clinical infrastructure context.

---

## 📱 Industry Data Pack #1: Mobile Apps (Digital Economy & Consumer App Ecosystem)

Foundry incorporates its first vertical industry data pack: **Mobile Apps**, evaluating smartphone app installation rates, permission/privacy scrutiny, and sector-specific category engagement (fintech banking, digital health, and streaming entertainment).

### 1. Source Classification & Legal Redistribution Analysis

Our research separates sources into three strict tiers:

| Tier | Source / Publisher | Indicators Covered | Official Access Method | Terms of Use & Redistribution | Action in Foundry |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Permitted Open Data** | **Eurostat (European Commission)** | App installation, app permission config, mobile banking apps, digital health apps, video streaming apps | Eurostat SDMX REST API & Bulk Download Facility (`isoc_sk_app_i`, `isoc_ci_ac_i`) | **Commission Decision 2011/833/EU**: Free reuse for commercial & non-commercial purposes with attribution | **Fully Automated Importer Built & Live in Catalog** |
| **Tier 1: Permitted Open Data** | **ITU (UN ICT Agency)** | Mobile broadband subscriptions, 4G/5G population coverage | ITU DataHub API & Permitted Admin Ingest | ITU Non-Commercial with Attribution | Integrated in Foundry Core Telecom Rail |
| **Tier 2: Paid Commercial Intelligence** | **Sensor Tower, data.ai (Sensor Tower), Appfigures** | Store-level download estimates, in-app purchase revenue, active device counts, category charts | Enterprise REST APIs (`api.sensortower.com`, `api.appfigures.com`) requiring licensed Bearer token | **Strictly Proprietary**: Redistribution prohibited without explicit OEM/Enterprise redistribution rider ($30k–$75k+/yr). Raw redistribution violates terms. | **Documented Admin Ingestion Path Provided (`--paid-license`)**; Zero Scraping |
| **Tier 3: Unavailable / Restricted** | **Apple App Store & Google Play Developer Consoles** | First-party app telemetry, conversion funnel, crashes | Private developer OAuth; aggregated country macro telemetry is not published | Apple Developer Agreement & Google Play ToS forbid scraping or redistributing store catalog data | **Recorded as Unavailable**; Store scraping strictly forbidden |

### 2. What Must Be Provided to Ingest Commercial Store Intelligence (Sensor Tower / data.ai / Appfigures)

Because commercial intelligence vendors do not grant open redistribution rights, Foundry **does not scrape, copy gated benchmark PDFs, or invent synthetic download figures**. To ingest commercial store estimates for your venture:
1. **Commercial License Key**: A paid subscription Bearer token or API key with export permissions.
2. **Standardized CSV Export**: Export your licensed country report from Sensor Tower / data.ai / Appfigures containing columns: `country_code, indicator_code, year, value, unit`.
3. **Execution Command**:
   ```bash
   node scripts/import-mobile-apps.mjs --file=/path/to/licensed-app-telemetry.csv --paid-license="SensorTower Enterprise Order #12345"
   ```
   Or invoke the Supabase Edge Function:
   ```bash
   curl -i -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/import-mobile-apps" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: text/csv" \
     --data-binary @data/my-licensed-downloads.csv
   ```

### 3. Eurostat Mobile App Indicators Added to Foundry Catalog

| Indicator Code | Name | Topic / Domain | Unit | Publisher & Methodology |
| :--- | :--- | :--- | :--- | :--- |
| `EUROSTAT.APP.INSTALL` | Individuals who installed apps on a mobile device | Mobile Apps & Software Ecosystem | % of individuals (16–74) | Eurostat `isoc_sk_app_i` (CINSAPP1). Harmonized annual household ICT surveys across Europe. |
| `EUROSTAT.APP.CONFIG` | Individuals who managed or restricted app permissions | Mobile Apps & Software Ecosystem | % of individuals (16–74) | Eurostat `isoc_sk_app_i` (CCONF1). Measures consumer privacy vigilance and permission scrutiny. |
| `EUROSTAT.APP.BANK` | Individuals using internet or mobile banking apps | Fintech & Mobile Banking Apps | % of individuals (16–74) | Eurostat `isoc_ci_ac_i` (I_BANK). Measures active financial app utilization. |
| `EUROSTAT.APP.HEALTH` | Individuals using health or fitness apps/devices | Digital Health & Wellness Apps | % of individuals (16–74) | Eurostat `isoc_ci_ac_i` (I_HEAL). Measures health monitoring app and wearable adoption. |
| `EUROSTAT.APP.STREAM` | Individuals using video-on-demand streaming apps | Entertainment & Video Apps | % of individuals (16–74) | Eurostat `isoc_ci_ac_i` (I_IUSTVV). Measures digital entertainment app engagement. |

### 4. Critical Research Boundary: Macro App Usage vs. Startup Purchase Intent

> [!CAUTION]
> **Macro app usage is not purchase intent**: Sourced statistics showing that 85% of citizens in a country install mobile apps or that 60% use mobile banking apps demonstrate technical feasibility, ecosystem maturity, and smartphone penetration. They **do not prove** that any customer will download, keep, or pay for a new startup's app. Conversion rates, willingness to pay, and churn in Foundry's Launch Lab remain simulated hypotheses grounded in venture design, not historical facts.





