-- ==============================================================================
-- Migration: 20261018000017_create_live_market_research_schema.sql
-- Description: Private founder live cited market research records powered by
--              Gemini with Google Search grounding.
-- Engine: Supabase / PostgreSQL with strict Row Level Security (RLS)
-- Privacy: Strictly private to auth.uid(). Never shared into sovereign catalog.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.founder_grounded_research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    country_code VARCHAR(10) NOT NULL,
    country_name TEXT NOT NULL,
    industry_domain TEXT NOT NULL,
    customer_type TEXT NOT NULL DEFAULT 'B2B/B2C',
    research_question TEXT NOT NULL,
    model_used TEXT NOT NULL,
    synthesis_markdown TEXT NOT NULL,
    structured_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_queries JSONB DEFAULT '[]'::jsonb,
    tam_sam_som JSONB DEFAULT NULL,
    disagreements_or_gaps TEXT DEFAULT NULL,
    confidence_notes TEXT DEFAULT NULL,
    limitations TEXT DEFAULT NULL,
    grounding_metadata JSONB DEFAULT '{}'::jsonb,
    is_cached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.founder_grounded_research_reports IS 'Private, cited market research reports generated via Gemini with Google Search grounding. Accessible only by the owning founder.';

-- Per-user daily search quota tracking table
CREATE TABLE IF NOT EXISTS public.founder_search_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
    search_count INT NOT NULL DEFAULT 1,
    max_daily_limit INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_quota_date UNIQUE (user_id, quota_date)
);

COMMENT ON TABLE public.founder_search_quotas IS 'Daily usage tracking for Google Search grounding free-tier safety. Caps usage at max_daily_limit to prevent accidental paid charges.';

-- Enable RLS
ALTER TABLE public.founder_grounded_research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_search_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for founder_grounded_research_reports
DROP POLICY IF EXISTS "Founders can view their own grounded research reports" ON public.founder_grounded_research_reports;
CREATE POLICY "Founders can view their own grounded research reports"
ON public.founder_grounded_research_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can insert their own grounded research reports" ON public.founder_grounded_research_reports;
CREATE POLICY "Founders can insert their own grounded research reports"
ON public.founder_grounded_research_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can update their own grounded research reports" ON public.founder_grounded_research_reports;
CREATE POLICY "Founders can update their own grounded research reports"
ON public.founder_grounded_research_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can delete their own grounded research reports" ON public.founder_grounded_research_reports;
CREATE POLICY "Founders can delete their own grounded research reports"
ON public.founder_grounded_research_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for founder_search_quotas
DROP POLICY IF EXISTS "Founders can view their own search quota" ON public.founder_search_quotas;
CREATE POLICY "Founders can view their own search quota"
ON public.founder_search_quotas
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can insert their own search quota" ON public.founder_search_quotas;
CREATE POLICY "Founders can insert their own search quota"
ON public.founder_search_quotas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founders can update their own search quota" ON public.founder_search_quotas;
CREATE POLICY "Founders can update their own search quota"
ON public.founder_search_quotas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grounded_research_user ON public.founder_grounded_research_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grounded_research_country ON public.founder_grounded_research_reports(country_code, industry_domain);
CREATE INDEX IF NOT EXISTS idx_search_quotas_user_date ON public.founder_search_quotas(user_id, quota_date);
