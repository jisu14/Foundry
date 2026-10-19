-- ==============================================================================
-- Migration: 20261018000010_create_founder_real_evidence_schema.sql
-- Description: Real Market Evidence & Field Research Repository
-- Enables founders to record firsthand research (interviews, surveys, smoke tests,
-- actual sales) and published secondary studies outside the simulation sandbox.
-- Enforces strict Row Level Security (RLS) multi-tenant isolation, private-by-default
-- access controls, explicit opt-in sharing policies, and sample bias guardrails.
-- ==============================================================================

-- 1. Create Founder Real Market Evidence Table
CREATE TABLE IF NOT EXISTS public.founder_real_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Methodological Classification
    research_method TEXT NOT NULL CHECK (
        research_method IN (
            'customer_interviews',
            'quantitative_survey',
            'landing_page_smoke_test',
            'actual_sales_orders',
            'prototype_usability_test',
            'pricing_conjoint_test',
            'b2b_pilot_program',
            'other_field_experiment'
        )
    ),
    
    -- Provenance & Evidence Sourcing
    evidence_type TEXT NOT NULL DEFAULT 'firsthand' CHECK (
        evidence_type IN ('firsthand', 'published_source')
    ),
    source_citation TEXT NULL, -- e.g., "Interviews led by Founder" or "Gartner 2024 Developer Ecosystem p.14"
    
    -- Domain & Target Market Context
    country_code VARCHAR(3) NULL CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{3}$'),
    country_name TEXT NULL,
    industry_domain TEXT NOT NULL,
    customer_group_id UUID NULL REFERENCES public.founder_customer_groups(id) ON DELETE SET NULL,
    customer_group_name TEXT NULL,
    
    -- Chronology & Sample Metrics
    collection_start_date DATE NULL,
    collection_end_date DATE NULL,
    sample_size INT NOT NULL CHECK (sample_size > 0),
    sample_description TEXT NULL, -- e.g., "Seed-stage CTOs in Germany using AWS"
    
    -- Empirical Core: Question & Summary
    research_question TEXT NOT NULL, -- The specific test, hypothesis, or inquiry
    results_summary TEXT NOT NULL, -- Plain language findings and qualitative quotes
    quantitative_metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"conversion_rate": 0.08, "price_willing_to_pay": 49}
    
    -- Guardrails: Sample Limitations & Biases
    limitations_and_biases TEXT NOT NULL, -- Documented biases, small-sample warnings, or reach limits
    is_representative_sample BOOLEAN NOT NULL DEFAULT false, -- True only if statistically representative of national market
    
    -- Privacy & Benchmarking Consent
    privacy_status TEXT NOT NULL DEFAULT 'private' CHECK (
        privacy_status IN ('private', 'opted_in_shared')
    ),
    opted_in_at TIMESTAMPTZ NULL,
    opt_in_policy_version TEXT DEFAULT 'v1.0-deidentified-aggregate-only',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for high-performance workspace filtering
CREATE INDEX IF NOT EXISTS idx_founder_real_evidence_workspace
ON public.founder_real_evidence (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_real_evidence_user
ON public.founder_real_evidence (user_id);

CREATE INDEX IF NOT EXISTS idx_founder_real_evidence_lookup
ON public.founder_real_evidence (country_code, industry_domain, research_method);

-- Comments on table and attributes
COMMENT ON TABLE public.founder_real_evidence IS 'Empirical market research, customer interviews, smoke tests, and sales observations recorded by founders outside the simulation engine.';
COMMENT ON COLUMN public.founder_real_evidence.research_method IS 'Empirical methodology used to gather the evidence.';
COMMENT ON COLUMN public.founder_real_evidence.evidence_type IS 'Whether the data was gathered firsthand by the founder or cited from a published study.';
COMMENT ON COLUMN public.founder_real_evidence.sample_size IS 'Number of actual participants, survey respondents, test visitors, or paying customers observed.';
COMMENT ON COLUMN public.founder_real_evidence.limitations_and_biases IS 'Mandatory disclosure of methodology constraints, small sample size risks, or audience skew.';
COMMENT ON COLUMN public.founder_real_evidence.privacy_status IS 'Strictly private by default; can only be shared as de-identified aggregate upon explicit founder opt-in.';

-- ==============================================================================
-- 2. Row Level Security (RLS) Configuration - Strict Multi-Tenant Isolation
-- ==============================================================================

ALTER TABLE public.founder_real_evidence ENABLE ROW LEVEL SECURITY;

-- 1. Full Isolation Policy: Founders can only view, insert, edit, and delete their own records
CREATE POLICY "Founders can only access and manage their own real evidence"
ON public.founder_real_evidence
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 3. De-Identified Shared Benchmark View (Opt-In Aggregation Only)
-- ==============================================================================
-- When a founder explicitly opts in, their data is aggregated anonymously.
-- This view strictly STRIPS user_id, workspace_id, customer group names,
-- research question texts, raw quotes, and source citations.
-- Other founders NEVER see another founder's raw notes or customer details.

CREATE OR REPLACE VIEW public.shared_evidence_benchmarks AS
SELECT
    industry_domain,
    research_method,
    country_code,
    evidence_type,
    COUNT(id) AS total_studies_contributed,
    SUM(sample_size) AS aggregate_sample_size,
    ROUND(AVG(sample_size), 1) AS avg_study_sample_size,
    -- Aggregated metrics (only populated when numeric metrics exist)
    ROUND(AVG((quantitative_metrics->>'conversion_rate')::NUMERIC), 4) AS benchmark_avg_conversion_rate,
    ROUND(AVG((quantitative_metrics->>'price_willing_to_pay')::NUMERIC), 2) AS benchmark_avg_willing_price
FROM public.founder_real_evidence
WHERE privacy_status = 'opted_in_shared'
GROUP BY industry_domain, research_method, country_code, evidence_type
HAVING COUNT(id) >= 3; -- Minimum 3 contributions required to prevent k-anonymity re-identification

COMMENT ON VIEW public.shared_evidence_benchmarks IS 'Anonymized, aggregate empirical benchmarks across opted-in studies. Never reveals raw notes, names, or individual founder workspaces.';
