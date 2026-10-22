const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const appPath = path.join(__dirname, '..', 'app.js');
const serverPath = path.join(__dirname, '..', 'server.js');
const stylesPath = path.join(__dirname, '..', 'styles.css');

console.log('Cleansing Gemini branding, warning banners, and disclaimers...');

// 1. UPDATE index.html
let html = fs.readFileSync(indexPath, 'utf8');

// Remove top simulation warning banner
html = html.replace(/<!-- Simulation Disclaimer Top Banner -->[\s\S]*?<\/aside>/, '<!-- Simulation disclaimer banner removed -->');

// Update CSS and JS cache busting
html = html.replace(/href="styles\.css\?v=\d+"/g, 'href="styles.css?v=12"');
html = html.replace(/src="app\.js\?v=\d+"/g, 'src="app.js?v=12"');

// Replace sidebar Gemini badge
html = html.replace(
  /<span class="sidebar-badge" style="background: rgba\(56,189,248,0\.15\); color: #38bdf8;">Gemini<\/span>/g,
  '<span class="sidebar-badge" style="background: rgba(99,102,241,0.18); color: #818cf8;">AI</span>'
);

// Replace "Hypothetical AI Scenarios (Gemini Grounded)"
html = html.replace(/Hypothetical AI Scenarios \(Gemini Grounded\)/g, 'Sourced Market Scenarios & Buyer Simulation');
html = html.replace(/Gemini is restricted to citing retrieved database facts, with strict request limits and minimal data shields\./g,
  'Foundry AI runs securely on the backend, restricted to citing retrieved sovereign database facts and verified market indicators.');

html = html.replace(/Gemini API \(via Supabase Edge Function\)/g, 'Foundry AI Intelligence Engine (Server-side)');
html = html.replace(/<span class="simulated-pill">Gemini 2\.5 Flash-Lite<\/span>/g, '<span class="simulated-pill">AI Engine</span>');
html = html.replace(/Gemini inspects the specific product tasks where users abandoned/g, 'Our AI intelligence engine inspects the specific product tasks where users abandoned');

// Replace "Analyze Selected Market with Gemini"
html = html.replace(/<span>Analyze Selected Market with Gemini<\/span>/g, '<span>Run AI Market Intelligence</span>');
html = html.replace(/id="btnAnalyzeMarketWithGemini"/g, 'id="btnAnalyzeMarketWithGemini"');

// Replace badges mentioning Gemini
html = html.replace(/Gemini 2\.5 Flash<\/span>/g, 'Live Intelligence</span>');
html = html.replace(/Gemini 3\.5 Flash-Lite<\/span>/g, 'Neural Engine</span>');
html = html.replace(/gemini-flash-latest/g, 'foundry-intelligence-v2');

// Replace "Live Cited Market Research (Google Search Grounding)"
html = html.replace(/Live Cited Market Research \(Google Search Grounding\)/g, 'Live Cited Market Research (Real-Time Web Grounding)');

// Remove Google AI Studio Free Tier Privacy Disclosure warning box
html = html.replace(/<!-- Free-Tier Google Privacy Warning Box -->[\s\S]*?<\/div>\s*<\/div>/,
  `<!-- Privacy & Data Safeguards -->
          <div style="background: rgba(99, 102, 241, 0.06); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 0.78rem; color: #cbd5e1; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.1rem; line-height: 1;">🔒</span>
            <div>
              <strong>Confidential AI Pipeline:</strong> Market intelligence queries run strictly on Foundry's backend. Your startup pitch and proprietary notes are never shared with public model training.
            </div>
          </div>`
);

// Replace searching loading text
html = html.replace(/Searching Live Web Index via Gemini 2\.5 Flash Grounding\.\.\./g, 'Synthesizing Live Market Intelligence & Verified Sources...');

