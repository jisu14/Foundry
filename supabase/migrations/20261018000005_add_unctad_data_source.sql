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
