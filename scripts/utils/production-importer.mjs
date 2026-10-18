// ==============================================================================
// Module: scripts/utils/production-importer.mjs
// Description: Production-grade ingestion utilities for Foundry Market Data:
//              - Exponential backoff retry engine for transient HTTP/network failures.
//              - In-memory validation, sanitization, and deduplication.
//              - Batch size limits & payload DoS protection.
//              - Secret-sanitized structured error logging for audit trails.
// ==============================================================================

import crypto from 'node:crypto';

/**
 * Strips sensitive keys and bearer tokens from error messages or objects.
 */
export function sanitizeError(err) {
  if (!err) return 'Unknown error';
  let str = typeof err === 'object' ? (err.stack || err.message || JSON.stringify(err)) : String(err);
  
  // Redact Supabase service-role keys, bearer tokens, and generic JWTs
  str = str.replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, 'Bearer [REDACTED_TOKEN]');
  str = str.replace(/apikey=([A-Za-z0-9_\-.]+)/gi, 'apikey=[REDACTED_APIKEY]');
  str = str.replace(/eyJ[A-Za-z0-9_\-.]+/g, '[REDACTED_JWT]');
  str = str.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (match, offset, full) => {
    // Leave UUIDs intact if they are IDs, unless prefixed by auth
    return match;
  });

  return str;
}

/**
 * Sleep helper with promise
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper with exponential backoff, jitter, and HTTP status retry handling.
 *
 * @param {string} url - Target URL.
 * @param {RequestInit} options - Standard fetch options.
 * @param {object} config - Retry configuration.
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const maxRetries = config.maxRetries ?? 3;
  const initialDelayMs = config.initialDelayMs ?? 1000;
  const maxDelayMs = config.maxDelayMs ?? 10000;
  const retryableStatuses = new Set(config.retryableStatuses || [408, 429, 500, 502, 503, 504]);

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      const response = await fetch(url, options);

      if (!response.ok && retryableStatuses.has(response.status) && attempt <= maxRetries) {
        // Check for Retry-After header
        const retryAfterHeader = response.headers.get('retry-after');
        let waitTime = delay;
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            waitTime = parsedSeconds * 1000;
          }
        } else {
          // Exponential backoff with 20% random jitter
          const jitter = delay * 0.2 * (Math.random() * 2 - 1);
          waitTime = Math.min(delay + jitter, maxDelayMs);
          delay = Math.min(delay * 2, maxDelayMs);
        }

        console.warn(`  [RETRY ${attempt}/${maxRetries}] HTTP ${response.status} from ${url}. Retrying in ${Math.round(waitTime)}ms...`);
        await sleep(waitTime);
        continue;
      }

      return response;
    } catch (networkErr) {
      if (attempt <= maxRetries) {
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const waitTime = Math.min(delay + jitter, maxDelayMs);
        delay = Math.min(delay * 2, maxDelayMs);

        console.warn(`  [RETRY ${attempt}/${maxRetries}] Network error: ${sanitizeError(networkErr.message)}. Retrying in ${Math.round(waitTime)}ms...`);
        await sleep(waitTime);
      } else {
        throw new Error(`Exceeded max retries (${maxRetries}) for ${url}. Last error: ${sanitizeError(networkErr.message)}`);
      }
    }
  }
}

/**
 * Validates, quarantines malformed rows, and deduplicates an array of observation objects.
 * Prevents PostgREST duplicate row conflicts on ON CONFLICT DO UPDATE.
 *
 * @param {Array<object>} rawObservations
 * @param {object} options
 * @returns {{ validObservations: Array<object>, quarantined: Array<object>, stats: object }}
 */
