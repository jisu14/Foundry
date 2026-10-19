-- ==============================================================================
-- Migration: 20261018000009_simulation_grounding_and_evidence.sql
-- Description: Connect simulation engine to sourced market data & founder assumptions
-- Enhances founder_simulation_runs and simulation_evidence with country, industry,
-- uncertainty ranges, plain-language model logic, and audit trail.
-- ==============================================================================

-- 1. Extend founder_simulation_runs with contextual grounding fields
ALTER TABLE public.founder_simulation_runs
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(3) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{3}$'),
    ADD COLUMN IF NOT EXISTS country_name TEXT,
    ADD COLUMN IF NOT EXISTS industry_domain TEXT,
    ADD COLUMN IF NOT EXISTS founder_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS uncertainty_range JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS model_logic_explanation TEXT,
    ADD COLUMN IF NOT EXISTS assumptions_and_limitations TEXT,
    ADD COLUMN IF NOT EXISTS data_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS research_recommendations TEXT;

COMMENT ON COLUMN public.founder_simulation_runs.country_code IS 'ISO-3 sovereign nation code targeted in this simulation run.';
COMMENT ON COLUMN public.founder_simulation_runs.industry_domain IS 'Industry vertical/sector mapped from founder product type.';
COMMENT ON COLUMN public.founder_simulation_runs.founder_inputs IS 'Full snapshot of founder-declared inputs (persona, budget, pricing, channel).';
COMMENT ON COLUMN public.founder_simulation_runs.uncertainty_range IS 'Calculated lower/upper sensitivity bounds reflecting data uncertainty.';
COMMENT ON COLUMN public.founder_simulation_runs.model_logic_explanation IS 'Plain language walkthrough of the calculations applied in this run.';
COMMENT ON COLUMN public.founder_simulation_runs.assumptions_and_limitations IS 'Documented modeling assumptions, elasticity curves, and known boundaries.';
COMMENT ON COLUMN public.founder_simulation_runs.data_gaps IS 'Unreported or missing indicators for the targeted market geography.';
COMMENT ON COLUMN public.founder_simulation_runs.research_recommendations IS 'Real-world customer discovery or commercial telemetry needed to validate hypotheses.';

-- 2. Extend simulation_evidence with provenance tracking
ALTER TABLE public.simulation_evidence
    ADD COLUMN IF NOT EXISTS source_id TEXT REFERENCES public.market_data_sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_name TEXT,
    ADD COLUMN IF NOT EXISTS data_status TEXT NOT NULL DEFAULT 'reported',
    ADD COLUMN IF NOT EXISTS uncertainty_note TEXT;

COMMENT ON COLUMN public.simulation_evidence.source_id IS 'Official data source ID (e.g. world_bank, itu_datahub, eurostat).';
COMMENT ON COLUMN public.simulation_evidence.data_status IS 'Whether the observation was reported, missing/unreported, or founder-declared.';
COMMENT ON COLUMN public.simulation_evidence.uncertainty_note IS 'Contextual explanation of variance or data limitations.';

-- 3. Create helper index for querying runs by country and industry
CREATE INDEX IF NOT EXISTS idx_sim_runs_country_industry 
ON public.founder_simulation_runs (country_code, industry_domain);
