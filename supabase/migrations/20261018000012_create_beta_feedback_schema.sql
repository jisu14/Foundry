-- Migration: 20261018000012_create_beta_feedback_schema.sql
-- Description: Create beta feedback and data error reporting schema for private beta founders.
-- RLS: Founders can submit and view their own feedback reports.

CREATE TABLE IF NOT EXISTS public.beta_feedback_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workspace_id UUID,
    report_type TEXT NOT NULL CHECK (report_type IN (
        'confusing_simulation',
        'data_error',
        'missing_indicator',
        'calculation_doubt',
        'privacy_inquiry',
        'general_feedback'
    )),
    context_view TEXT,
    related_run_id TEXT,
    related_indicator_code TEXT,
    target_country_code TEXT,
    target_industry_domain TEXT,
    subject TEXT NOT NULL,
    details TEXT NOT NULL,
    observed_discrepancy TEXT,
    client_app_version TEXT DEFAULT 'v2.0-beta',
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beta_feedback_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Founders can insert their own reports
DROP POLICY IF EXISTS "Founders can submit feedback reports" ON public.beta_feedback_reports;
CREATE POLICY "Founders can submit feedback reports"
    ON public.beta_feedback_reports
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Founders can view only their own submitted reports
DROP POLICY IF EXISTS "Founders can view their own feedback reports" ON public.beta_feedback_reports;
CREATE POLICY "Founders can view their own feedback reports"
    ON public.beta_feedback_reports
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Service role has full access for administrative review
DROP POLICY IF EXISTS "Service role has full feedback access" ON public.beta_feedback_reports;
CREATE POLICY "Service role has full feedback access"
    ON public.beta_feedback_reports
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON public.beta_feedback_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON public.beta_feedback_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created ON public.beta_feedback_reports(created_at DESC);
