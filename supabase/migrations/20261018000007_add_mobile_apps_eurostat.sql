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
