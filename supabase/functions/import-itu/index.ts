// ==============================================================================
// Supabase Edge Function: import-itu
// Description: Secure, server-side data importer for ITU digital access & connectivity indicators.
// Security: Protected by x-importer-secret or service_role key.
//           Never exposed to frontend / anonymous users.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SOURCE_META = {
  id: "itu",
  name: "ITU DataHub / ICT Indicators Database",
  publisher: "International Telecommunication Union (ITU)",
  source_url: "https://datahub.itu.int/",
  methodology_url: "https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx",
  api_endpoint: "https://api.datahub.itu.int/v2/",
  reuse_terms: "ITU Copyright & Disclaimer. Permitted for non-commercial, research, and educational purposes with mandatory attribution: Source: International Telecommunication Union (ITU). Commercial redistribution requires prior written permission (sales@itu.int / jur@itu.int). Data provided as is without warranty.",
  attribution: "Source: International Telecommunication Union (ITU), ITU DataHub.",
  disclaimer: "Digital access and connectivity metrics quantify national telecommunications infrastructure, mobile coverage, and household device penetration. They do not validate customer demand, price tolerance, product-market fit, or software purchasing intent."
};

const VALID_INDICATORS: Record<string, { name: string; unit: string; topic: string; limitations: string }> = {
  "ITU.ICT.HH.INET": {
    name: "Households with Internet access (%)",
    unit: "% of households",
    topic: "Digital Infrastructure & Connectivity",
    limitations: "Measures domestic household connectivity infrastructure, not individual user activity, broadband bandwidth tier, network latency, or household disposable income. It does not measure customer readiness to purchase digital software or pay for consumer apps."
  },
  "ITU.ICT.MOB.4G": {
    name: "Population covered by at least a 4G mobile network (%)",
    unit: "% of population",
    topic: "Mobile Infrastructure",
    limitations: "Indicates mobile cellular signal availability across residential geography. Physical signal coverage does not imply smartphone device ownership, active mobile data subscriptions, data bundle affordability, or reliable connection speeds under network congestion."
  },
  "ITU.ICT.ACT.MBB": {
    name: "Active mobile-broadband subscriptions (per 100 inhabitants)",
    unit: "subscriptions per 100 inhabitants",
    topic: "Mobile Infrastructure",
    limitations: "Measures subscription volume rather than unique individual human users. Metric can exceed 100 due to enterprise fleet accounts, multi-SIM devices, and machine-to-machine cards. Does not measure data consumption volume, network speed tiers, or consumer software spending."
  },
  "ITU.ICT.FBB.10M": {
    name: "Fixed broadband subscriptions >= 10 Mbit/s (% of total fixed broadband)",
    unit: "% of fixed broadband subscriptions",
    topic: "Broadband Infrastructure",
    limitations: "Measures contracted speed tiers among existing fixed-line subscribers, not actual real-world throughput, latency, packet loss, or business IT spending. Does not account for households or small businesses without fixed wireline access."
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

  // 2. Initialize Audit Log Record
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
    summary: "Started ITU digital connectivity ingestion via Edge Function."
  });

  try {
    // 3. Upsert Source and Indicators in Catalog
    await supabase.from("market_data_sources").upsert(SOURCE_META, { onConflict: "id" });

    const indicatorRows = Object.entries(VALID_INDICATORS).map(([code, meta]) => ({
      id: code,
      source_id: SOURCE_META.id,
      name: meta.name,
      definition: `${meta.name}. Measured by National Statistical Offices under ITU standards.`,
      topic: meta.topic,
      unit: meta.unit,
      limitations: meta.limitations
    }));
    await supabase.from("market_indicators").upsert(indicatorRows, { onConflict: "id" });

    // 4. Determine CSV content: from body or payload
    let csvText = "";
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvText = await req.text();
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      csvText = json.csv || "";
    }

    if (!csvText || csvText.trim().length === 0) {
      throw new Error("No CSV data provided in request body. Submit official ITU CSV text with Content-Type: text/csv.");
    }

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new Error("CSV payload is empty or contains only a header line.");
    }

    const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const colIndex = {
      country_code: header.indexOf("country_code"),
      country_name: header.indexOf("country_name"),
      indicator_code: header.indexOf("indicator_code"),
      year: header.indexOf("year"),
      value: header.indexOf("value"),
      unit: header.indexOf("unit"),
      source_url: header.indexOf("source_url"),
      obs_status: header.indexOf("obs_status")
    };

    if (colIndex.country_code === -1 || colIndex.indicator_code === -1 || colIndex.year === -1) {
      throw new Error(`CSV missing required columns (country_code, indicator_code, year).`);
    }

    const errors: Array<{ line: number; message: string }> = [];
    const observedCountries = new Map<string, string>();
    const observedYears = new Set<number>();
    const observationsByIndicator = new Map<string, { total: number; reported: number; missing: number }>();
    const observationsToUpsert: any[] = [];

    for (let lineNum = 2; lineNum <= lines.length; lineNum++) {
      const cols = parseCsvLine(lines[lineNum - 1]);
      const rawIso3 = (cols[colIndex.country_code] || "").trim().toUpperCase();
      const rawCountryName = (colIndex.country_name !== -1 && cols[colIndex.country_name]) ? cols[colIndex.country_name].trim() : rawIso3;
      const rawIndicator = (cols[colIndex.indicator_code] || "").trim();
      const rawYearStr = cols[colIndex.year] || "";
      const rawValStr = colIndex.value !== -1 ? cols[colIndex.value] : "";
      const rawUnit = colIndex.unit !== -1 && cols[colIndex.unit] ? cols[colIndex.unit].trim() : "";
      const rawUrl = colIndex.source_url !== -1 && cols[colIndex.source_url] ? cols[colIndex.source_url].trim() : SOURCE_META.source_url;
      const rawObsStatus = colIndex.obs_status !== -1 && cols[colIndex.obs_status] ? cols[colIndex.obs_status].trim() : null;

      if (!rawIso3 || rawIso3.length !== 3 || !/^[A-Z]{3}$/.test(rawIso3)) {
        errors.push({ line: lineNum, message: `Invalid ISO-3 code: "${rawIso3}"` });
        continue;
      }

      if (!VALID_INDICATORS[rawIndicator]) {
        errors.push({ line: lineNum, message: `Unknown indicator code: "${rawIndicator}"` });
        continue;
      }

      const year = parseInt(rawYearStr, 10);
      if (isNaN(year) || year < 1960 || year > 2100) {
        errors.push({ line: lineNum, message: `Invalid year: "${rawYearStr}"` });
        continue;
      }

      // Preserve missing values as NULL
      let numericVal: number | null = null;
      if (rawValStr !== "" && rawValStr !== null && rawValStr !== undefined && rawValStr.toUpperCase() !== "NA") {
        const parsed = Number(rawValStr);
        if (!isNaN(parsed)) numericVal = parsed;
        else errors.push({ line: lineNum, message: `Non-numeric value "${rawValStr}" stored as NULL.` });
      }

      const indicatorMeta = VALID_INDICATORS[rawIndicator];
      const unit = rawUnit || indicatorMeta.unit;

      observedCountries.set(rawIso3, rawCountryName);
      observedYears.add(year);

      if (!observationsByIndicator.has(rawIndicator)) {
        observationsByIndicator.set(rawIndicator, { total: 0, reported: 0, missing: 0 });
      }
      const stats = observationsByIndicator.get(rawIndicator)!;
      stats.total++;
      if (numericVal !== null) stats.reported++;
      else stats.missing++;

      observationsToUpsert.push({
        country_code: rawIso3,
        country_name: rawCountryName,
        indicator_code: rawIndicator,
        year: year,
        value: numericVal,
        unit: unit,
        source_id: SOURCE_META.id,
        imported_at: new Date().toISOString(),
        metadata: {
          source_name: SOURCE_META.name,
          publisher: SOURCE_META.publisher,
          source_url: rawUrl,
          methodology_url: SOURCE_META.methodology_url,
          reuse_terms: SOURCE_META.reuse_terms,
          attribution: SOURCE_META.attribution,
          disclaimer: SOURCE_META.disclaimer,
          limitations: indicatorMeta.limitations,
          reference_period: String(year),
          topic: indicatorMeta.topic,
          obs_status: rawObsStatus
        }
      });
    }

    // Upsert in chunks of 200
    const CHUNK_SIZE = 200;
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
    const yearRangeStr = sortedYears.length > 0 ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : "N/A";
    const coverageReport: Record<string, any> = {};
    for (const [code, stat] of observationsByIndicator.entries()) {
      coverageReport[code] = { reported: stat.reported, missingPreserved: stat.missing, total: stat.total };
    }

    const summaryText = `ITU Ingestion Complete. Upserted ${totalUpserted} records across ${observedCountries.size} sovereign countries and ${observationsByIndicator.size} indicators (${yearRangeStr}). Missing data preserved as NULL.`;
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
        yearsCovered: sortedYears,
        coverageReport,
        errorsCount: errors.length,
        summary: summaryText
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    await supabase.from("market_import_logs").update({
      completed_at: new Date().toISOString(),
      status: "failed",
      errors: [{ message: err.message }],
      summary: `Failed ITU ingestion: ${err.message}`
    }).eq("id", importLogId);

    return new Response(
      JSON.stringify({ error: err.message, status: "failed", importLogId }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
