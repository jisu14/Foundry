-- ==============================================================================
-- Migration: 20261018000008_production_operations_and_health.sql
-- Description: Production Operations, Secure Scheduling Registry, Staleness 
--              Monitoring, Data Integrity Constraints, and Health Views.
-- Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Enhance market_data_sources with operational monitoring columns
ALTER TABLE public.market_data_sources
    ADD COLUMN IF NOT EXISTS update_cadence TEXT NOT NULL DEFAULT 'Quarterly',
    ADD COLUMN IF NOT EXISTS refresh_schedule_cron TEXT NOT NULL DEFAULT '0 2 1 * *',
    ADD COLUMN IF NOT EXISTS staleness_threshold_days INT NOT NULL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS max_batch_size INT NOT NULL DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_import_status TEXT DEFAULT 'pending' 
        CHECK (last_import_status IN ('pending', 'running', 'success', 'partial_failure', 'failed')),
    ADD COLUMN IF NOT EXISTS consecutive_failures INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.market_data_sources.update_cadence IS 'Published release cycle of the agency (e.g. Monthly, Quarterly, Semi-Annual, Annual, Triennial).';
COMMENT ON COLUMN public.market_data_sources.refresh_schedule_cron IS 'Standard 5-field cron schedule for automated edge function or worker invocation.';
COMMENT ON COLUMN public.market_data_sources.staleness_threshold_days IS 'Maximum allowable days without a successful refresh before the system raises a Stale Data alert.';
COMMENT ON COLUMN public.market_data_sources.consecutive_failures IS 'Counter of back-to-back failed ingestion attempts. Reset to 0 on success.';

-- 2. Populate operational parameters for each registered publisher
UPDATE public.market_data_sources
SET 
    update_cadence = 'Quarterly',
    refresh_schedule_cron = '0 2 1 * *', -- 1st of every month at 02:00 UTC
    staleness_threshold_days = 45,
    max_batch_size = 5000
WHERE id = 'world_bank';

UPDATE public.market_data_sources
SET 
    update_cadence = 'Semi-Annual',
    refresh_schedule_cron = '0 3 1 */3 *', -- Quarterly check (Jan, Apr, Jul, Oct 1st at 03:00 UTC)
    staleness_threshold_days = 120,
    max_batch_size = 5000
WHERE id = 'itu_datahub';

UPDATE public.market_data_sources
SET 
    update_cadence = 'Triennial Survey Wave',
    refresh_schedule_cron = '0 4 15 */3 *', -- Quarterly check for new survey waves (15th at 04:00 UTC)
    staleness_threshold_days = 400,
    max_batch_size = 10000
WHERE id = 'global_findex';

UPDATE public.market_data_sources
SET 
    update_cadence = 'Annual / Biennial',
    refresh_schedule_cron = '0 4 1 */2 *', -- Bi-monthly check (1st of every 2nd month at 04:00 UTC)
    staleness_threshold_days = 120,
    max_batch_size = 5000
WHERE id = 'unctadstat';

UPDATE public.market_data_sources
SET 
    update_cadence = 'Annual (December Release)',
    refresh_schedule_cron = '0 5 1 */2 *', -- Bi-monthly check (1st of every 2nd month at 05:00 UTC)
    staleness_threshold_days = 120,
    max_batch_size = 5000
WHERE id = 'eurostat';

-- 3. Data Integrity & Malformed Payload Protection Constraints
-- Protect country_observations from invalid ISO country codes, corrupted values, or impossible years
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_country_obs_iso3_format'
    ) THEN
        ALTER TABLE public.country_observations
        ADD CONSTRAINT chk_country_obs_iso3_format 
        CHECK (country_code ~ '^[A-Z]{3}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_country_obs_value_sanity'
    ) THEN
        ALTER TABLE public.country_observations
        ADD CONSTRAINT chk_country_obs_value_sanity 
        CHECK (value IS NULL OR (value >= -100000000000000 AND value <= 100000000000000));
    END IF;
END $$;

-- 4. Secure Health & Staleness Audit View
-- Exposes operational metrics without leaking internal secrets or service credentials
CREATE OR REPLACE VIEW public.v_market_sources_health AS
SELECT 
    s.id AS source_id,
    s.name AS source_name,
    s.publisher,
    s.update_cadence,
    s.refresh_schedule_cron,
    s.staleness_threshold_days,
    s.last_imported_at,
    s.last_import_status,
    s.consecutive_failures,
    CASE 
        WHEN s.last_imported_at IS NULL THEN NULL
        ELSE ROUND(EXTRACT(EPOCH FROM (now() - s.last_imported_at)) / 86400.0, 1)
    END AS days_since_last_import,
    CASE
        WHEN s.last_import_status = 'failed' OR s.consecutive_failures >= 2 THEN 'critical_failure'
        WHEN s.last_import_status = 'partial_failure' THEN 'warning_partial'
        WHEN s.last_imported_at IS NOT NULL AND EXTRACT(EPOCH FROM (now() - s.last_imported_at)) / 86400.0 > s.staleness_threshold_days THEN 'warning_stale'
        WHEN s.last_imported_at IS NULL AND s.last_import_status = 'pending' THEN 'awaiting_ingest'
        WHEN s.last_import_status = 'running' THEN 'running'
        ELSE 'healthy'
    END AS operational_health,
    COUNT(DISTINCT o.country_code) AS countries_with_data_count,
    COUNT(DISTINCT o.indicator_code) AS indicators_with_data_count,
    COUNT(o.id) FILTER (WHERE o.value IS NOT NULL) AS non_null_observations_count,
    COUNT(o.id) FILTER (WHERE o.value IS NULL) AS preserved_null_gaps_count,
    MIN(o.year) AS earliest_observation_year,
    MAX(o.year) AS latest_observation_year
FROM public.market_data_sources s
LEFT JOIN public.country_observations o ON o.source_id = s.id
GROUP BY 
    s.id, s.name, s.publisher, s.update_cadence, s.refresh_schedule_cron,
    s.staleness_threshold_days, s.last_imported_at, s.last_import_status, s.consecutive_failures;

COMMENT ON VIEW public.v_market_sources_health IS 'Operational health, staleness indicators, and aggregate observation counts for each registered market publisher.';

-- 5. Row Level Security for Health View
-- Grant public SELECT access to the operational health view
GRANT SELECT ON public.v_market_sources_health TO anon, authenticated;

-- 6. Helper Function to Record Import Results & Reset/Increment Failures
-- Callable securely from service_role
CREATE OR REPLACE FUNCTION public.record_market_import_result(
    p_source_id TEXT,
    p_status TEXT,
    p_records_imported INT DEFAULT 0,
    p_errors JSONB DEFAULT '[]'::jsonb,
    p_summary TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update source status
    UPDATE public.market_data_sources
    SET 
        last_imported_at = CASE WHEN p_status IN ('success', 'partial_failure') THEN now() ELSE last_imported_at END,
        last_import_status = p_status,
        consecutive_failures = CASE 
            WHEN p_status = 'success' THEN 0 
            WHEN p_status = 'partial_failure' THEN consecutive_failures
            ELSE consecutive_failures + 1 
        END,
        last_checked_at = now()
    WHERE id = p_source_id;
END;
$$;

COMMENT ON FUNCTION public.record_market_import_result IS 'Internal procedure to safely update source health status, timestamps, and failure counters.';
