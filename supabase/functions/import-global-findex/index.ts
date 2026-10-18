// ==============================================================================
// Supabase Edge Function: import-global-findex
// Description: Secure server-side importer for World Bank Global Findex indicators.
// Security: Protected by x-importer-secret or service_role key.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SOURCE_META = {
  id: "global_findex",
  name: "Global Financial Inclusion (Global Findex) Database",
  publisher: "The World Bank Group",
  source_url: "https://www.worldbank.org/en/publication/globalfindex",
  methodology_url: "https://databank.worldbank.org/source/global-financial-inclusion",
  api_endpoint: "https://api.worldbank.org/v2/country/all/indicator/{id}?source=28&format=json",
  reuse_terms: "Creative Commons Attribution 4.0 International (CC-BY 4.0). Sourced from The World Bank: Global Financial Inclusion (Global Findex) Database.",
  attribution: "The World Bank Group, Global Financial Inclusion (Global Findex) Database. Licensed under CC-BY 4.0.",
  disclaimer: "Payment and account ownership statistics establish national financial infrastructure readiness. They do not predict or prove that an individual customer will buy a product, nor do they measure price elasticity, individual willingness to pay, or customer conversion."
};

const VALID_INDICATORS: Record<string, { name: string; unit: string; topic: string; limitations: string }> = {
  "account.t.d": {
    name: "Account ownership (% age 15+)",
    unit: "% of population age 15+",
    topic: "Financial Inclusion & Payments",
    limitations: "Quantifies population-level access to formal banking and mobile money rails. Account possession does not measure active account usage, average balances, purchasing power, disposable income, or willingness to purchase online subscription software."
  },
  "g20.any": {
    name: "Made or received digital payments (% age 15+)",
    unit: "% of population age 15+",
    topic: "Digital Payments & Transaction Behavior",
    limitations: "Measures baseline familiarity with digital payment instruments across the national population. Having made or received a digital payment (such as for utilities or remittances) does not validate demand, interest, or willingness to buy a specific software product."
  },
  "fin2.t.d": {
    name: "Owns a debit card (% age 15+)",
    unit: "% of population age 15+",
    topic: "Payment Cards & Infrastructure",
    limitations: "Measures card issuance penetration. Does not measure international transaction support, online e-commerce activation, card authorization success rates, or consumer willingness to authorize recurring subscription charges."
  },
  "fin10": {
    name: "Owns a credit card (% age 15+)",
    unit: "% of population age 15+",
    topic: "Payment Cards & Infrastructure",
    limitations: "Refers to formal revolving consumer credit card penetration. Heavily influenced by national banking regulations, underwriting standards, and income distribution. Does not indicate corporate expense card availability or willingness to buy."
  },
  "g20.made": {
    name: "Made a digital payment (% age 15+)",
    unit: "% of population age 15+",
    topic: "Digital Payments & Transaction Behavior",
    limitations: "Captures the outbound transmission of funds through digital rails. Does not distinguish between high-value transactions and small utility payments, nor does it guarantee customer conversion for new digital services."
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

  // 1. Authorize: Require internal secret or service-role key
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const configuredSecret = Deno.env.get("IMPORTER_SECRET");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set." }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const providedSecret = req.headers.get("x-importer-secret");
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const isSecretValid = configuredSecret && providedSecret === configuredSecret;
  const isServiceRoleValid = token && token === supabaseServiceKey;

  if (!isSecretValid && !isServiceRoleValid) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized: Endpoint requires valid x-importer-secret or service_role authorization header."
      }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const importLogId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await supabase.from("market_import_logs").insert({
    id: importLogId,
    source_id: SOURCE_META.id,
    started_at: startedAt,
    status: "running",
    records_imported: 0,
    records_updated: 0,
    countries_count: 0,
    indicators_count: 0,
    errors: [],
    summary: "Started World Bank Global Findex ingestion via Edge Function."
  });

  try {
    // 2. Ensure catalog records
    await supabase.from("market_data_sources").upsert(SOURCE_META, { onConflict: "id" });

    const indicatorRows = Object.entries(VALID_INDICATORS).map(([code, meta]) => ({
      id: code,
      source_id: SOURCE_META.id,
      name: meta.name,
      definition: `${meta.name}. Survey of adults age 15+ conducted via Gallup World Poll.`,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));
    await supabase.from("market_indicators").upsert(indicatorRows, { onConflict: "id" });

    // 3. Determine if request provides CSV body or requests automated API sync
    const contentType = req.headers.get("content-type") || "";
    let observationsToUpsert: any[] = [];
    const errors: Array<{ line?: number; message: string }> = [];
    const observedCountries = new Map<string, string>();
    const observedYears = new Set<number>();
    const observationsByIndicator = new Map<string, { total: number; reported: number; missing: number }>();

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      const csvText = await req.text();
      const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) throw new Error("CSV payload empty.");

      const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
      const colIndex = {
        country_code: header.indexOf("country_code"),
        country_name: header.indexOf("country_name"),
        indicator_code: header.indexOf("indicator_code"),
        year: header.indexOf("year"),
        value: header.indexOf("value"),
        unit: header.indexOf("unit"),
        target_population: header.indexOf("target_population"),
        survey_breakdown: header.indexOf("survey_breakdown")
      };

      for (let i = 2; i <= lines.length; i++) {
        const cols = parseCsvLine(lines[i - 1]);
        const iso3 = (cols[colIndex.country_code] || "").trim().toUpperCase();
        const countryName = (colIndex.country_name !== -1 && cols[colIndex.country_name]) ? cols[colIndex.country_name].trim() : iso3;
        const indCode = (cols[colIndex.indicator_code] || "").trim();
        const yearStr = cols[colIndex.year] || "";
        const valStr = colIndex.value !== -1 ? cols[colIndex.value] : "";

        if (!iso3 || !/^[A-Z]{3}$/.test(iso3)) continue;
        if (!VALID_INDICATORS[indCode]) continue;

        const year = parseInt(yearStr, 10);
        if (isNaN(year)) continue;

        let numericVal: number | null = null;
        if (valStr !== "" && valStr !== null && valStr !== undefined && valStr.toUpperCase() !== "NA") {
          const parsed = Number(valStr);
          if (!isNaN(parsed)) numericVal = parsed;
        }

        const indMeta = VALID_INDICATORS[indCode];
        observedCountries.set(iso3, countryName);
        observedYears.add(year);

        if (!observationsByIndicator.has(indCode)) {
          observationsByIndicator.set(indCode, { total: 0, reported: 0, missing: 0 });
        }
        const stats = observationsByIndicator.get(indCode)!;
        stats.total++;
        if (numericVal !== null) stats.reported++;
        else stats.missing++;

        observationsToUpsert.push({
          country_code: iso3,
          country_name: countryName,
          indicator_code: indCode,
          year: year,
          value: numericVal,
          unit: indMeta.unit,
          source_id: SOURCE_META.id,
          imported_at: new Date().toISOString(),
          metadata: {
            source_name: SOURCE_META.name,
            publisher: SOURCE_META.publisher,
            source_url: SOURCE_META.source_url,
            methodology_url: SOURCE_META.methodology_url,
            reuse_terms: SOURCE_META.reuse_terms,
            attribution: SOURCE_META.attribution,
            disclaimer: SOURCE_META.disclaimer,
            limitations: indMeta.limitations,
            survey_wave: `${year} Survey Wave`,
            target_population: "Adults age 15+",
            survey_breakdown: "Nationally representative survey sample (Gallup World Poll)",
            topic: indMeta.topic
          }
        });
      }
    } else {
      // Automated fetch from World Bank API for sovereign countries
      const countryRes = await fetch("https://api.worldbank.org/v2/country?format=json&per_page=350");
      const countryJson = await countryRes.json();
      const countryMap = new Map<string, string>();
      for (const c of countryJson[1] || []) {
        const isAggregate = !c.region || c.region.value === "Aggregates" || c.region.id === "NA";
        const iso3 = (c.id || "").trim().toUpperCase();
        if (!isAggregate && iso3.length === 3) countryMap.set(iso3, c.name || iso3);
      }

      for (const [code, meta] of Object.entries(VALID_INDICATORS)) {
        const apiUrl = `https://api.worldbank.org/v2/country/all/indicator/${code}?source=28&date=2014:2024&format=json&per_page=1000`;
        const res = await fetch(apiUrl);
        if (!res.ok) continue;
        const json = await res.json();
        const rawItems = json[1] || [];

        for (const item of rawItems) {
          const iso3 = (item.country?.id || item.countryiso3code || "").trim().toUpperCase();
          if (!countryMap.has(iso3)) continue;
          const year = parseInt(item.date, 10);
          if (isNaN(year) || ![2014, 2017, 2021, 2024].includes(year)) continue;

          let numericVal: number | null = null;
          if (item.value !== null && item.value !== undefined) {
            const parsed = Number(item.value);
            if (!isNaN(parsed)) numericVal = parsed;
          }

          const countryName = countryMap.get(iso3)!;
          observedCountries.set(iso3, countryName);
          observedYears.add(year);

          if (!observationsByIndicator.has(code)) {
            observationsByIndicator.set(code, { total: 0, reported: 0, missing: 0 });
          }
          const stats = observationsByIndicator.get(code)!;
          stats.total++;
          if (numericVal !== null) stats.reported++;
          else stats.missing++;

          observationsToUpsert.push({
            country_code: iso3,
            country_name: countryName,
            indicator_code: code,
            year: year,
            value: numericVal,
            unit: meta.unit,
            source_id: SOURCE_META.id,
            imported_at: new Date().toISOString(),
            metadata: {
              source_name: SOURCE_META.name,
              publisher: SOURCE_META.publisher,
              source_url: SOURCE_META.source_url,
              methodology_url: SOURCE_META.methodology_url,
              reuse_terms: SOURCE_META.reuse_terms,
              attribution: SOURCE_META.attribution,
              disclaimer: SOURCE_META.disclaimer,
              limitations: meta.limitations,
              survey_wave: `${year} Survey Wave`,
              target_population: "Adults age 15+",
              survey_breakdown: "Nationally representative survey sample (Gallup World Poll)",
              topic: meta.topic
            }
          });
        }
      }
    }

    // Upsert in batches of 250
    const CHUNK_SIZE = 250;
    let totalUpserted = 0;
    for (let i = 0; i < observationsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = observationsToUpsert.slice(i, i + CHUNK_SIZE);
      const { error: upsertErr } = await supabase
        .from("country_observations")
        .upsert(chunk, { onConflict: "country_code,indicator_code,year" });
      if (upsertErr) throw upsertErr;
      totalUpserted += chunk.length;
    }

    const sortedYears = Array.from(observedYears).sort((a, b) => a - b);
    const summaryText = `Global Findex Ingestion Completed. Successfully stored ${totalUpserted} records across ${observedCountries.size} sovereign nations. Missing data preserved as NULL.`;
    const finalStatus = errors.length > 0 ? (totalUpserted > 0 ? "partial_failure" : "failed") : "success";

    await supabase.from("market_import_logs").update({
      completed_at: new Date().toISOString(),
      status: finalStatus,
      records_imported: totalUpserted,
      records_updated: totalUpserted,
      countries_count: observedCountries.size,
      indicators_count: observationsByIndicator.size,
      errors: errors.slice(0, 50),
      summary: summaryText
    }).eq("id", importLogId);

    return new Response(
      JSON.stringify({
        status: finalStatus,
        importLogId,
        recordsUpserted: totalUpserted,
        countriesCount: observedCountries.size,
        indicatorsCount: observationsByIndicator.size,
        surveyWaves: sortedYears,
        summary: summaryText
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    await supabase.from("market_import_logs").update({
      completed_at: new Date().toISOString(),
      status: "failed",
      errors: [{ message: err.message }],
      summary: `Failed Global Findex ingestion: ${err.message}`
    }).eq("id", importLogId);

    return new Response(
      JSON.stringify({ error: err.message, status: "failed", importLogId }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