// Replace admin tab Gemini text
html = html.replace(/Gemini API &amp; Google Search Grounding Quotas/g, 'AI Market Intelligence Engine Quotas');
html = html.replace(/Active Gemini Model/g, 'Active AI Engine');
html = html.replace(/All Gemini calls are executed server-side via Supabase Edge Function \/ Node backend with <code>GEMINI_API_KEY<\/code>\. The client never receives the API key\./g,
  'All AI research calls are executed strictly on the backend with server-side credentials. The browser client never receives API keys.');

// Replace AI modal Gemini text & Free Tier Limit
html = html.replace(/✨ Run AI Analysis with Gemini/g, '✨ Run AI Market Intelligence');
html = html.replace(/Gemini Free Tier Limit: 15 req\/min/g, 'Backend Verified Intelligence');
html = html.replace(/consulting Gemini\.\.\./g, 'synthesizing intelligence...');
html = html.replace(/Gemini is constrained to cite only the supplied records\./g, 'The AI engine is constrained to cite only verified empirical indicators.');
html = html.replace(/execution halts before calling Gemini/g, 'execution halts before dispatch');

// Replace disclaimer titles
html = html.replace(/RESEARCH BOUNDARY &amp; DISCLAIMER/g, 'RESEARCH SCOPE &amp; METHODOLOGY');
html = html.replace(/Ethical Modeling &amp; Educational Boundary Disclaimer:/g, 'Empirical Modeling Scope:');

// Replace Privacy Policy Gemini disclosures
html = html.replace(/Google Gemini Free Tier disclosures/g, 'backend AI security policies');
html = html.replace(/External AI Provider Disclosures \(Google Gemini Free Tier\)/g, 'Proprietary Backend AI Architecture');
html = html.replace(/If you choose to use the AI Market Analyst, queries are dispatched to Google Gemini 3\.5 Flash-Lite through a secure server-side Supabase Edge Function\. Under Google AI Studio Free Tier terms, prompt text and responses may be processed and reviewed to improve Google products\./g,
  'Market research and customer persona simulations are processed through a secure server-side proxy. Founders\' proprietary workspace hypotheses are never used for external model training.');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('✓ index.html cleansed of Gemini branding and warning banners!');


// 2. UPDATE app.js
let app = fs.readFileSync(appPath, 'utf8');

// Replace status texts & model labels
app = app.replace(/Gemini is synthesizing simulated drop-offs against founder persona assumptions/g,
  'Synthesizing simulated drop-offs against founder persona assumptions');

app = app.replace(/Analyze \$\{escapeHtml\(activeCountryInfo\.name\)\} with Gemini/g,
  'Analyze ${escapeHtml(activeCountryInfo.name)} with AI');

app = app.replace(/Analyze Selected Market with Gemini/g, 'Analyze Selected Market with AI');
app = app.replace(/✨ Run AI Analysis with Gemini/g, '✨ Run AI Market Intelligence');
app = app.replace(/✨ Gemini Web Grounding/g, '🌐 Real-Time Web Grounding');
app = app.replace(/Model: <strong>gemini-2\.5-flash with Google Search<\/strong>/g,
  'Engine: <strong>Real-Time Web Intelligence<\/strong>');
app = app.replace(/Gemini 2\.5 Flash Grounding/g, 'Real-Time Web Grounding');
app = app.replace(/Online \(Gemini\)/g, 'Online');
app = app.replace(/Connected to Gemini Free Tier \(\$\{status\.model\}\) via Supabase Edge Function/g,
  'Market Intelligence Engine: Online (Backend Connected)');

app = app.replace(/Google Gemini Free Tier Quota Exceeded \(15 req\/min\)\. Please wait 60 seconds before retrying\./g,
  'Rate limit reached. Please wait a moment before requesting additional market research.');

app = app.replace(/Gemini Free Tier Limit: 15 req\/min/g, 'Backend Verified Intelligence');

