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
DROP POLICY IF EXISTS "Public read access for market data sources" ON public.market_data_sources;
CREATE POLICY "Public read access for market data sources"
ON public.market_data_sources
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public read access for market indicators" ON public.market_indicators;
CREATE POLICY "Public read access for market indicators"
ON public.market_indicators
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public read access for country observations" ON public.country_observations;
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
