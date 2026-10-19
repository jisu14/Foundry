// ==============================================================================
// Supabase Edge Function: gemini-market-analyst
// Description: Secure server-side AI analyst for Foundry using Google Gemini API.
// Features:
// - Free Tier compatibility (Gemini 3.5 Flash-Lite / 2.5 Flash-Lite)
// - Server-side GEMINI_API_KEY storage in Supabase Secrets (never exposed to frontend)
// - Strict data minimization and founder consent enforcement
// - Deterministic boundary: AI critiques assumptions & explains indicators;
//   it NEVER computes simulation math, invents personas, or predicts sales
// - Grounding mandate: claims must cite indicator source & reference year
// - Input-size limits, rate limiting, and free-quota exhaustion handling (HTTP 429)
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

// In-memory sliding-window rate limiter (15 requests/min limit for Gemini Free Tier)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12; // Safety margin below 15 RPM
const clientRequestTimestamps = new Map<string, number[]>();

function checkRateLimit(clientIdentifier: string): boolean {
  const now = Date.now();
  const timestamps = clientRequestTimestamps.get(clientIdentifier) || [];
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    clientRequestTimestamps.set(clientIdentifier, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  clientRequestTimestamps.set(clientIdentifier, validTimestamps);
  return true;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  // Default to Gemini 2.5 / 3.5 Flash-Lite (or user configured via GEMINI_MODEL)
  const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";

  // 1. Health & Configuration Status Check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        function: "gemini-market-analyst",
        configured: Boolean(geminiApiKey),
        model: geminiModel,
        freeTierTermsNotice: "Google AI Studio Free Tier terms apply. Data submitted may be used to improve Google products unless an enterprise agreement is configured.",
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // 2. Client identification for rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "anonymous_client";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit reached. The Gemini API Free Tier allows up to 15 requests per minute. Please wait 45 seconds before requesting another analysis.",
        code: "RATE_LIMIT_EXCEEDED"
      }),
      { status: 429, headers: CORS_HEADERS }
    );
  }

  // 3. Verify GEMINI_API_KEY Secret
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY secret is not configured in Supabase. Please add your Google AI Studio API key via `supabase secrets set GEMINI_API_KEY=your_key`.",
        code: "MISSING_API_KEY",
        configured: false
      }),
      { status: 503, headers: CORS_HEADERS }
    );
  }

  // 4. Parse & Enforce Input-Size Limits (< 15KB max payload)
  let body: any;
  try {
    const rawText = await req.text();
    if (rawText.length > 15000) {
      return new Response(
        JSON.stringify({
          error: "Payload too large. Request body exceeds the 15KB limit to protect free tier token limits.",
          code: "PAYLOAD_TOO_LARGE"
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }
    body = JSON.parse(rawText || "{}");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON request body", code: "INVALID_JSON" }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Handle status action in POST
  if (body.action === "status") {
    return new Response(
      JSON.stringify({
        configured: true,
        model: geminiModel,
        status: "ready"
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // 5. Extract & Sanitize Request Parameters
  const mode = String(body.mode || "examine_assumptions"); // "examine_assumptions" | "explain_indicators" | "audit_gaps"
  const countryCode = String(body.countryCode || "USA").slice(0, 4);
  const countryName = String(body.countryName || "United States").slice(0, 60);
  const industryDomain = String(body.industryDomain || "General Tech").slice(0, 60);
  const founderAssumptions = body.founderAssumptions || {};
  const consentGiven = Boolean(body.consentGiven);
  
  // Strict Privacy: Only include startup description / private details if founder explicitly gave affirmative consent
  const startupDesc = (consentGiven && body.startupDesc)
    ? String(body.startupDesc).slice(0, 500)
    : "[Startup description withheld by founder privacy preference]";
  const targetGroup = (consentGiven && body.targetGroupName)
    ? String(body.targetGroupName).slice(0, 100)
    : "[Customer group title only]";

  const rawIndicators = Array.isArray(body.sourcedIndicators) ? body.sourcedIndicators.slice(0, 10) : [];
  const sourcedIndicators = rawIndicators.map((ind: any) => ({
    code: String(ind.code || ind.indicator_code || "").slice(0, 30),
    name: String(ind.name || ind.indicator_name || "").slice(0, 80),
    value: ind.value !== undefined ? String(ind.value).slice(0, 30) : "N/A",
    source: String(ind.source || "International Agency").slice(0, 60),
    referencePeriod: String(ind.referencePeriod || ind.reference_period || "Recent").slice(0, 20),
    unit: String(ind.unit || "").slice(0, 30)
  }));

  // 6. Construct Strict System Prompt & Grounding Mandate
  const systemInstruction = `You are the Foundry AI Market Analyst, an evidence-based advisor for early-stage startup founders.
You operate under strict scientific and ethical modeling boundaries:

PRIMARY OPERATING RULES:
1. GROUND EVERY CLAIM: Ground all market assessments strictly in the supplied indicators. You MUST cite the source and reference year for each claim (e.g. "[World Bank WDI, 2023]" or "[ITU Connectivity, 2024]").
2. CALL OUT EVIDENCE GAPS: If the supplied indicators do not contain data to support a claim (e.g. regarding enterprise software budgets, local B2B willingness-to-pay, or niche consumer demand), you MUST explicitly state: "The available evidence does not support this claim" or "No verified national indicator covers this vertical."
3. EXAMINE FOUNDER ASSUMPTIONS: Critically evaluate the founder's assumptions (pricing, acquisition channel, budget) against the macroeconomic realities of the target country and industry. Highlight pricing resistance, infrastructure hurdles, and CAC inflation risks.
4. ZERO FABRICATION: NEVER invent fake customer quotes, fake survey percentages, fake personas, or synthetic evidence.
5. NO SALES CLAIMS: NEVER claim that Foundry's simulation predicts real-world revenue, conversion, or sales. Emphasize that simulation is an educational scenario and founders must test assumptions with real human customers.
6. CONCISE & ACTIONABLE: Deliver a structured, highly analytical report in GitHub Markdown with clear headers, bullet points, and specific research recommendations.`;

  // Build the user prompt based on requested mode
  let userPrompt = "";
  if (mode === "explain_indicators") {
    userPrompt = `Please explain the following verified macroeconomic and infrastructure indicators for ${countryName} (${countryCode}) in the context of the ${industryDomain} sector.
For each indicator:
1. Explain what it measures and what practical constraints it imposes on a digital startup.
2. Clearly state what this indicator CANNOT tell the founder (methodology limitations).
3. Identify what empirical evidence gaps remain for this market.

Sourced Indicators Available:
${JSON.stringify(sourcedIndicators, null, 2)}`;
  } else if (mode === "audit_gaps") {
    userPrompt = `Please audit the evidence gaps for launching a ${industryDomain} startup in ${countryName} (${countryCode}).
Founder Target Market Context:
- Target Group: ${targetGroup}
- Sourced Baseline Indicators:
${JSON.stringify(sourcedIndicators, null, 2)}

Provide:
1. Missing Information: What essential market factors are completely absent from these national indicators?
2. Critical Blindspots: Where might a founder be deceived by relying solely on national averages?
3. Recommended Field Research Checklist: 3 to 4 specific, low-cost research tests (e.g., customer interviews, cold outreach tests, landing page experiments) the founder should run to collect firsthand evidence before committing capital.`;
  } else {
    // Mode: examine_assumptions (Default)
    userPrompt = `Please rigorously examine the founder's market assumptions against the available macroeconomic data.

Market & Vertical:
- Country: ${countryName} (${countryCode})
- Industry Vertical: ${industryDomain}
- Target Customer Segment: ${targetGroup}
- Startup Description: ${startupDesc}

Founder Stated Assumptions:
- Target Price: $${founderAssumptions.price ?? "N/A"}
- Acquisition Channel: ${founderAssumptions.channel ?? "social"}
- Marketing Budget: $${founderAssumptions.budget ?? "N/A"}

Verified Sourced Market Indicators:
${JSON.stringify(sourcedIndicators, null, 2)}

Please provide:
1. Assumption Stress Test: Are the pricing and channel assumptions realistic given the digital infrastructure, broadband penetration, and income context of ${countryName}? Cite specific indicators with sources and years.
2. Evidence Gaps & Uncertainty: What claims cannot be substantiated from this data? (State clearly: "The available evidence does not support...")
3. Key Risks to De-Risk: Top 3 risks the founder should investigate with real customers.`;
  }

  // 7. Call Google Gemini API
  // Supported models on free tier: gemini-2.5-flash-lite, gemini-2.0-flash-lite, gemini-1.5-flash
  const candidateModels = [
    geminiModel,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash"
  ];
  // Deduplicate
  const uniqueModels = Array.from(new Set(candidateModels));

  let lastError: any = null;
  let responseData: any = null;
  let usedModel = uniqueModels[0];

  for (const modelCandidate of uniqueModels) {
    try {
      usedModel = modelCandidate;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${geminiApiKey}`;

      const geminiPayload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: systemInstruction + "\n\n" + userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3, // Low temperature for high factual grounding
          topP: 0.8,
          maxOutputTokens: 1200
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 24000);

      const geminiRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (geminiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Google Gemini Free Tier quota exceeded. The free tier is limited to 15 requests per minute. Please try again in 60 seconds.",
            code: "QUOTA_EXHAUSTED",
            retryAfterSeconds: 60
          }),
          { status: 429, headers: CORS_HEADERS }
        );
      }

      if (!geminiRes.ok) {
        const errorJson = await geminiRes.json().catch(() => ({}));
        const errorMsg = errorJson.error?.message || `Gemini API returned HTTP ${geminiRes.status}`;
        
        // If model not found (404), try next model in fallback list
        if (geminiRes.status === 404) {
          lastError = errorMsg;
          continue;
        }

        return new Response(
          JSON.stringify({
            error: `Gemini API error: ${errorMsg}`,
            code: `GEMINI_HTTP_${geminiRes.status}`,
            details: errorJson.error || null
          }),
          { status: geminiRes.status, headers: CORS_HEADERS }
        );
      }

      responseData = await geminiRes.json();
      break; // Successfully got response
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        return new Response(
          JSON.stringify({
            error: "Gemini API request timed out after 24 seconds. Please try again.",
            code: "TIMEOUT"
          }),
          { status: 504, headers: CORS_HEADERS }
        );
      }
      lastError = fetchErr.message || String(fetchErr);
    }
  }

  if (!responseData) {
    return new Response(
      JSON.stringify({
        error: `Failed to contact Gemini API: ${lastError || "Unknown error"}`,
        code: "GEMINI_DISPATCH_FAILED"
      }),
      { status: 502, headers: CORS_HEADERS }
    );
  }

  // 8. Format & Return Response
  const candidate = responseData.candidates?.[0];
  const generatedText = candidate?.content?.parts?.[0]?.text || "No analysis could be generated.";

  return new Response(
    JSON.stringify({
      success: true,
      analysis: generatedText,
      modelUsed: usedModel,
      groundedIndicatorsCount: sourcedIndicators.length,
      mode: mode,
      disclaimer: "Educational AI analysis. Grounded in macro statistics. Does not predict real sales or replace direct customer interviews.",
      timestamp: new Date().toISOString()
    }),
    { status: 200, headers: CORS_HEADERS }
  );
});
