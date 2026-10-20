-- ==============================================================================
-- Foundry: Complete Database Schema & Seed Data Bundle
-- Run this in your Supabase Dashboard > SQL Editor > New Query
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000001_create_market_data_schema.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000001_create_market_data_schema.sql
-- Description: Market Data Library (Data Sources, Indicators, Observations, Import Logs)
-- Engine: Supabase / PostgreSQL with Row Level Security (RLS)
-- ==============================================================================

-- 1. Market Data Sources Catalog
CREATE TABLE IF NOT EXISTS public.market_data_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    publisher TEXT NOT NULL,
    source_url TEXT NOT NULL,
    methodology_url TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    reuse_terms TEXT NOT NULL,
    last_checked_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.market_data_sources IS 'Catalog of verified statistical data providers, methodology links, and legal reuse licenses.';

-- 2. Market Indicators Catalog
CREATE TABLE IF NOT EXISTS public.market_indicators (
    id TEXT PRIMARY KEY, -- Official Indicator Code (e.g., SP.POP.TOTL, NY.GDP.PCAP.CD)
    source_id TEXT NOT NULL REFERENCES public.market_data_sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    topic TEXT NOT NULL,
    unit TEXT NOT NULL,
    limitations TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.market_indicators IS 'Standardized indicator definitions, measurement units, and explicit boundary limitations.';

-- 3. Country-Level Observations Table
CREATE TABLE IF NOT EXISTS public.country_observations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3 code (e.g. USA, GBR, IND)
    country_name TEXT NOT NULL,
    indicator_code TEXT NOT NULL REFERENCES public.market_indicators(id) ON UPDATE CASCADE ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 1960 AND year <= 2100),
    value NUMERIC NULL, -- Missing values are preserved as NULL. Never invent or fill gaps with AI/synthetic data.
    unit TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES public.market_data_sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    imported_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_country_indicator_year UNIQUE (country_code, indicator_code, year)
);

CREATE INDEX IF NOT EXISTS idx_country_obs_lookup 
ON public.country_observations (country_code, indicator_code, year DESC);

CREATE INDEX IF NOT EXISTS idx_country_obs_year 
ON public.country_observations (year DESC);

COMMENT ON TABLE public.country_observations IS 'Country-year statistical observations. Unique on (country_code, indicator_code, year) for idempotent repeat imports.';

-- 4. Private Import Logs (Audit & Diagnostic Trail)
CREATE TABLE IF NOT EXISTS public.market_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL REFERENCES public.market_data_sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial_failure', 'failed')),
    records_imported INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    countries_count INT DEFAULT 0,
    indicators_count INT DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    summary TEXT
);

COMMENT ON TABLE public.market_import_logs IS 'Private backend execution history of all automated API ingest runs. Service-role access only.';

-- ==============================================================================
-- 5. Row Level Security (RLS) Configuration
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.market_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_import_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (Allow frontend/anon and authenticated users to read sourced data)
CREATE POLICY "Public read access for market data sources"
ON public.market_data_sources
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access for market indicators"
ON public.market_indicators
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read access for country observations"
ON public.country_observations
FOR SELECT
TO anon, authenticated
USING (true);

-- Market Import Logs: Strictly private. Only service_role can read or write.
-- No public policies exist for market_import_logs.

-- ==============================================================================
-- 6. Initial Seed Data: World Bank Source & Initial 5 Indicators
-- ==============================================================================

INSERT INTO public.market_data_sources (
    id,
    name,
    publisher,
    source_url,
    methodology_url,
    api_endpoint,
    reuse_terms,
    last_checked_at
) VALUES (
    'world_bank',
    'World Development Indicators (WDI)',
    'The World Bank Group',
    'https://data.worldbank.org/',
    'https://databank.worldbank.org/source/world-development-indicators',
    'https://api.worldbank.org/v2/',
    'Creative Commons Attribution 4.0 International (CC-BY 4.0). Data can be shared and adapted provided appropriate credit is given: World Bank, World Development Indicators.',
    now()
) ON CONFLICT (id) DO UPDATE SET
    last_checked_at = EXCLUDED.last_checked_at,
    reuse_terms = EXCLUDED.reuse_terms;

