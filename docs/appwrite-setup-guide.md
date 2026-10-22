# Foundry: Appwrite Cloud Integration Guide
**Endpoint:** `https://fra.cloud.appwrite.io/v1` (Frankfurt Region)  
**SDK:** Appwrite Web SDK v16.1.0  
**Status:** Drop-in Active Backend (`window.foundryAppwrite` / `window.foundryBackend`)

---

## 1. Overview
Foundry has been upgraded with native support for **Appwrite Cloud** as an alternative to Supabase.

| Feature | Appwrite Implementation |
| :--- | :--- |
| **Authentication** | `Appwrite.Account` (Email + Password signup, login, session management) |
| **Database** | `Appwrite.Databases` with Database ID `foundry_db` |
| **Tenant Isolation** | Document-level security: `Permission.read(Role.user(userId))`, `Permission.write(Role.user(userId))` |
| **Offline Resilience** | Automatic LocalStorage fallback so the simulator works even if offline or before database creation |
| **Macroeconomic Data** | 824 verified sovereign observations (World Bank, ITU, Eurostat, UNCTAD, Global Findex) loaded instantly from client bundle |

---

## 2. Quick Setup in Appwrite Cloud Console

### Step 1: Copy Your Project ID
1. Log into [Appwrite Cloud (Frankfurt)](https://fra.cloud.appwrite.io/).
2. Select your Foundry project.
3. In **Project Settings**, copy your **Project ID** (e.g., `67...`).

### Step 2: One-Click Automated Database & Collections Provisioner
To automatically create the `foundry_db` database and all 10 collections + attributes:
1. In your Appwrite Console, go to **Project Settings > API Keys**.
2. Click **Create API Key**, name it `Foundry Setup`, and select scopes:
   - `databases.read`, `databases.write`
   - `collections.read`, `collections.write`
   - `attributes.read`, `attributes.write`
3. In your terminal, run:
```bash
node scripts/setup-appwrite.js <YOUR_PROJECT_ID> <YOUR_API_KEY>
```
The script will automatically create:
- `foundry_db` Database
- `founder_profiles` Collection
- `customer_groups` Collection
- `competitor_notes` Collection
- `campaigns` Collection
- `simulation_runs` Collection
- `daily_cohort_reports` Collection
- `founder_real_evidence` Collection
- `beta_feedback_reports` Collection
- `user_roles` Collection
- `grounded_research_reports` Collection

---

## 3. Connecting in Foundry

### Option A: Via the Web UI
1. Open Foundry in your browser.
2. In the bottom-left sidebar, click **⚙ Backend Settings** (or the Cloud Status dot).
3. Under the **Appwrite Cloud** tab:
   - **Endpoint:** `https://fra.cloud.appwrite.io/v1` (pre-filled)
   - **Project ID:** Paste your Appwrite Project ID.
   - **Database ID:** `foundry_db`
4. Click **Save & Connect Appwrite**.

### Option B: Via `appwrite-config.js`
Open [`appwrite-config.js`](../appwrite-config.js) and paste your Project ID:
```javascript
window.FOUNDRY_BACKEND = 'appwrite';
window.FOUNDRY_APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
window.FOUNDRY_APPWRITE_PROJECT = 'YOUR_APPWRITE_PROJECT_ID';
window.FOUNDRY_APPWRITE_DATABASE_ID = 'foundry_db';
```

---

## 4. Switching Backends
Foundry seamlessly supports both Appwrite and Supabase:
- To use **Appwrite Cloud**: Set `window.FOUNDRY_BACKEND = 'appwrite'` in `appwrite-config.js` or choose **Appwrite Cloud** in the UI settings modal.
- To use **Supabase**: Choose **Supabase** in the UI settings modal or set `window.FOUNDRY_BACKEND = 'supabase'`.