export function validateAndDeduplicateObservations(rawObservations, options = {}) {
  const maxAllowed = options.maxObservations ?? 50000;
  const validObservations = [];
  const quarantined = [];
  const dedupeMap = new Map();

  if (!Array.isArray(rawObservations)) {
    throw new Error('validateAndDeduplicateObservations expects an array of observations.');
  }

  if (rawObservations.length > maxAllowed) {
    throw new Error(
      `Payload protection: incoming observations count (${rawObservations.length.toLocaleString()}) exceeds maximum allowed batch threshold (${maxAllowed.toLocaleString()}). Import aborted to protect backend stability.`
    );
  }

  let duplicatesResolved = 0;

  for (let idx = 0; idx < rawObservations.length; idx++) {
    const item = rawObservations[idx];
    const rowNum = idx + 1;

    // 1. Validate country_code (ISO 3166-1 alpha-3 uppercase)
    if (!item.country_code || typeof item.country_code !== 'string' || !/^[A-Z]{3}$/.test(item.country_code.trim())) {
      quarantined.push({
        row: rowNum,
        reason: `Invalid country_code: "${item.country_code}". Must be a valid 3-letter ISO-3 code (e.g. USA, GBR, DEU).`,
        data: item
      });
      continue;
    }
    const cleanCountryCode = item.country_code.trim();

    // 2. Validate indicator_code
    if (!item.indicator_code || typeof item.indicator_code !== 'string' || item.indicator_code.trim().length === 0) {
      quarantined.push({
        row: rowNum,
        reason: 'Missing or invalid indicator_code.',
        data: item
      });
      continue;
    }
    const cleanIndicatorCode = item.indicator_code.trim();

    // 3. Validate year
    const year = parseInt(item.year, 10);
    if (isNaN(year) || year < 1960 || year > 2100) {
      quarantined.push({
        row: rowNum,
        reason: `Invalid reference year: "${item.year}". Must be an integer between 1960 and 2100.`,
        data: item
      });
      continue;
    }

    // 4. Validate value: numeric or null (never NaN or undefined)
    let cleanValue = null;
    if (item.value !== null && item.value !== undefined && item.value !== '') {
      const parsed = Number(item.value);
      if (isNaN(parsed) || !isFinite(parsed)) {
        quarantined.push({
          row: rowNum,
          reason: `Invalid numeric value: "${item.value}". Must be a finite number or null.`,
          data: item
        });
        continue;
      }
      // Sanity check on bounds
      if (parsed < -1e14 || parsed > 1e14) {
        quarantined.push({
          row: rowNum,
          reason: `Value out of sanity bounds (-1e14 to 1e14): ${parsed}.`,
          data: item
        });
        continue;
      }
      cleanValue = parsed;
    }

    // 5. Unit and Source ID
    const cleanUnit = (item.unit || 'Standard Unit').trim();
    const cleanSourceId = (item.source_id || 'unknown').trim();
    const cleanCountryName = (item.country_name || cleanCountryCode).trim();

    const sanitizedItem = {
      country_code: cleanCountryCode,
      country_name: cleanCountryName,
      indicator_code: cleanIndicatorCode,
      year: year,
      value: cleanValue,
      unit: cleanUnit,
      source_id: cleanSourceId,
      imported_at: item.imported_at || new Date().toISOString(),
      metadata: item.metadata || {}
    };

    // 6. In-memory deduplication on unique constraint: (country_code, indicator_code, year)
    const dedupeKey = `${cleanCountryCode}_${cleanIndicatorCode}_${year}`;
    if (dedupeMap.has(dedupeKey)) {
      duplicatesResolved++;
    }
    // Update map with latest occurrence
    dedupeMap.set(dedupeKey, sanitizedItem);
  }

  // Collect deduplicated valid records
  for (const item of dedupeMap.values()) {
    validObservations.push(item);
  }

  return {
    validObservations,
    quarantined,
    stats: {
      rawCount: rawObservations.length,
      validCount: validObservations.length,
      quarantinedCount: quarantined.length,
      duplicatesResolved
    }
  };
}

/**
 * Dispatches an array of verified observations to Supabase country_observations in chunks
 * with automatic retries and conflict resolution.
 */
export async function chunkedUpsertObservations(supabaseUrl, serviceRoleKey, observations, options = {}) {
  const chunkSize = options.chunkSize || 250;
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/rest/v1/country_observations?on_conflict=country_code,indicator_code,year`;

  let totalUpserted = 0;
  const errors = [];

  for (let i = 0; i < observations.length; i += chunkSize) {
    const chunk = observations.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(observations.length / chunkSize);

    try {
      const response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(chunk)
      }, {
        maxRetries: 3,
        initialDelayMs: 1000
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase upsert chunk ${chunkNum}/${totalChunks} failed (${response.status}): ${sanitizeError(errText)}`);
      }

      totalUpserted += chunk.length;
    } catch (chunkErr) {
      console.error(`  ✗ [CHUNK ERROR] Batch ${chunkNum}/${totalChunks}: ${sanitizeError(chunkErr.message)}`);
      errors.push({
        chunk: chunkNum,
        recordsInChunk: chunk.length,
        error: sanitizeError(chunkErr.message),
        timestamp: new Date().toISOString()
      });
      // Continue with remaining chunks or rethrow if fatal
      if (options.abortOnFirstChunkFailure) {
        throw chunkErr;
      }
    }
  }

  return {
    totalUpserted,
    errors
  };
}

/**
 * Creates or updates an import log entry in public.market_import_logs.
 */
export async function recordImportLog(supabaseUrl, serviceRoleKey, logData, isNew = false) {
  const baseUrl = supabaseUrl.replace(/\/$/, '');

  const payload = {
    ...logData,
    summary: sanitizeError(logData.summary),
    errors: (logData.errors || []).map(e => (typeof e === 'object' ? { ...e, message: sanitizeError(e.message || e.error) } : sanitizeError(e)))
  };

  try {
    if (isNew) {
      await fetchWithRetry(`${baseUrl}/rest/v1/market_import_logs`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      await fetchWithRetry(`${baseUrl}/rest/v1/market_import_logs?id=eq.${logData.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
  } catch (logErr) {
    console.error(`[AUDIT LOG ERROR] Failed to record market_import_logs entry: ${sanitizeError(logErr.message)}`);
  }
}

/**
 * Updates the operational status of a source in market_data_sources.
 */
export async function updateSourceOperationalStatus(supabaseUrl, serviceRoleKey, sourceId, status, consecutiveFailures = 0) {
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const now = new Date().toISOString();

  const updateBody = {
    last_import_status: status,
    last_checked_at: now
  };

  if (status === 'success' || status === 'partial_failure') {
    updateBody.last_imported_at = now;
  }
  if (status === 'success') {
    updateBody.consecutive_failures = 0;
  } else if (status === 'failed') {
    updateBody.consecutive_failures = consecutiveFailures + 1;
  }

  try {
    await fetchWithRetry(`${baseUrl}/rest/v1/market_data_sources?id=eq.${sourceId}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateBody)
    });
  } catch (err) {
    console.error(`[SOURCE STATUS ERROR] Failed to update status for ${sourceId}: ${sanitizeError(err.message)}`);
  }
}