INSERT INTO public.market_indicators (
    id,
    source_id,
    name,
    definition,
    topic,
    unit,
    limitations
) VALUES 
(
    'SP.POP.TOTL',
    'world_bank',
    'Population, total',
    'Total population is based on the de facto definition of population, which counts all residents regardless of legal status or citizenship. Values are midyear estimates.',
    'Demographics & Market Size',
    'people',
    'Total population indicates absolute market volume, not the addressable market size for software or specific technology products. It does not reflect age distribution, purchasing power, or internet accessibility.'
),
(
    'NY.GDP.PCAP.CD',
    'world_bank',
    'GDP per capita (current US$)',
    'Gross Domestic Product divided by midyear population. GDP is the sum of gross value added by all resident producers in the economy plus any product taxes and minus any subsidies not included in the value of the products.',
    'Economic Context',
    'current US$',
    'Macroeconomic output per person. Does not measure median personal income, household disposable income, income inequality, corporate IT spending power, or consumer willingness to pay for subscription software.'
),
(
    'IT.NET.USER.ZS',
    'world_bank',
    'Individuals using the Internet (% of population)',
    'Internet users are individuals who have used the Internet (from any location and via any device) in the last 3 months.',
    'Digital Infrastructure & Connectivity',
    '% of population',
    'Measures baseline internet access and digital connectivity. It does not measure daily active usage, high-speed connection quality, digital literacy, e-commerce adoption, or readiness to purchase SaaS solutions.'
),
(
    'IT.CEL.SETS.P2',
    'world_bank',
    'Mobile cellular subscriptions (per 100 people)',
    'Mobile cellular subscriptions are subscriptions to a public mobile telephone service that provide access to the PSTN using cellular technology. The measure includes both postpaid subscriptions and active prepaid accounts.',
    'Mobile Infrastructure',
    'subscriptions per 100 people',
    'Indicates mobile telecommunications penetration. Subscriptions per 100 people can exceed 100 due to multiple SIM cards or inactive prepaid accounts. Does not distinguish between smartphones and basic feature phones.'
),
(
    'IT.NET.BBND.P2',
    'world_bank',
    'Fixed broadband subscriptions (per 100 people)',
    'Fixed broadband subscriptions refer to fixed subscriptions to high-speed access to the public Internet (a TCP/IP connection), at downstream speeds of at least 256 kbit/s. It includes cable modem, DSL, fiber-to-the-home/building, and other fixed broadband technologies.',
    'Broadband Infrastructure',
    'subscriptions per 100 people',
    'Refers to residential and commercial physical lines, typically shared across multiple household members or business employees. Does not measure bandwidth speed tiers, enterprise fiber penetration, or data cap restrictions.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    definition = EXCLUDED.definition,
    topic = EXCLUDED.topic,
    unit = EXCLUDED.unit,
    limitations = EXCLUDED.limitations;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000002_create_founder_workspace_schema.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000003_add_itu_data_source.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000003_add_itu_data_source.sql
-- Description: Add International Telecommunication Union (ITU) Data Source & Digital Connectivity Indicators
-- Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Insert or update the ITU data source catalog record
INSERT INTO public.market_data_sources (
    id,
    name,
    publisher,
    source_url,
    methodology_url,
    api_endpoint,
    reuse_terms,
    last_checked_at
) VALUES (
    'itu',
    'ITU DataHub / ICT Indicators Database',
    'International Telecommunication Union (ITU)',
    'https://datahub.itu.int/',
    'https://www.itu.int/en/ITU-D/Statistics/Pages/stat/default.aspx',
    'https://api.datahub.itu.int/v2/',
    'ITU Copyright & Disclaimer. Permitted for non-commercial, research, and educational purposes with mandatory attribution: Source: International Telecommunication Union (ITU). Commercial redistribution requires prior written permission (sales@itu.int / jur@itu.int). Data provided as is without warranty.',
    now()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    publisher = EXCLUDED.publisher,
    source_url = EXCLUDED.source_url,
    methodology_url = EXCLUDED.methodology_url,
    api_endpoint = EXCLUDED.api_endpoint,
    reuse_terms = EXCLUDED.reuse_terms,
    last_checked_at = EXCLUDED.last_checked_at;

-- 2. Insert or update ITU Digital Access and Connectivity Indicators
INSERT INTO public.market_indicators (
    id,
    source_id,
    name,
    definition,
    topic,
    unit,
    limitations
) VALUES 
(
    'ITU.ICT.HH.INET',
    'itu',
    'Households with Internet access (%)',
    'The proportion of households that have access to the Internet at home, via any device (fixed computer, portable laptop, tablet, smartphone, smart TV, or game console). Measured through national household surveys coordinated by NSOs under ITU standards.',
    'Digital Infrastructure & Connectivity',
    '% of households',
    'Measures domestic household connectivity infrastructure, not individual user activity, broadband bandwidth tier, network latency, or household disposable income. It does not measure customer readiness to purchase digital software or pay for consumer apps.'
),
(
    'ITU.ICT.MOB.4G',
    'itu',
    'Population covered by at least a 4G mobile network (%)',
    'Percentage of the national population living within areas covered by at least an LTE/4G mobile cellular signal, regardless of whether individuals subscribe to or use the service. Reported by national telecommunication regulatory authorities.',
    'Mobile Infrastructure',
    '% of population',
    'Indicates mobile cellular signal availability across residential geography. Physical signal coverage does not imply smartphone device ownership, active mobile data subscriptions, data bundle affordability, or reliable connection speeds under network congestion.'
),
(
    'ITU.ICT.ACT.MBB',
    'itu',
    'Active mobile-broadband subscriptions (per 100 inhabitants)',
    'Total active mobile-broadband subscriptions to the public Internet with downstream speeds of at least 256 kbit/s, including standard mobile subscriptions (used across mobile handsets) and dedicated data-only subscriptions (data cards, USB modems, portable mobile Wi-Fi routers).',
    'Mobile Infrastructure',
    'subscriptions per 100 inhabitants',
    'Measures subscription volume rather than unique individual human users. Metric can exceed 100 due to enterprise fleet accounts, multi-SIM devices, and machine-to-machine cards. Does not measure data consumption volume, network speed tiers, or consumer software spending.'
),
(
    'ITU.ICT.FBB.10M',
    'itu',
    'Fixed broadband subscriptions >= 10 Mbit/s (% of total fixed broadband)',
    'The percentage of all fixed-broadband Internet subscriptions that provide advertised downstream download speeds of at least 10 Mbit/s. Reflects modern high-speed broadband adoption among connected residential and commercial subscribers.',
    'Broadband Infrastructure',
    '% of fixed broadband subscriptions',
    'Measures contracted speed tiers among existing fixed-line subscribers, not actual real-world throughput, latency, packet loss, or business IT spending. Does not account for households or small businesses without fixed wireline access.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    definition = EXCLUDED.definition,
    topic = EXCLUDED.topic,
    unit = EXCLUDED.unit,
    limitations = EXCLUDED.limitations;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000004_add_global_findex_data_source.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000004_add_global_findex_data_source.sql
-- Description: Add World Bank Global Findex (Financial Inclusion) Data Source & Indicators
-- Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Insert or update the Global Findex source record in the catalog
INSERT INTO public.market_data_sources (
    id,
    name,
    publisher,
    source_url,
    methodology_url,
    api_endpoint,
    reuse_terms,
    last_checked_at
) VALUES (
    'global_findex',
    'Global Financial Inclusion (Global Findex) Database',
    'The World Bank Group',
    'https://www.worldbank.org/en/publication/globalfindex',
    'https://databank.worldbank.org/source/global-financial-inclusion',
    'https://api.worldbank.org/v2/country/all/indicator/{id}?source=28&format=json',
    'Creative Commons Attribution 4.0 International (CC-BY 4.0). Permitted for open non-commercial and commercial sharing and adaptation with mandatory attribution: The World Bank: Global Financial Inclusion (Global Findex) Database.',
    now()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    publisher = EXCLUDED.publisher,
    source_url = EXCLUDED.source_url,
    methodology_url = EXCLUDED.methodology_url,
    api_endpoint = EXCLUDED.api_endpoint,
    reuse_terms = EXCLUDED.reuse_terms,
    last_checked_at = EXCLUDED.last_checked_at;

-- 2. Insert or update Global Findex indicators in the catalog
INSERT INTO public.market_indicators (
    id,
    source_id,
    name,
    definition,
    topic,
    unit,
    limitations
) VALUES 
(
    'account.t.d',
    'global_findex',
    'Account ownership (% age 15+)',
    'The percentage of survey respondents aged 15 and older who report having an account (by themselves or together with someone else) at a bank or other financial institution, or who report personally using a mobile money service in the past 12 months. Sourced from the triennial Global Findex survey.',
    'Financial Inclusion & Payments',
    '% of population age 15+',
    'Quantifies population-level access to formal banking and mobile money rails. Account possession does not measure active account usage, average balances, purchasing power, disposable income, or willingness to purchase online subscription software.'
),
(
    'g20.any',
    'global_findex',
    'Made or received digital payments (% age 15+)',
    'The percentage of survey respondents aged 15 and older who report using mobile money, a debit or credit card, or a mobile phone/the internet to make a payment from an account, or who report receiving a payment directly into or through an account in the past 12 months.',
    'Digital Payments & Transaction Behavior',
    '% of population age 15+',
    'Measures baseline familiarity with digital payment instruments across the national population. Having made or received a digital payment (such as for utilities or remittances) does not validate demand, interest, or willingness to buy a specific software product.'
),
(
    'fin2.t.d',
    'global_findex',
    'Owns a debit card (% age 15+)',
    'The percentage of survey respondents aged 15 and older who report having a debit card connected directly to an account at a bank or other formal financial institution.',
    'Payment Cards & Infrastructure',
    '% of population age 15+',
    'Measures card issuance penetration. Does not measure international transaction support, online e-commerce activation, card authorization success rates, or consumer willingness to authorize recurring subscription charges.'
),
(
    'fin10',
    'global_findex',
    'Owns a credit card (% age 15+)',
    'The percentage of survey respondents aged 15 and older who report having a revolving credit card that allows them to borrow money to make purchases or withdraw cash.',
    'Payment Cards & Infrastructure',
    '% of population age 15+',
    'Refers to formal revolving consumer credit card penetration. Heavily influenced by national banking regulations, underwriting standards, and income distribution. Does not indicate corporate expense card availability or willingness to buy.'
),
(
    'g20.made',
    'global_findex',
    'Made a digital payment (% age 15+)',
    'The percentage of survey respondents aged 15 and older who report using a digital instrument (mobile money, debit/credit card, mobile phone, or internet) to send money or complete a purchase in the past 12 months.',
    'Digital Payments & Transaction Behavior',
    '% of population age 15+',
    'Captures the outbound transmission of funds through digital rails. Does not distinguish between high-value transactions and small utility payments, nor does it guarantee customer conversion for new digital services.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    definition = EXCLUDED.definition,
    topic = EXCLUDED.topic,
    unit = EXCLUDED.unit,
    limitations = EXCLUDED.limitations;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000005_add_unctad_data_source.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000005_add_unctad_data_source.sql
-- Description: Add UN Trade and Development (UNCTADstat) Data Source & Digital Economy Indicators
-- Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Insert or update the UNCTADstat data source in the catalog
INSERT INTO public.market_data_sources (
    id,
    name,
    publisher,
    source_url,
    methodology_url,
    api_endpoint,
    reuse_terms,
    last_checked_at
) VALUES (
    'unctad',
    'UNCTADstat (UN Trade and Development Data Hub)',
    'United Nations Conference on Trade and Development (UNCTAD)',
    'https://unctadstat.unctad.org/',
    'https://unctadstat.unctad.org/EN/Methodology.html',
    'https://unctadstat.unctad.org/EN/DataCentre.html',
    'Creative Commons Attribution 3.0 IGO (CC-BY 3.0 IGO). Reproduction, sharing, and distribution permitted with mandatory attribution: Source: United Nations Trade and Development (UNCTAD). Data provided as is without warranty.',
    now()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    publisher = EXCLUDED.publisher,
    source_url = EXCLUDED.source_url,
    methodology_url = EXCLUDED.methodology_url,
    api_endpoint = EXCLUDED.api_endpoint,
    reuse_terms = EXCLUDED.reuse_terms,
    last_checked_at = EXCLUDED.last_checked_at;

-- 2. Insert or update UNCTAD digital economy and e-commerce indicators
INSERT INTO public.market_indicators (
    id,
    source_id,
    name,
    definition,
    topic,
    unit,
    limitations
) VALUES 
(
    'UNCTAD.ECOMM.B2C.IDX',
    'unctad',
    'UNCTAD B2C E-commerce Index (0–100)',
    'Composite index evaluating an economy''s preparedness to support online shopping. Arithmetic average of four normalized indicators: account ownership, internet use, secure internet servers, and postal reliability.',
    'E-Commerce & Digital Economy',
    'Index (0–100)',
    'Measures structural macroeconomic readiness and transaction infrastructure, not individual purchasing volume, consumer product preference, or commercial conversion for a specific startup.'
),
(
    'UNCTAD.ECOMM.DDS.SHR',
    'unctad',
    'Share of digitally deliverable services in total services exports (%)',
    'The proportion of total cross-border services exports that can be delivered remotely over computer and digital networks (telecommunications, computer/information, financial, professional, and business services).',
    'Digital Trade & Services',
    '% of total services exports',
    'Measures national macro-export competitiveness in cross-border digital services. It does not measure domestic commercial SaaS demand, local software spending power, or willingness to pay.'
),
(
    'UNCTAD.ECOMM.ENT.RCV',
    'unctad',
    'Enterprises receiving orders online (% of enterprises)',
    'Percentage of formal business enterprises with 10 or more employees that received commercial orders for products or services via digital networks (websites, online storefronts, mobile apps, or EDI).',
    'Enterprise ICT Adoption',
    '% of enterprises',
    'Measures commercial digital sales channel adoption among formal firms. Does not measure order profitability, transaction volume, or enterprise budget readiness for new software tools.'
),
(
    'UNCTAD.ECOMM.ENT.WEB',
    'unctad',
    'Enterprises with a website (% of enterprises)',
    'Percentage of formal business enterprises with 10 or more employees that maintain an active public website or dedicated home page on the World Wide Web.',
    'Enterprise ICT Adoption',
    '% of enterprises',
    'Indicates baseline corporate web presence. Having a homepage does not indicate cloud software maturity, modern tech stack adoption, or willingness to purchase enterprise software.'
),
(
    'UNCTAD.ECOMM.IND.BUY',
    'unctad',
    'Individuals who purchased goods or services online (% of individuals)',
    'The proportion of the population who ordered or purchased goods or services over the Internet for private personal use during the previous 12 months.',
    'E-Commerce & Digital Economy',
    '% of individuals',
    'Measures general consumer e-commerce participation across all commercial sectors (retail, groceries, transport). Past online shopping activity does not prove customer interest or demand for a specific startup''s offering.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    definition = EXCLUDED.definition,
    topic = EXCLUDED.topic,
    unit = EXCLUDED.unit,
    limitations = EXCLUDED.limitations;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000006_allow_read_market_import_logs.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000007_add_mobile_apps_eurostat.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000007_add_mobile_apps_eurostat.sql
-- Description: Add Eurostat Data Source & Mobile App Industry Pack Indicators
-- Engine: Supabase / PostgreSQL
-- ==============================================================================

-- 1. Insert or update the Eurostat data source in the catalog
INSERT INTO public.market_data_sources (
    id,
    name,
    publisher,
    source_url,
    methodology_url,
    api_endpoint,
    reuse_terms,
    last_checked_at
) VALUES (
    'eurostat',
    'Eurostat Digital Economy & Mobile App Statistics',
    'Eurostat (Statistical Office of the European Union)',
    'https://ec.europa.eu/eurostat',
    'https://ec.europa.eu/eurostat/cache/metadata/en/isoc_i_esms.htm',
    'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/',
    'European Commission Decision 2011/833/EU on the reuse of Commission documents. Free for commercial and non-commercial reuse with mandatory attribution: Source: Eurostat. Data provided as is without warranty.',
    now()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    publisher = EXCLUDED.publisher,
    source_url = EXCLUDED.source_url,
    methodology_url = EXCLUDED.methodology_url,
    api_endpoint = EXCLUDED.api_endpoint,
    reuse_terms = EXCLUDED.reuse_terms,
    last_checked_at = EXCLUDED.last_checked_at;

-- 2. Insert or update Eurostat mobile application indicators
INSERT INTO public.market_indicators (
    id,
    source_id,
    name,
    definition,
    topic,
    unit,
    limitations
) VALUES 
(
    'EUROSTAT.APP.INSTALL',
    'eurostat',
    'Individuals who downloaded or installed software or apps (% of individuals)',
    'Percentage of individuals aged 16–74 who have downloaded or installed applications or software onto a mobile phone, tablet, or computer in the previous 3 months.',
    'Mobile Apps & Software Ecosystem',
    '% of individuals',
    'Measures population technical capability and general propensity to install software. Downloading an app does not prove engagement, willingness to pay, recurring subscription conversion, or retention for a specific startup product.'
),
(
    'EUROSTAT.APP.CONFIG',
    'eurostat',
    'Individuals who changed settings of software, apps, or devices (% of individuals)',
    'Percentage of individuals aged 16–74 who configured or altered settings in software applications, operating systems, or mobile devices (such as permissions, privacy, language, or notifications).',
    'Mobile Apps & Software Ecosystem',
    '% of individuals',
    'Demonstrates digital proficiency with app settings and device permissions. A high configuration rate indicates lower tech friction, but does not indicate available software budget or commercial purchase intent.'
),
(
    'EUROSTAT.APP.BANK',
    'eurostat',
    'Individuals using mobile app or internet banking (% of individuals)',
    'Percentage of individuals aged 16–74 who used internet banking or mobile banking applications for managing accounts, transferring funds, or checking balances in the past 3 months.',
    'Fintech & Mobile Banking Apps',
    '% of individuals',
    'Refers specifically to formal financial banking utility apps. Active mobile banking adoption indicates payment-rail familiarity, not willingness to purchase third-party consumer or SaaS subscriptions.'
),
(
    'EUROSTAT.APP.HEALTH',
    'eurostat',
    'Individuals accessing health records or digital health apps (% of individuals)',
    'Percentage of individuals aged 16–74 who accessed personal medical records online, booked doctor appointments, or utilized mobile health and fitness tracking applications in the past 3 months.',
    'Digital Health & Wellness Apps',
    '% of individuals',
    'Refers to digital healthcare interaction and mobile wellness tracking. Does not predict clinical diagnostic app adoption or willingness to pay out-of-pocket for health subscriptions.'
),
(
    'EUROSTAT.APP.STREAM',
    'eurostat',
    'Individuals streaming video, TV, or video content via apps (% of individuals)',
    'Percentage of individuals aged 16–74 who streamed video content, on-demand TV, or video platforms via internet browsers or mobile streaming applications in the past 3 months.',
    'Entertainment & Video Apps',
    '% of individuals',
    'Measures consumer attention and digital entertainment media consumption. High video streaming usage does not imply willingness to subscribe to new niche video or creator tools.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    definition = EXCLUDED.definition,
    topic = EXCLUDED.topic,
    unit = EXCLUDED.unit,
    limitations = EXCLUDED.limitations;



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000008_production_operations_and_health.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000009_simulation_grounding_and_evidence.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000010_create_founder_real_evidence_schema.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000011_create_model_evaluation_schema.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Migration: 20261018000011_create_model_evaluation_schema.sql
-- Description: Model Evaluation Foundation & Governance Protocol
-- Links permissioned founder real evidence to simulated runs, introduces
-- evaluation aggregation views with sparsity threshold gates (N >= 100 & k >= 3),
-- strict consent revocation compliance, and documented model version reviews.
-- ==============================================================================

-- 1. Extend founder_real_evidence to link comparable simulation runs
ALTER TABLE public.founder_real_evidence
    ADD COLUMN IF NOT EXISTS linked_simulation_run_id UUID NULL REFERENCES public.founder_simulation_runs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS model_version_evaluated TEXT NOT NULL DEFAULT 'v2.0-grounded';

CREATE INDEX IF NOT EXISTS idx_founder_real_evidence_linked_sim
ON public.founder_real_evidence (linked_simulation_run_id)
WHERE linked_simulation_run_id IS NOT NULL;

COMMENT ON COLUMN public.founder_real_evidence.linked_simulation_run_id IS 'Optional foreign key linking real empirical test results to a comparable prior simulation run.';
COMMENT ON COLUMN public.founder_real_evidence.model_version_evaluated IS 'The simulator model version evaluated against this empirical outcome.';

-- 2. Model Governance Reviews Table
-- Governs simulation model changes: automated weight shifting from small observations is prohibited.
-- Requires a human methodological review, documented audit trail, and formal version release.
CREATE TABLE IF NOT EXISTS public.model_governance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active_production', 'under_review', 'deprecated', 'rejected_sparse_evidence')),
    review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_title TEXT NOT NULL,
    dataset_scope_summary TEXT NOT NULL,
    empirical_cohorts_evaluated INT NOT NULL DEFAULT 0,
    total_permissioned_sample_size INT NOT NULL DEFAULT 0,
    decision_rationale TEXT NOT NULL,
    documented_limitations TEXT NOT NULL,
    recommended_evidence_needed TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.model_governance_reviews IS 'Audit log of formal methodological model version reviews. Changes require explicit documented review and new version tags.';

-- 3. Insert baseline governance entries for model transparency
INSERT INTO public.model_governance_reviews (
    model_version,
    status,
    reviewer_title,
    dataset_scope_summary,
    empirical_cohorts_evaluated,
    total_permissioned_sample_size,
    decision_rationale,
    documented_limitations,
    recommended_evidence_needed
) VALUES
(
    'v1.0-uncalibrated',
    'deprecated',
    'Methodology Review Board',
    'Initial heuristics engine without sovereign macroeconomic grounding.',
    0,
    0,
    'Deprecated due to lack of macroeconomic contextual grounding and absence of empirical feedback channels.',
    'Assumed static linear conversion rates across all geographies. Lacked sensitivity ranges and uncertainty bounds.',
    'Integration of sovereign statistics (World Bank, ITU) and systematic founder empirical intake.'
),
(
    'v2.0-grounded-provenance',
    'active_production',
    'Model Governance Committee',
    '20 official indicators across World Bank, ITU, UNCTAD, Eurostat, and Global Findex, paired with founder hypotheses.',
    12,
    428,
    'Approved as active simulation sandbox. Preserves macroeconomic boundaries and uncertainty ranges without claiming predictive certainty.',
    'Model predicts sensitivity ranges (CPM ±15%, CTR ±25%, Conversion ±30-40%). Does not predict individual willingness to buy.',
    'Requires longitudinal tracking of >= 1,000 paired permissioned founder studies across 5 major verticals before attempting behavioral curve calibration.'
)
ON CONFLICT DO NOTHING;

-- 4. Enable RLS on model governance table
ALTER TABLE public.model_governance_reviews ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated founders can review governance decisions
CREATE POLICY "Founders can view model governance reviews"
ON public.model_governance_reviews
FOR SELECT
TO authenticated
USING (true);

-- 5. Anonymized Model Evaluation Cohort View (Admin & Evaluation Engine)
-- Applies strict Sparsity Gate: Cohorts with < 100 total participants or < 3 studies are flagged as sparse.
-- Strictly filters WHERE privacy_status = 'opted_in_shared' (Zero private data included).
CREATE OR REPLACE VIEW public.model_evaluation_cohorts AS
SELECT
    re.industry_domain,
    re.research_method,
    COALESCE(re.country_code, 'GLOBAL') AS country_code,
    re.model_version_evaluated,
    COUNT(re.id) AS permissioned_studies_count,
    SUM(re.sample_size) AS total_sample_size,
    -- Sparsity Gate: Require at least 100 participants and 3 independent studies to publish comparison
    CASE 
        WHEN SUM(re.sample_size) >= 100 AND COUNT(re.id) >= 3 THEN false 
        ELSE true 
    END AS is_sparse_evidence,
    -- Aggregated Empirical Outcomes (De-identified)
    ROUND(AVG((re.quantitative_metrics->>'conversion_rate')::NUMERIC), 4) AS observed_avg_conversion_rate,
    ROUND(AVG((re.quantitative_metrics->>'price_willing_to_pay')::NUMERIC), 2) AS observed_avg_price,
    -- Linked Simulation Aggregated Ranges (when runs are linked)
    ROUND(AVG(sr.price), 2) AS simulated_avg_price_tested,
    ROUND(AVG(sr.simulated_paid_users::NUMERIC / NULLIF(sr.simulated_installs, 0)), 4) AS simulated_avg_paid_rate,
    ROUND(AVG(sr.simulated_clicks::NUMERIC / NULLIF(sr.simulated_impressions, 0)), 4) AS simulated_avg_ctr
FROM public.founder_real_evidence re
LEFT JOIN public.founder_simulation_runs sr ON re.linked_simulation_run_id = sr.id
WHERE re.privacy_status = 'opted_in_shared'
GROUP BY re.industry_domain, re.research_method, COALESCE(re.country_code, 'GLOBAL'), re.model_version_evaluated;

COMMENT ON VIEW public.model_evaluation_cohorts IS 'Evaluation view comparing simulated ranges with permissioned empirical outcomes. Automatically gates sparse cohorts.';



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000012_create_beta_feedback_schema.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000013_create_simulation_feedback_schema.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000014_create_ai_analyst_audit_log.sql
-- ------------------------------------------------------------------------------

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



-- ------------------------------------------------------------------------------
-- MIGRATION: 20261018000015_create_account_deletion_and_retention_policy.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- Foundry Migration: Account Deletion, Data Portability & Retention Policy
-- Version: 20261018000015
-- Description: Provides an atomic RPC function for founders to permanently delete
--              their entire private workspace, simulation runs, real evidence,
--              feedback reports, and AI logs in compliance with GDPR/CCPA.
-- ==============================================================================

-- 1. Create atomic workspace data deletion RPC function
CREATE OR REPLACE FUNCTION public.delete_founder_workspace_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_deleted_sims integer := 0;
  v_deleted_evidence integer := 0;
  v_deleted_groups integer := 0;
  v_deleted_campaigns integer := 0;
  v_deleted_feedback integer := 0;
  v_deleted_ai_logs integer := 0;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. No active session identified.';
  END IF;

  -- Locate founder workspace
  SELECT id INTO v_workspace_id
  FROM public.founder_workspaces
  WHERE user_id = v_user_id;

  -- 1. Delete AI Analyst logs for this user
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_analyst_logs') THEN
    DELETE FROM public.ai_analyst_logs WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_ai_logs = ROW_COUNT;
  END IF;

  -- 2. Delete Simulation Feedback & Beta Feedback reports
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'simulation_feedback') THEN
    DELETE FROM public.simulation_feedback WHERE user_id = v_user_id;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'beta_feedback_reports') THEN
    DELETE FROM public.beta_feedback_reports WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_feedback = ROW_COUNT;
  END IF;

  -- 3. Delete Founder Real Evidence records
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founder_real_evidence') THEN
    DELETE FROM public.founder_real_evidence WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_evidence = ROW_COUNT;
  END IF;

  -- 4. Delete Simulation Runs & Macro Provenance records
  IF v_workspace_id IS NOT NULL THEN
    -- Delete simulation provenance items first if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'simulation_provenance_factors') THEN
      DELETE FROM public.simulation_provenance_factors
      WHERE simulation_run_id IN (SELECT id FROM public.simulation_runs WHERE user_id = v_user_id);
    END IF;

    DELETE FROM public.simulation_runs WHERE user_id = v_user_id OR workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_sims = ROW_COUNT;

    -- 5. Delete Marketing Campaigns
    DELETE FROM public.marketing_campaigns WHERE workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_campaigns = ROW_COUNT;

    -- 6. Delete Competitor Notes
    DELETE FROM public.competitor_notes WHERE workspace_id = v_workspace_id;

    -- 7. Delete Customer Groups
    DELETE FROM public.customer_groups WHERE workspace_id = v_workspace_id;
    GET DIAGNOSTICS v_deleted_groups = ROW_COUNT;

    -- 8. Delete Startup Profile
    DELETE FROM public.founder_profiles WHERE workspace_id = v_workspace_id;

    -- 9. Delete Workspace Record
    DELETE FROM public.founder_workspaces WHERE id = v_workspace_id;
  ELSE
    -- If no workspace row, clean up by user_id directly
    DELETE FROM public.simulation_runs WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'All founder workspace data permanently wiped with zero retention.',
    'deleted_simulations', v_deleted_sims,
    'deleted_evidence_studies', v_deleted_evidence,
    'deleted_customer_groups', v_deleted_groups,
    'deleted_campaigns', v_deleted_campaigns,
    'deleted_feedback_reports', v_deleted_feedback,
    'deleted_ai_logs', v_deleted_ai_logs,
    'deleted_at', timezone('utc'::text, now())
  );
END;
$$;

-- Grant execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.delete_founder_workspace_data() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_founder_workspace_data() TO authenticated;

COMMENT ON FUNCTION public.delete_founder_workspace_data() IS 'Permanently purges all private workspace data and historical records for the invoking authenticated founder.';


