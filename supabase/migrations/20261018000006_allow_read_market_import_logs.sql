-- ==============================================================================
-- Foundry: Migration 20261018000006_allow_read_market_import_logs.sql
-- Purpose: Allow anon & authenticated users to inspect market import logs
--          for the Market Data Coverage audit dashboard.
-- ==============================================================================

-- Drop policy if previously created to allow clean rerun
DROP POLICY IF EXISTS "Public read access for market import logs" ON public.market_import_logs;

-- Allow public read access on market_import_logs
CREATE POLICY "Public read access for market import logs"
ON public.market_import_logs
FOR SELECT
TO anon, authenticated
USING (true);

COMMENT ON TABLE public.market_import_logs IS 'Audit log of market data ingestion runs. Readable by anon and authenticated for coverage health checks.';
