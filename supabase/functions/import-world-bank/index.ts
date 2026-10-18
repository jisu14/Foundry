// ==============================================================================
// Supabase Edge Function: import-world-bank
// Description: Secure, server-side data importer for the World Bank Indicators API.
// Security: Protected by x-importer-secret or service_role key.
//           Never exposed to frontend code.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface WorldBankCountryResponse {
  id: string;
  iso2Code: string;
  name: string;
  region: { id: string; iso2code: string; value: string };
  incomeLevel: { id: string; iso2code: string; value: string };
}

interface WorldBankObservation {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

const INDICATORS = [
  {
    code: "SP.POP.TOTL",
    name: "Population, total",
    unit: "people",
    topic: "Demographics & Market Size"
  },
  {
    code: "NY.GDP.PCAP.CD",
    name: "GDP per capita (current US$)",
    unit: "current US$",
    topic: "Economic Context"
  },
  {
    code: "IT.NET.USER.ZS",
    name: "Individuals using the Internet (% of population)",
    unit: "% of population",
    topic: "Digital Infrastructure & Connectivity"
  },
  {
    code: "IT.CEL.SETS.P2",
    name: "Mobile cellular subscriptions (per 100 people)",
    unit: "subscriptions per 100 people",
    topic: "Mobile Infrastructure"
  },
  {
    code: "IT.NET.BBND.P2",
    name: "Fixed broadband subscriptions (per 100 people)",
    unit: "subscriptions per 100 people",
    topic: "Broadband Infrastructure"
  }
];

const SOURCE_META = {
  id: "world_bank",
  name: "World Development Indicators (WDI)",
  publisher: "The World Bank Group",
  source_url: "https://data.worldbank.org/",
  methodology_url: "https://databank.worldbank.org/source/world-development-indicators",
  api_endpoint: "https://api.worldbank.org/v2/",
  reuse_terms: "Creative Commons Attribution 4.0 International (CC-BY 4.0). Data can be shared and adapted provided appropriate credit is given: World Bank, World Development Indicators.",
  attribution: "World Bank, World Development Indicators (WDI). Licensed under CC-BY 4.0.",
  disclaimer: "Country-level macroeconomic and infrastructure indicators provide baseline geographical and infrastructure context. They do not measure individual purchasing intent, corporate software budgets, or willingness to buy."
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-importer-secret",
  "Content-Type": "application/json"
};

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
      JSON.stringify({
        error: "Server configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set."
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const providedSecret = req.headers.get("x-importer-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const isSecretValid = configuredSecret && providedSecret === configuredSecret;
  const isServiceRoleValid = authHeader.replace("Bearer ", "").trim() === supabaseServiceKey.trim();

  if (!isSecretValid && !isServiceRoleValid) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized: Invalid x-importer-secret or service_role authorization header."
      }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // Parse optional parameters from query or body
  const url = new URL(req.url);
  const dateRange = url.searchParams.get("date") || "2015:2024";

  // Create trusted backend Supabase client (service_role bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Initialize Audit Log Entry
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
    summary: `Started World Bank WDI ingestion for 5 indicators (${dateRange}).`
  });

  const errors: Array<{ indicator?: string; message: string; timestamp: string }> = [];
  const successfulIndicators: string[] = [];
  const observedCountries = new Set<string>();
  let totalObservationsUpserted = 0;

