-- ==============================================================================
-- Migration: 20261018000014_create_ai_analyst_audit_log.sql
-- Description: Server-side audit log of AI market analyst queries, used evidence records,
-- and responses. Preserves Row Level Security so founders can inspect used sources later.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_analyst_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID,
    simulation_run_id TEXT,
    mode TEXT NOT NULL,
    question TEXT,
    country_code VARCHAR(3) NOT NULL,
    country_name TEXT NOT NULL,
    industry_domain TEXT NOT NULL,
    ai_model TEXT NOT NULL,
    analysis_text TEXT NOT NULL,
    evidence_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    stale_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_analyst_logs IS 'Audit log of evidence-grounded AI analyst queries, retrieved indicators with definitions, limitations, and URLs.';

-- Enable Row Level Security
ALTER TABLE public.ai_analyst_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated founders can insert their own logs
DROP POLICY IF EXISTS "Founders can insert own AI analyst logs" ON public.ai_analyst_logs;
CREATE POLICY "Founders can insert own AI analyst logs"
    ON public.ai_analyst_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Authenticated founders can read their own logs
DROP POLICY IF EXISTS "Founders can read own AI analyst logs" ON public.ai_analyst_logs;
CREATE POLICY "Founders can read own AI analyst logs"
    ON public.ai_analyst_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 3: Service role full access
DROP POLICY IF EXISTS "Service role has full AI analyst logs access" ON public.ai_analyst_logs;
CREATE POLICY "Service role has full AI analyst logs access"
    ON public.ai_analyst_logs
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_workspace
    ON public.ai_analyst_logs (user_id, workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_sim_run
    ON public.ai_analyst_logs (simulation_run_id);
