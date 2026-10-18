# 📱 Foundry Industry Data Pack: Mobile Apps Source Report

This report evaluates official and commercial data sources for country-level mobile application market indicators—including installation activity, device configuration, category usage, downloads, and consumer spending.

In accordance with Foundry's data ethics and legal compliance principles, this document clearly categorizes sources into three distinct tiers:
1. **Tier 1: Open, Permission-Cleared & Redistributable Data** (Integrated into Foundry's core catalog and automated importers).
2. **Tier 2: Data Available Only Through Paid or Restricted Licenses** (Documented access requirements; requires commercial licenses or user-provided files).
3. **Tier 3: Unavailable or Unverifiable Data** (Gaps that cannot be legitimately accessed without breaching terms of service or relying on unverifiable methodologies).

---

## 🟢 Tier 1: Permission-Cleared & Redistributable Data

These official statistical sources operate under open government or open institutional licenses that permit storage, processing, and public non-commercial or commercial redistribution with attribution.

### 1. Eurostat: Digital Economy and Society Statistics (`isoc_i`)

| Attribute | Details |
| :--- | :--- |
| **Publishing Body** | Eurostat (Statistical Office of the European Commission) |
| **Datasets** | `isoc_sk_dskl_i21` (Digital Skills Indicators), `isoc_ci_ac_i` (Internet & Mobile Activities) |
| **Country Coverage** | 30+ European sovereign nations (EU27 Member States, EFTA states: Norway, Switzerland, Iceland; and candidate countries) |
| **Update Cadence** | Annual harmonized survey cycles (covering Q1 of reference year) |
| **Collection Methodology** | Harmonized National Statistical Office (NSO) household surveys sampling representative adult populations aged 16–74, standardizing on ICT usage in households and by individuals. |
| **Access Method** | Open SDMX 2.1 / 3.0 REST API & JSON Statistics API (`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/`) with unauthenticated bulk TSV/CSV access. |
| **Terms of Reuse** | **European Commission Decision 2011/833/EU** on the reuse of Commission documents. Free for commercial and non-commercial reuse with mandatory attribution: `Source: Eurostat`. No warranty. Compatible with CC-BY 4.0. |
| **Integrated Indicators** | 1. `EUROSTAT.APP.INSTALL`: Individuals downloading or installing apps/software (% of individuals)<br>2. `EUROSTAT.APP.CONFIG`: Individuals changing settings of software, apps, or devices (% of individuals)<br>3. `EUROSTAT.APP.BANK`: Individuals using internet / mobile app banking (% of individuals)<br>4. `EUROSTAT.APP.HEALTH`: Individuals accessing health records or digital health apps (% of individuals)<br>5. `EUROSTAT.APP.STREAM`: Individuals streaming video/TV via internet or mobile apps (% of individuals) |

### 2. International Telecommunication Union (ITU): Mobile Infrastructure Layer

| Attribute | Details |
| :--- | :--- |
| **Publishing Body** | International Telecommunication Union (ITU, UN Specialized Agency for ICT) |
| **Indicators** | Active mobile-broadband subscriptions (`ITU.ICT.ACT.MBB`), 4G mobile population coverage (`ITU.ICT.MOB.4G`), and smartphone internet access. |
| **Terms of Reuse** | Non-commercial research use with attribution: `Source: International Telecommunication Union (ITU)`. |
| **Status in Foundry** | Already integrated as foundational connectivity context in Phase 3. |

---

## 🟡 Tier 2: Paid or Restricted License Data (Commercial App Intelligence)

These providers capture app store downloads, gross consumer spend, and usage time via proprietary estimation models. **They cannot be automatically imported or redistributed** in Foundry without explicit enterprise contracts and API credentials.

### 1. Sensor Tower Enterprise App Intelligence

- **Metrics Tracked**: Total estimated downloads per country (iOS App Store & Google Play), gross consumer in-app spend ($ USD), category revenue breakdown, Monthly Active Users (MAU), Daily Active Users (DAU), and keyword ranking histories.
- **Access Architecture**: Private Enterprise REST API, Scheduled S3/Snowflake Data Warehouse Feed, or manual CSV export from Sensor Tower web platform.
- **Commercial Cost**:
  - Median annual contract: **$75,000 / year** (entry-level packages typically start at $29,500/yr; full multi-country coverage exceeds $115,000/yr).
  - API & Data Warehouse Connector add-on: **$5,000 to $20,000+ / year**.
- **License Terms & Redistribution Restrictions**:
  - **Internal Use Only**: Data is strictly licensed for internal business intelligence, UA optimization, and investment research.
  - **Redistribution Prohibited**: Terms strictly prohibit passing raw estimates, bulk feeds, or derived standalone database views to third parties or customer-facing platforms without an expensive OEM redistribution rider.
- **What is Needed to Import**:
  - A founder/admin must possess an active Sensor Tower enterprise license.
  - Provide an official manual CSV export (`sensor-tower-country-summary.csv`) containing columns: `country_code`, `year`, `downloads_volume`, `consumer_spend_usd`, `category`.
  - Foundry provides an admin-only CSV upload path without embedding proprietary API scrapers.

### 2. data.ai (formerly App Annie) Intelligence API

- **Metrics Tracked**: Country-level download volume, gross consumer spend, session counts, average time spent per active device per day across 100+ app categories.
- **Access Architecture**: data.ai Intelligence API, Bulk API, or web platform export.
- **Commercial Cost**: Custom enterprise subscription ($30,000 to $100,000+/year depending on modules and seats).
- **License Terms & Redistribution Restrictions**:
  - Data is licensed solely for internal analytical use. Public republication, syndication, or feeding raw metrics into an external SaaS dashboard is strictly prohibited.
- **What is Needed to Import**:
  - A user-supplied API token (`DATA_AI_API_KEY`) or an authorized enterprise export file.

### 3. Appfigures App Intelligence API

- **Metrics Tracked**: Category top chart ranks, keyword search volume, estimated downloads and in-app purchase revenue.
- **Access Architecture**: Appfigures REST API (`https://api.appfigures.com/v2/`).
- **Commercial Cost**: Paid developer plan ($49.99/mo to $500+/mo).
- **License Terms**: Internal analytics only; public republication forbidden without written commercial distribution approval.

### 4. Statista Digital Market Insights: Mobile Apps

- **Metrics Tracked**: Macro-level market sizing for mobile apps (in-app purchase revenue, paid downloads, in-app advertising spend) across 150+ countries.
- **Commercial Cost**: Statista Corporate Account ($1,900 to $10,000+/year).
- **License Terms**: Copyrighted aggregate models. Programmatic API distribution is prohibited.

---

## 🔴 Tier 3: Unavailable or Unverifiable Data

These potential data sources cannot be accessed legitimately for country-level market analysis:

### 1. Apple App Store & Google Play Console Public Macro APIs

- **Reality**: Neither Apple nor Google provides a public, macro-level API for total country downloads or aggregate gross app store spend.
- **API Scope**: Apple App Store Connect API and Google Play Developer Reporting API only expose first-party telemetry for apps owned by the authenticated developer account. There is **no public endpoint** for national or cross-developer totals.
- **Boundary**: Foundry does not request first-party developer console keys for general market research.

### 2. Web Scraping App Store Top Charts

- **Reality**: Automated scraping or crawling of Apple App Store or Google Play store pages directly violates:
  - **Apple Media Services Terms and Conditions (§B)**: Strictly prohibits bots, scrapers, or automated tools.
  - **Google Play Terms of Service (§7)**: Strictly forbids unauthorized data extraction or automated indexing.
- **Methodology Flaw**: Store ranking positions (e.g., #1 in Utilities, #14 in Productivity) do not represent absolute download counts or revenue. Translating ranks to downloads requires statistical panel regression models, which without audited verification produce misleading and hallucinated market estimates.
- **Foundry Policy**: Scraped app store data is **strictly excluded**.

---

## 📋 Summary Matrix of Mobile App Market Sources

| Source Name | Provider | Access Method | Legal Terms | Cost | Foundry Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Eurostat Digital Skills & App Activities** | European Commission | Open SDMX REST API & JSON | Commission Decision 2011/833/EU (Open Reuse) | Free / Open | **Integrated (Core Importer)** |
| **ITU World Telecom Indicators** | ITU (United Nations) | Open DataHub Export / API | Non-Commercial with Attribution | Free / Open | **Integrated (Core Importer)** |
| **Sensor Tower App Intelligence** | Sensor Tower Inc. | Enterprise REST API / S3 | Internal Use Only; No Redistribution | $30k–$75k+/yr | **Documented (Admin File Only)** |
| **data.ai Intelligence API** | data.ai (App Annie) | Enterprise REST API | Internal Use Only; No Redistribution | $30k–$100k+/yr | **Documented (Admin File Only)** |
| **Appfigures Intelligence** | Appfigures Inc. | Developer REST API | Internal Developer Use; No Resale | $50–$500/mo | **Documented (Admin File Only)** |
| **Apple / Google Public Totals** | Apple / Google | Does not exist | N/A | N/A | **Unavailable** |
| **Scraped App Store Rankings** | Third-party scrapers | HTML Scraping | Violates Apple/Google ToS | Unethical | **Rejected / Prohibited** |

---

## 🔬 Sourced Statistics vs. Startup Purchase Intent Boundary

> ⚠️ **RESEARCH & METHODOLOGY BOUNDARY**:  
> Sourced mobile app indicators (such as the percentage of adults who downloaded an app, configured device settings, or used mobile banking) measure **general digital population behavior and smartphone habituation**.  
> **What this does NOT prove:**  
> - A high rate of app installation in a country does **not** guarantee that customers will install or pay for a new startup's product.  
> - Population-level app activity does **not** measure price elasticity, willingness to subscribe to recurring plans, or customer acquisition costs (CAC).  
> - High smartphone usage does **not** eliminate the need for founders to conduct direct customer interviews.  
> Sourced macroeconomic and industry observations in Foundry are strictly partitioned from heuristic simulation assumptions.
