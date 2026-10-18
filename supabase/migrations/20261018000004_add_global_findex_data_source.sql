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
