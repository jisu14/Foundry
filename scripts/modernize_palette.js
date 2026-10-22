const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, '..', 'styles.css');
const indexPath = path.join(__dirname, '..', 'index.html');

console.log('Running deep polish on styles.css and index.html...');

let styles = fs.readFileSync(stylesPath, 'utf8');

// Replace old greenish teal RGB with clean Sky Cyan RGB
styles = styles.replace(/45,\s*212,\s*191/g, '56, 189, 248');

// Replace #2dd4bf (teal) with #38bdf8 (sky cyan)
styles = styles.replace(/#2dd4bf/gi, '#38bdf8');

// Replace #14b8a6 with #0ea5e9
styles = styles.replace(/#14b8a6/gi, '#0ea5e9');

// Replace any remaining retro gamer / green glows
styles = styles.replace(/rgba\(163,\s*230,\s*53,\s*[\d\.]+\)/g, (match) => {
  return match.replace(/163,\s*230,\s*53/, '99, 102, 241');
});
styles = styles.replace(/rgba\(212,\s*249,\s*56,\s*[\d\.]+\)/g, (match) => {
  return match.replace(/212,\s*249,\s*56/, '99, 102, 241');
});

// Replace button font weights and card border styling
styles = styles.replace(/\.btn-outline-cyan\s*\{[\s\S]*?border:\s*1px solid rgba\(56,\s*189,\s*248,\s*0\.4\);\s*\}/, `.btn-outline-cyan {
  background: rgba(183, 223, 240, 0.05);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: var(--radius-md);
  font-weight: 500;
}`);

styles = fs.writeFileSync(stylesPath, styles, 'utf8');
console.log('✓ styles.css fully polished with Sky Cyan and Indigo accents!');
