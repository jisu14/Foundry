# Foundry AI Market Analyst — Configuration & Setup Guide

This guide explains how to configure Google AI Studio and Supabase to power Foundry's server-side **AI Market Analyst** using the **Google Gemini API Free Tier** (`gemini-2.5-flash-lite` / Gemini 3.5 Flash-Lite).

---

## 1. Architectural & Privacy Boundaries

Foundry enforces strict ethical and architectural boundaries between AI reasoning, public macroeconomic data, and deterministic simulation calculations:

```
┌───────────────────────────────────────────────────────────┐
│                 Foundry Frontend Application              │
│  - 100% Deterministic Simulation Calculations             │
│  - Zero API Keys Stored in Browser or Client JS           │
│  - Data Minimization Shield (Consent required for PII)    │
└─────────────────────────────┬─────────────────────────────┘
                              │
                    JSON RPC (POST)
                              ▼
┌───────────────────────────────────────────────────────────┐
│         Supabase Edge Function: gemini-market-analyst     │
│  - In-memory rate limiting (Safety margin for Free Tier)  │
│  - Input-size limits (< 15KB max payload)                 │
│  - Server-side secret validation (GEMINI_API_KEY)         │
│  - Grounding mandate injected into system prompt          │
└─────────────────────────────┬─────────────────────────────┘
                              │
           Google AI Studio Free Tier (HTTPS)
                              ▼
┌───────────────────────────────────────────────────────────┐
│         Google Gemini API (gemini-2.5-flash-lite)         │
│  - Free Tier: 15 Requests Per Minute (RPM)                │
│  - Output: Indicator explanations, assumptions critique   │
│  - Forbidden: Generating synthetic personas/sales claims  │
└───────────────────────────────────────────────────────────┘
```

### Essential Privacy Rules:
- **Free-Tier Terms Notice**: Under Google AI Studio Free Tier terms, Google may use prompt content to train and improve its products.
- **Strict Data Minimization**: By default, only the target country code, industry domain, pricing tier, and public macroeconomic indicators (World Bank, ITU) are sent.
- **Explicit Founder Consent**: The founder’s startup name, description, and private notes are **strictly withheld** unless the founder explicitly checks the affirmative consent checkbox in the UI.
- **Independent Simulation**: If the Gemini API is unreachable, offline, or rate-limited, the Foundry Launch Lab simulator remains **100% functional** using its deterministic math engine.

---

## 2. Step 1: Obtain a Free Gemini API Key from Google AI Studio

1. Visit **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google Account.
3. Click **Get API key** in the left navigation sidebar.
4. Click **Create API key** (you can create one in a new Google Cloud Project or select an existing one).
5. Copy your API key (starts with `AIzaSy...`). Keep this key secret.

> [!NOTE]
> **Free Tier Quota & Model Availability**:
> - **RPM**: Up to 15 Requests Per Minute.
> - **TPM**: Up to 1,000,000 Tokens Per Minute.
> - **RPD**: Up to 1,500 Requests Per Day.
> - **Model**: `gemini-2.5-flash-lite` (or latest lightweight flash-lite alias such as `gemini-2.0-flash-lite` / `gemini-1.5-flash`).

---

## 3. Step 2: Store the API Key in Supabase Secrets

**Never paste your Gemini API key into frontend files (`app.js`, `index.html`, etc.).** Store it exclusively in Supabase Secrets so only the backend Edge Function can access it.

### Option A: Using the Supabase CLI (Recommended)

Run the following command from your terminal:

```bash
supabase secrets set GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```

To configure a specific Gemini model version (default is `gemini-2.5-flash-lite`):

```bash
supabase secrets set GEMINI_MODEL="gemini-2.5-flash-lite"
```

### Option B: Using the Supabase Web Dashboard

1. Open your **[Supabase Project Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **Project Settings** (gear icon) > **Edge Functions** > **Secrets**.
3. Click **Add New Secret**:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Paste your Google AI Studio API key.
4. (Optional) Add a second secret:
   - **Name**: `GEMINI_MODEL`
   - **Value**: `gemini-2.5-flash-lite` (or `gemini-2.0-flash-lite`)

---

## 4. Step 3: Deploy the Supabase Edge Function

Deploy the function to your remote Supabase project:

```bash
supabase functions deploy gemini-market-analyst --no-verify-jwt
```

The configuration is already registered in `supabase/config.toml`:

```toml
[functions.gemini-market-analyst]
verify_jwt = false # Protected by rate limiter and server-side secret validation
```

---

## 5. Step 4: Verification Checklist (Verify BEFORE Claiming Connected)

To ensure the AI Analyst is truly connected and operational:

### 1. Test the Health Endpoint
Send an HTTP GET request to your deployed edge function:

```bash
curl -i https://<your-project-ref>.supabase.co/functions/v1/gemini-market-analyst
```

**Expected Response (HTTP 200)**:
```json
{
  "status": "ok",
  "function": "gemini-market-analyst",
  "configured": true,
  "model": "gemini-2.5-flash-lite",
  "freeTierTermsNotice": "Google AI Studio Free Tier terms apply...",
  "timestamp": "2026-10-19T..."
}
```

If `"configured": false`, the `GEMINI_API_KEY` secret has not been set properly.

### 2. Verify in Foundry UI
1. Open Foundry on your browser (`http://localhost:3000/` or production domain).
2. Click **AI Analyst** in the sidebar or in the **Launch Lab**.
3. Check the connection banner at the top of the modal:
   - **Green Badge**: `● Connected to Gemini Free Tier (gemini-2.5-flash-lite) via Supabase Edge Function`
   - **Amber Badge**: `● Edge Function reachable, but GEMINI_API_KEY secret is not yet set in Supabase Secrets.`

### 3. Test Analysis with Data Minimization
1. Select an analysis mode:
   - **Examine Assumptions & Pricing**: Stresses pricing tolerance and CAC channel realism.
   - **Explain Sourced Indicators**: Explains World Bank / ITU indicators and methodology limits.
   - **Audit Evidence Gaps**: Lists missing information and field research tests.
2. Leave the founder consent checkbox **unchecked**:
   - Verify the context badge displays: `Shield Active: Startup description withheld`.
3. Click **Run AI Analysis with Gemini**:
   - Verify that Gemini generates structured feedback citing indicator sources (e.g. `[World Bank WDI, 2023]`).
   - Verify that when data is missing, the AI explicitly states: *"The available evidence does not support this claim."*
   - Verify that simulation calculations (installs, conversion) remain purely local and unaffected.

---

## 6. Safe Error Handling & Quota Exhaustion (HTTP 429)

If you hit the free tier quota (15 requests/minute), the Edge Function and UI will:
1. Catch the Google API `429 RESOURCE_EXHAUSTED` status code.
2. Present a friendly alert to the founder:
   > ⚠️ **Google Gemini Free Tier Quota Exceeded (15 requests/minute). Please wait 60 seconds before trying again.**
3. Activate an in-app cooldown timer.
4. **Preserve Simulator Availability**: The founder can continue running campaigns, adjusting pricing, and recording real evidence without interruption.
