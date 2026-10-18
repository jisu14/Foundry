// ==============================================================================
// Supabase Edge Function: import-mobile-apps
// Description: Secure server-side importer for Eurostat Mobile Apps industry pack.
// Security: Protected by x-importer-secret or service_role key.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SOURCE_META = {
  id: "eurostat",
  name: "Eurostat Digital Economy & Mobile App Statistics",
  publisher: "Eurostat (Statistical Office of the European Union)",
  source_url: "https://ec.europa.eu/eurostat",
  methodology_url: "https://ec.europa.eu/eurostat/cache/metadata/en/isoc_i_esms.htm",
  api_endpoint: "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/",
  reuse_terms: "European Commission Decision 2011/833/EU on the reuse of Commission documents. Free for commercial and non-commercial reuse with mandatory attribution: Source: Eurostat. Data provided as is without warranty.",
  attribution: "Eurostat Digital Economy and Society Statistics (isoc_sk_dskl_i21, isoc_ci_ac_i). Licensed under Commission Decision 2011/833/EU.",
  disclaimer: "Mobile app installation and category usage statistics establish national digital proficiency and smartphone habituation. They do not prove commercial conversion or customer willingness to pay for a specific startup's app."
};

const VALID_INDICATORS: Record<string, { name: string; unit: string; topic: string; limitations: string }> = {
  "EUROSTAT.APP.INSTALL": {
    name: "Individuals who downloaded or installed software or apps (% of individuals)",
    unit: "% of individuals",
    topic: "Mobile Apps & Software Ecosystem",
    limitations: "Measures population technical capability and general propensity to install software. Downloading an app does not prove engagement, willingness to pay, recurring subscription conversion, or retention for a specific startup product."
  },
  "EUROSTAT.APP.CONFIG": {
    name: "Individuals who changed settings of software, apps, or devices (% of individuals)",
    unit: "% of individuals",
    topic: "Mobile Apps & Software Ecosystem",
    limitations: "Demonstrates digital proficiency with app settings and device permissions. A high configuration rate indicates lower tech friction, but does not indicate available software budget or commercial purchase intent."
  },
  "EUROSTAT.APP.BANK": {
    name: "Individuals using mobile app or internet banking (% of individuals)",
    unit: "% of individuals",
    topic: "Fintech & Mobile Banking Apps",
    limitations: "Refers specifically to formal financial banking utility apps. Active mobile banking adoption indicates payment-rail familiarity, not willingness to purchase third-party consumer or SaaS subscriptions."
  },
  "EUROSTAT.APP.HEALTH": {
    name: "Individuals accessing health records or digital health apps (% of individuals)",
    unit: "% of individuals",
    topic: "Digital Health & Wellness Apps",
    limitations: "Refers to digital healthcare interaction and mobile wellness tracking. Does not predict clinical diagnostic app adoption or willingness to pay out-of-pocket for health subscriptions."
  },
  "EUROSTAT.APP.STREAM": {
    name: "Individuals streaming video, TV, or video content via apps (% of individuals)",
    unit: "% of individuals",
    topic: "Entertainment & Video Apps",
    limitations: "Measures consumer attention and digital entertainment media consumption. High video streaming usage does not imply willingness to subscribe to new niche video or creator tools."
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-importer-secret",
  "Content-Type": "application/json"
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const startTime = new Date();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const requiredSecret = Deno.env.get("IMPORTER_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing backend configuration (SUPABASE_URL or service_role key)" }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const providedSecret = req.headers.get("x-importer-secret");
    const authHeader = req.headers.get("authorization") || "";
    const isServiceRole = authHeader.includes(supabaseServiceRoleKey);
    const isAuthorized = isServiceRole || (requiredSecret && providedSecret === requiredSecret);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin secret or service-role token required." }),
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Initial audit log
    const { data: initialLog } = await supabase
      .from("market_import_logs")
      .insert({
        source_id: SOURCE_META.id,
        started_at: startTime.toISOString(),
        status: "running",
        summary: "Initiating Eurostat Mobile Apps Edge Function ingestion run."
      })
      .select("id")
      .single();

    const importLogId = initialLog?.id;

    // 2. Register Source
    await supabase.from("market_data_sources").upsert({
      id: SOURCE_META.id,
      name: SOURCE_META.name,
      publisher: SOURCE_META.publisher,
      source_url: SOURCE_META.source_url,
      methodology_url: SOURCE_META.methodology_url,
      api_endpoint: SOURCE_META.api_endpoint,
      reuse_terms: SOURCE_META.reuse_terms,
      last_checked_at: new Date().toISOString()
    });

    // 3. Register Indicators
    const indicatorsPayload = Object.entries(VALID_INDICATORS).map(([code, meta]) => ({
      id: code,
      source_id: SOURCE_META.id,
      name: meta.name,
      definition: meta.name,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));
    await supabase.from("market_indicators").upsert(indicatorsPayload);

    // 4. Parse payload CSV
    const csvContent = await req.text();
    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error("No CSV data provided in request body.");
    }

    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    const headers = parseCsvLine(lines[0]);

    const colCountry = headers.indexOf("country_code");
    const colCountryName = headers.indexOf("country_name");
    const colIndicator = headers.indexOf("indicator_code");
    const colYear = headers.indexOf("year");
    const colValue = headers.indexOf("value");
    const colUnit = headers.indexOf("unit");

    if (colCountry === -1 || colIndicator === -1 || colYear === -1 || colValue === -1) {
      throw new Error("CSV missing required headers: country_code, indicator_code, year, value");
    }

    const observations = [];
    const errors: Array<{ line: number; error: string }> = [];
    const observedCountries = new Set<string>();
    const observedYears = new Set<number>();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < 4) continue;

      const rawCountry = row[colCountry]?.toUpperCase();
      const countryName = colCountryName !== -1 ? row[colCountryName] : rawCountry;
      const indicator = row[colIndicator];
      const rawYear = row[colYear];
      const rawVal = row[colValue];
      const unit = colUnit !== -1 ? row[colUnit] : "% of individuals";

      if (!rawCountry || rawCountry.length !== 3) {
        errors.push({ line: i + 1, error: `Invalid country code: ${rawCountry}` });
        continue;
      }
      if (!VALID_INDICATORS[indicator]) {
        errors.push({ line: i + 1, error: `Invalid indicator: ${indicator}` });
        continue;
      }
      const year = parseInt(rawYear, 10);
      if (isNaN(year) || year < 2000 || year > 2030) {
        errors.push({ line: i + 1, error: `Invalid year: ${rawYear}` });
        continue;
      }

      let numericValue: number | null = null;
      if (rawVal !== "" && rawVal !== undefined && rawVal !== "null" && rawVal !== "NULL" && rawVal !== ":") {
        const parsed = parseFloat(rawVal);
        if (!isNaN(parsed)) numericValue = parsed;
      }

      observedCountries.add(rawCountry);
      observedYears.add(year);

      observations.push({
        country_code: rawCountry,
        country_name: countryName,
        indicator_code: indicator,
        year: year,
        value: numericValue,
        unit: unit,
        source_id: SOURCE_META.id,
        imported_at: new Date().toISOString(),
        metadata: {
          source_name: SOURCE_META.name,
          publisher: SOURCE_META.publisher,
          attribution: SOURCE_META.attribution,
          limitations: VALID_INDICATORS[indicator].limitations,
          disclaimer: SOURCE_META.disclaimer
        }
      });
    }

    // 5. Batch upsert
    const BATCH_SIZE = 100;
    for (let i = 0; i < observations.length; i += BATCH_SIZE) {
      const chunk = observations.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from("country_observations")
        .upsert(chunk, { onConflict: "country_code,indicator_code,year" });
      if (upsertErr) throw upsertErr;
    }

    const sortedYears = Array.from(observedYears).sort((a, b) => a - b);
    const yearSpanStr = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : "N/A";
    const summaryText = `Eurostat Mobile Apps Ingest: ${observations.length} records across ${observedCountries.size} countries (${yearSpanStr}). NULLs preserved.`;

    if (importLogId) {
      await supabase.from("market_import_logs").update({
        completed_at: new Date().toISOString(),
        status: errors.length > 0 ? "partial_failure" : "success",
        records_imported: observations.length,
        records_updated: observations.length,
        countries_count: observedCountries.size,
        indicators_count: Object.keys(VALID_INDICATORS).length,
        errors: errors.slice(0, 50),
        summary: summaryText
      }).eq("id", importLogId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        records_imported: observations.length,
        countries_count: observedCountries.size,
        year_range: yearSpanStr,
        errors: errors.length
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
