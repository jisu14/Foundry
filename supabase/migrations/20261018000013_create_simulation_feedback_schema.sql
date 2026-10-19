-- Migration: 20261018000013_create_simulation_feedback_schema.sql
-- Description: Create simulation-specific beta feedback schema linked to simulation runs and market data.
-- Enforces privacy: private to founder unless explicitly shared with Foundry team. Zero customer personal data.

CREATE TABLE IF NOT EXISTS public.simulation_run_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID,
    simulation_run_id TEXT NOT NULL,
    country_code TEXT NOT NULL,
    country_name TEXT,
    industry_domain TEXT NOT NULL,
    is_useful TEXT NOT NULL CHECK (is_useful IN (
        'very_useful',
        'directionally_useful',
        'neutral_unsure',
        'not_useful',
        'misleading'
    )),
    surprising_or_wrong_factors TEXT NOT NULL,
    surprising_factor_category TEXT CHECK (surprising_factor_category IN (
        'conversion_rate',
        'pricing_tolerance',
        'channel_cpm_ctr',
        'signup_trial_rate',
        'macro_indicator_discrepancy',
        'persona_comments',
        'other'
    )),
    has_real_evidence_comparison TEXT NOT NULL CHECK (has_real_evidence_comparison IN (
        'yes_direct_data',
        'partially_early_interviews',
        'no_not_yet',
        'planning_tests'
    )),
    planned_changes_next_run TEXT,
    linked_simulation_snapshot JSONB DEFAULT '{}'::jsonb,
    linked_market_sources JSONB DEFAULT '[]'::jsonb,
    share_with_foundry_team BOOLEAN NOT NULL DEFAULT FALSE,
    admin_review_status TEXT DEFAULT 'pending_review' CHECK (admin_review_status IN (
        'pending_review',
        'reviewed',
        'grouped_for_calibration',
        'dismissed_as_outlier'
    )),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.simulation_run_feedback ENABLE ROW LEVEL SECURITY;

-- Policy 1: Founder can insert their own simulation feedback
DROP POLICY IF EXISTS "Founders can insert own simulation feedback" ON public.simulation_run_feedback;
CREATE POLICY "Founders can insert own simulation feedback"
    ON public.simulation_run_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Founder can read only their own simulation feedback
DROP POLICY IF EXISTS "Founders can read own simulation feedback" ON public.simulation_run_feedback;
CREATE POLICY "Founders can read own simulation feedback"
    ON public.simulation_run_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 3: Service role has full access for administrative oversight & calibration reviews
DROP POLICY IF EXISTS "Service role has full simulation feedback access" ON public.simulation_run_feedback;
CREATE POLICY "Service role has full simulation feedback access"
    ON public.simulation_run_feedback
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- SQL View: Shared Beta Feedback Admin Observatory
-- Strips all founder personal emails / raw names; presents de-identified feedback grouped by recurring patterns.
CREATE OR REPLACE VIEW public.shared_beta_feedback_admin AS
SELECT
    f.id,
    f.simulation_run_id,
    f.country_code,
    f.country_name,
    f.industry_domain,
    f.is_useful,
    f.surprising_or_wrong_factors,
    f.surprising_factor_category,
    f.has_real_evidence_comparison,
    f.planned_changes_next_run,
    f.linked_simulation_snapshot,
    f.linked_market_sources,
    f.admin_review_status,
    f.created_at
FROM public.simulation_run_feedback f
WHERE f.share_with_foundry_team = TRUE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sim_feedback_user ON public.simulation_run_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_feedback_run ON public.simulation_run_feedback(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_sim_feedback_country_ind ON public.simulation_run_feedback(country_code, industry_domain);
CREATE INDEX IF NOT EXISTS idx_sim_feedback_shared ON public.simulation_run_feedback(share_with_foundry_team);