  try {
    // 3. Fetch authoritative country list to filter out regional aggregates
    // In World Bank API, regional aggregates have region.value === 'Aggregates' or region.id === 'NA'
    const countryMap = new Map<string, { code: string; name: string }>();
    try {
      const countryRes = await fetch("https://api.worldbank.org/v2/country?format=json&per_page=350");
      if (!countryRes.ok) {
        throw new Error(`Failed to fetch country metadata: HTTP ${countryRes.status}`);
      }
      const countryData = await countryRes.json();
      const rawCountries: WorldBankCountryResponse[] = countryData[1] || [];

      for (const c of rawCountries) {
        const isAggregate = !c.region || c.region.value === "Aggregates" || c.region.id === "NA";
        const iso3 = (c.id || "").trim().toUpperCase();
        if (!isAggregate && iso3.length === 3) {
          countryMap.set(iso3, {
            code: iso3,
            name: c.name || iso3
          });
        }
      }
    } catch (err: any) {
      throw new Error(`Error building verified country directory: ${err.message}`);
    }

    // 4. Ingest observations for each indicator
    for (const indicator of INDICATORS) {
      try {
        let page = 1;
        let totalPages = 1;
        const indicatorObservations: any[] = [];

        while (page <= totalPages) {
          const apiUrl = `https://api.worldbank.org/v2/country/all/indicator/${indicator.code}?format=json&date=${dateRange}&per_page=1000&page=${page}`;
          const res = await fetch(apiUrl);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} from World Bank API for indicator ${indicator.code}`);
          }

          const json = await res.json();
          const pageMeta = json[0];
          const rawItems: WorldBankObservation[] = json[1] || [];

          totalPages = pageMeta?.pages || 1;

          for (const item of rawItems) {
            const rawIso3 = (item.countryiso3code || item.country?.id || "").trim().toUpperCase();

            // Strictly filter out regional aggregates or unverified country codes
            if (!rawIso3 || rawIso3.length !== 3 || !countryMap.has(rawIso3)) {
              continue;
            }

            const year = parseInt(item.date, 10);
            if (isNaN(year) || year < 1960 || year > 2100) {
              continue;
            }

            // Preserve missing values as null. Never invent or fill gaps with synthetic data.
            let numericVal: number | null = null;
            if (item.value !== null && item.value !== undefined) {
              const parsed = Number(item.value);
              if (!isNaN(parsed)) {
                numericVal = parsed;
              }
            }

            const countryInfo = countryMap.get(rawIso3)!;
            observedCountries.add(rawIso3);

            indicatorObservations.push({
              country_code: countryInfo.code,
              country_name: countryInfo.name,
              indicator_code: indicator.code,
              year: year,
              value: numericVal,
              unit: indicator.unit,
              source_id: SOURCE_META.id,
              imported_at: new Date().toISOString(),
              metadata: {
                source_name: SOURCE_META.name,
                source_url: `https://data.worldbank.org/indicator/${indicator.code}`,
                methodology_url: SOURCE_META.methodology_url,
                reuse_terms: SOURCE_META.reuse_terms,
                attribution: SOURCE_META.attribution,
                disclaimer: SOURCE_META.disclaimer,
                reference_period: String(year),
                topic: indicator.topic,
                obs_status: item.obs_status || null,
                decimal: item.decimal ?? 0
              }
            });
          }

          page++;
        }

        // Upsert batch in chunks of 250 rows to keep payloads optimal
        const CHUNK_SIZE = 250;
        for (let i = 0; i < indicatorObservations.length; i += CHUNK_SIZE) {
          const chunk = indicatorObservations.slice(i, i + CHUNK_SIZE);
          const { error: upsertErr } = await supabase
            .from("country_observations")
            .upsert(chunk, {
              onConflict: "country_code,indicator_code,year"
            });

          if (upsertErr) {
            throw new Error(`Database upsert error for ${indicator.code}: ${upsertErr.message}`);
          }
        }

        totalObservationsUpserted += indicatorObservations.length;
        successfulIndicators.push(indicator.code);
      } catch (indErr: any) {
        // Record partial failure specifically for this indicator
        errors.push({
          indicator: indicator.code,
          message: indErr.message || String(indErr),
          timestamp: new Date().toISOString()
        });
      }
    }

    // 5. Finalize Audit Log Status
    const completedAt = new Date().toISOString();
    let finalStatus: "success" | "partial_failure" | "failed" = "success";
    if (errors.length > 0) {
      finalStatus = successfulIndicators.length > 0 ? "partial_failure" : "failed";
    }

    const summaryText = `Import ${finalStatus}: ${totalObservationsUpserted} observations processed across ${observedCountries.size} sovereign countries for ${successfulIndicators.length}/${INDICATORS.length} indicators. Regional aggregates excluded.`;

    await supabase
      .from("market_import_logs")
      .update({
        completed_at: completedAt,
        status: finalStatus,
        records_imported: totalObservationsUpserted,
        records_updated: totalObservationsUpserted,
        countries_count: observedCountries.size,
        indicators_count: successfulIndicators.length,
        errors: errors,
        summary: summaryText
      })
      .eq("id", importLogId);

    // Update last_checked_at on data source record
    await supabase
      .from("market_data_sources")
      .update({ last_checked_at: completedAt })
      .eq("id", SOURCE_META.id);

    return new Response(
      JSON.stringify({
        log_id: importLogId,
        status: finalStatus,
        total_observations_upserted: totalObservationsUpserted,
        countries_count: observedCountries.size,
        successful_indicators: successfulIndicators,
        errors: errors,
        summary: summaryText
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (fatalErr: any) {
    const completedAt = new Date().toISOString();
    const fatalMessage = fatalErr.message || String(fatalErr);

    errors.push({
      message: `Fatal error during import: ${fatalMessage}`,
      timestamp: completedAt
    });

    await supabase
      .from("market_import_logs")
      .update({
        completed_at: completedAt,
        status: "failed",
        errors: errors,
        summary: `Fatal failure: ${fatalMessage}`
      })
      .eq("id", importLogId);

    return new Response(
      JSON.stringify({
        log_id: importLogId,
        status: "failed",
        error: fatalMessage,
        errors: errors
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
