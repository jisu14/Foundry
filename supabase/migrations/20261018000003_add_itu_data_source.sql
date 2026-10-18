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
