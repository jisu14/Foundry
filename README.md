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
- **Frontend-Only**: All profile details, customer groups, and history are stored securely in your browser's `localStorage`.
- **Reset Workspace**: Use the **🔄 Reset Workspace** button in the header anytime to wipe all data and start completely fresh.