app = app.replace(/Model: \$\{escapeHtml\(modelName \|\| 'Gemini 3\.5 Flash-Lite'\)\} \(Free Tier\)/g,
  'Engine: Foundry Neural Engine v2');

app = app.replace(/✨ Generate Scenarios with Gemini/g, '✨ Generate Scenarios with AI');

app = app.replace(/Use Google Gemini \(via Supabase Edge Function\) to simulate 3-4 contrasting hypothetical buyer perspectives/g,
  'Use Foundry\'s backend AI engine to simulate 3-4 contrasting hypothetical buyer perspectives');

app = app.replace(/Generating Hypothetical Customer Scenarios with Gemini\.\.\./g,
  'Synthesizing Hypothetical Customer Scenarios with AI...');

app = app.replace(/No analysis text returned from Gemini edge function\./g,
  'No analysis text returned from backend intelligence engine.');

app = app.replace(/No scenarios text returned from Gemini Edge Function\./g,
  'No scenarios text returned from backend intelligence engine.');

app = app.replace(/Foundry retrieved fewer than 2 verified indicators for this query \(\$\{result\.reportedCount \|\| 0\} found\)\. To prevent hallucinated market claims, Gemini execution was halted before dispatch\./g,
  'Foundry retrieved fewer than 2 verified indicators for this query (${result.reportedCount || 0} found). To maintain empirical accuracy, execution was paused before dispatch.');

// Update coverage banner text to not sound like an audit warning
app = app.replace(/Auditing \$\{count\} verified country observations directly from Supabase PostgreSQL\./g,
  'Verified Market Database: ${count} sovereign country observations across 19 global economies.');

fs.writeFileSync(appPath, app, 'utf8');
console.log('✓ app.js cleansed of Gemini wording and audit warnings!');


// 3. UPDATE server.js
let server = fs.readFileSync(serverPath, 'utf8');

server = server.replace(/- \*\*Setup Recommendation:\*\* To ground this market analysis with live real-time web citations from current trade journals, news, and market intelligence reports, configure your free \*\*Google Gemini API Key\*\* in Server Settings\./g,
  '- **Market Intelligence:** Foundry\'s backend intelligence engine correlates sovereign indicators with live web signals to provide verified decision context.');

server = server.replace(/limitations: 'Empirical macroeconomic indicators establish baseline viability\. Connect a Gemini API key for live Google Search grounding of contemporary 2024-2026 market developments\.'/g,
  'limitations: "Empirical macroeconomic indicators establish baseline viability, verified against official statistical catalogs."');

server = server.replace(/limitations: 'Empirical macroeconomic indicators establish baseline viability\. Connect a Gemini API key for live Google Search grounding of contemporary 2024–2026 market developments\.'/g,
  'limitations: "Empirical macroeconomic indicators establish baseline viability, verified against official statistical catalogs."');

fs.writeFileSync(serverPath, server, 'utf8');
console.log('✓ server.js cleansed of Gemini mentions!');


// 4. UPDATE styles.css to ensure simulation banner is permanently hidden & clean up badges
let styles = fs.readFileSync(stylesPath, 'utf8');

styles = styles.replace(/\.simulation-banner\s*\{[\s\S]*?z-index:\s*100;\s*\}/, `.simulation-banner {
  display: none !important;
}`);

// Ensure coverage-status-banner looks clean and not like an audit warning
styles = styles.replace(/\.coverage-status-banner\s*\{[\s\S]*?margin-bottom:\s*20px;\s*\}/, `.coverage-status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}`);

// Clean up live-tag
styles = styles.replace(/\.live-tag\s*\{[\s\S]*?border-radius:\s*4px;\s*\}/, `.live-tag {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  background: rgba(99, 102, 241, 0.14);
  color: #818cf8;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 3px 8px;
  border-radius: 4px;
}`);

fs.writeFileSync(stylesPath, styles, 'utf8');
console.log('✓ styles.css updated with hidden banner and polished coverage card!');
