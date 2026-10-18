-- ==============================================================================
-- Migration: 20261018000002_create_founder_workspace_schema.sql
-- Description: Founder Accounts, Workspaces, Customer Groups, Competitor Notes,
--              Campaigns, Simulation Runs, Simulation Events, and Simulation Evidence.
-- Engine: Supabase / PostgreSQL with Strict Tenant Row Level Security (RLS)
-- ==============================================================================

-- 1. Founder Workspaces
CREATE TABLE IF NOT EXISTS public.founder_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Founder Studio',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_founder_workspaces_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_founder_workspaces_user
ON public.founder_workspaces (user_id);

COMMENT ON TABLE public.founder_workspaces IS 'Private workspace container strictly isolated to an authenticated founder user.';

-- 2. Founder Startups
CREATE TABLE IF NOT EXISTS public.founder_startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    product_type TEXT,
    description TEXT,
    stage TEXT DEFAULT 'Prototype / Functional MVP',
    target_country_code VARCHAR(3),
    target_country_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_startups_user_workspace
ON public.founder_startups (user_id, workspace_id);

COMMENT ON TABLE public.founder_startups IS 'Founder startup venture profiles, product details, and target country.';

-- 3. Founder Customer Groups & Qualitative Assumptions
CREATE TABLE IF NOT EXISTS public.founder_customer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    budget_tier TEXT NOT NULL CHECK (budget_tier IN ('low', 'medium', 'high')),
    primary_channel TEXT NOT NULL,
    stated_assumptions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_customer_groups_user
ON public.founder_customer_groups (user_id, workspace_id);

COMMENT ON TABLE public.founder_customer_groups IS 'Founder-defined customer personas, channel preferences, and behavioral assumptions.';

-- 4. Founder Competitor Notes & Manual Research
CREATE TABLE IF NOT EXISTS public.founder_competitor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competitor_name TEXT,
    notes TEXT NOT NULL,
    strengths TEXT,
    weaknesses TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_competitor_notes_user
ON public.founder_competitor_notes (user_id, workspace_id);

COMMENT ON TABLE public.founder_competitor_notes IS 'Qualitative competitor notes, substitutes, and manual market observations entered by the founder.';

-- 5. Founder Campaigns, Price Tests, and Marketing Channels
CREATE TABLE IF NOT EXISTS public.founder_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES public.founder_startups(id) ON DELETE SET NULL,
    customer_group_id UUID REFERENCES public.founder_customer_groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    budget NUMERIC NOT NULL CHECK (budget >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founder_campaigns_user
ON public.founder_campaigns (user_id, workspace_id);

COMMENT ON TABLE public.founder_campaigns IS 'Marketing campaigns, channel selections, price points, and allocated budget tests.';

-- 6. Simulation Runs & Outcomes
CREATE TABLE IF NOT EXISTS public.founder_simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.founder_campaigns(id) ON DELETE SET NULL,
    run_number INT NOT NULL,
    startup_name TEXT NOT NULL,
    customer_group_name TEXT NOT NULL,
    channel TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    budget NUMERIC NOT NULL CHECK (budget >= 0),
    -- Simulated outcomes (all explicitly labeled as simulated)
    simulated_impressions INT NOT NULL CHECK (simulated_impressions >= 0),
    simulated_clicks INT NOT NULL CHECK (simulated_clicks >= 0),
    simulated_installs INT NOT NULL CHECK (simulated_installs >= 0),
    simulated_paid_users INT NOT NULL CHECK (simulated_paid_users >= 0),
    simulated_revenue NUMERIC NOT NULL,
    simulated_net_profit NUMERIC NOT NULL,
    simulated_avg_rating NUMERIC NOT NULL CHECK (simulated_avg_rating >= 1.0 AND simulated_avg_rating <= 5.0),
    simulated_reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version TEXT NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_runs_user_created 
ON public.founder_simulation_runs (user_id, created_at DESC);

COMMENT ON TABLE public.founder_simulation_runs IS 'Auditable history of simulated launch experiments, connecting founder inputs with simulated outputs.';

-- 7. Simulation Events (District Activity Timeline)
CREATE TABLE IF NOT EXISTS public.founder_simulation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_run_id UUID NOT NULL REFERENCES public.founder_simulation_runs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    step_day INT NOT NULL CHECK (step_day >= 0),
    district TEXT NOT NULL, -- e.g., 'marketing_channels', 'customer_communities', 'marketplace', 'feedback_agora', 'competitors', 'founder_hq'
    event_type TEXT NOT NULL, -- e.g., 'campaign_broadcast', 'community_discussion', 'store_checkout', 'customer_review', 'competitor_pricing'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metrics_delta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_events_run
ON public.founder_simulation_events (simulation_run_id, step_day ASC);

CREATE INDEX IF NOT EXISTS idx_sim_events_user
ON public.founder_simulation_events (user_id, workspace_id);

COMMENT ON TABLE public.founder_simulation_events IS 'Discrete chronological events generated across virtual world districts during simulation runs.';

-- 8. Simulation Evidence (Market Indicators & Model Assumptions Audit)
CREATE TABLE IF NOT EXISTS public.simulation_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_run_id UUID NOT NULL REFERENCES public.founder_simulation_runs(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.founder_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    indicator_code TEXT REFERENCES public.market_indicators(id) ON UPDATE CASCADE ON DELETE SET NULL,
    indicator_name TEXT NOT NULL,
    indicator_value NUMERIC NULL,
    indicator_unit TEXT,
    reference_year INT,
    country_code VARCHAR(3),
    assumption_type TEXT NOT NULL, -- e.g., 'macro_market_context', 'founder_hypothesis', 'channel_benchmark', 'pricing_elasticity'
    assumption_key TEXT NOT NULL,
    assumption_value TEXT NOT NULL,
    formula_applied TEXT,
    disclaimer TEXT NOT NULL DEFAULT 'Simulated educational model output. Background macroeconomic indicators provide national context, not microeconomic purchasing intent or sales guarantees.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_evidence_run
ON public.simulation_evidence (simulation_run_id);

CREATE INDEX IF NOT EXISTS idx_sim_evidence_user
ON public.simulation_evidence (user_id, workspace_id);

COMMENT ON TABLE public.simulation_evidence IS 'Exact market indicators, baseline assumptions, and formulas applied to produce simulation outcomes.';

-- ==============================================================================
-- 9. Row Level Security (RLS) Configuration - Strict Multi-Tenant Isolation
-- ==============================================================================

-- Enable RLS on all founder tables
ALTER TABLE public.founder_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_competitor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_evidence ENABLE ROW LEVEL SECURITY;

-- 1. Workspace Isolation
CREATE POLICY "Founders can only access their own workspace"
ON public.founder_workspaces
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Startup Profiles Isolation
CREATE POLICY "Founders can only access their own startups"
ON public.founder_startups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Customer Groups Isolation
CREATE POLICY "Founders can only access their own customer groups"
ON public.founder_customer_groups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Competitor Notes Isolation
CREATE POLICY "Founders can only access their own competitor notes"
ON public.founder_competitor_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Campaigns Isolation
CREATE POLICY "Founders can only access their own campaigns"
ON public.founder_campaigns
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Simulation Runs Isolation
CREATE POLICY "Founders can only access their own simulation runs"
ON public.founder_simulation_runs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. Simulation Events Isolation
CREATE POLICY "Founders can only access their own simulation events"
ON public.founder_simulation_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Simulation Evidence Isolation
CREATE POLICY "Founders can only access their own simulation evidence"
ON public.simulation_evidence
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
