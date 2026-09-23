#!/usr/bin/env node
// Integrity checker for Ellis Services Group website build
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'public');

function check(label, pass) {
  const icon = pass ? '✅' : '❌';
  console.log(`  ${icon} ${label}`);
  return pass;
}

const htmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'index.html') htmlFiles.push(full);
  }
}
walk(root);

let all = true;
console.log('\n=== Ellis Website Integrity Check ===\n');

// Page count
all &= check(`Total pages: ${htmlFiles.length} (expect 27)`, htmlFiles.length === 27);

// Home page content
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
all &= check('Homepage has hero title', home.includes('Full-Cycle Woodworking') || home.includes('full-spectrum') || home.includes('From Structure to Finish'));
all &= check('Homepage has nav', home.includes('<nav') || home.includes('nav-links'));
all &= check('Homepage has service cards', home.includes('choice-grid') && home.includes('Carpentry'));
all &= check('Homepage has footer', home.includes('footer'));

// Services page
const servicesPage = fs.readFileSync(path.join(root, 'services', 'index.html'), 'utf8');
all &= check('Services page exists', servicesPage.length > 500);

// FAQ page
const faqPage = fs.readFileSync(path.join(root, 'faq', 'index.html'), 'utf8');
all &= check('FAQ page has questions', faqPage.includes('<details') || faqPage.includes('question') || faqPage.includes('faq'));
all &= check('FAQ page has real contact email', faqPage.includes('handymanfelix'));

// Contact page
const contactPage = fs.readFileSync(path.join(root, 'contact', 'index.html'), 'utf8');
all &= check('Contact page has phone', contactPage.includes('0403 202 949') || contactPage.includes('0403'));
all &= check('Contact page has email', contactPage.includes('handymanfelix') || contactPage.includes('outlook.com'));
all &= check('Contact page has address', contactPage.includes('63 Pirie St'));

// About page
const aboutPage = fs.readFileSync(path.join(root, 'about', 'index.html'), 'utf8');
all &= check('About page has story', aboutPage.includes('Story') || aboutPage.includes('Founded') || aboutPage.includes('2011'));

// No Chinese placeholders remaining
all &= check('No Chinese placeholder text', !home.includes('全周期') && !home.includes('待补充') && !home.includes('阿德莱德'));
all &= check('No old contact email', !home.includes('ellisservicesgroup9'));

// Sitemap
if (fs.existsSync(path.join(root, 'sitemap.xml'))) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locMatches = sitemap.match(/<loc>/g) || [];
  all &= check(`Sitemap has ${locMatches.length} <loc> entries`, locMatches.length >= 23);
} else {
  all &= check('Sitemap exists', false);
}

// Robots.txt
if (fs.existsSync(path.join(root, 'robots.txt'))) {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  all &= check('robots.txt exists', robots.length > 0);
} else {
  all &= check('robots.txt exists', false);
}

// Assets
all &= check('base.css served', fs.existsSync(path.join(root, 'assets', 'base.css')));
all &= check('theme.css served', fs.existsSync(path.join(root, 'assets', 'theme.css')));
all &= check('hero-bg.jpg served', fs.existsSync(path.join(root, 'assets', 'hero-bg.jpg')));
all &= check('base.js served', fs.existsSync(path.join(root, 'assets', 'base.js')));

// No broken service detail pages
const servicePages = ['house-framing', 'outdoor-living', 'fix-out-second-fix',
  'formwork-carpentry', 'fitout-refurbishment', 'custom-kitchen-bathroom',
  'architectural-joinery', 'storage-solutions', 'custom-doors-furniture',
  'restoration-maintenance', 'heritage-carpentry', 'decking-restoration-flooring'];
for (const slug of servicePages) {
  const sp = path.join(root, 'services', slug, 'index.html');
  all &= check(`Service page: ${slug}`, fs.existsSync(sp) && fs.readFileSync(sp, 'utf8').length > 500);
}

// Insights pages
const insightPages = ['why-integrated-carpentry-joinery', 'kitchen-renovation-cost-guide',
  'heritage-building-timber-restoration', 'timber-flooring-oiling-guide', 'commercial-fitout-process',
  'adelaide-deck-replacement-guide', 'adelaide-custom-wardrobe-planning', 'adelaide-heritage-timber-repairs'];
for (const slug of insightPages) {
  const ip = path.join(root, 'insights', slug, 'index.html');
  all &= check(`Insight page: ${slug}`, fs.existsSync(ip) && fs.readFileSync(ip, 'utf8').length > 500);
}

console.log(`\n${all ? '✅ All checks passed!' : '❌ Some checks failed.'}\n`);
process.exit(all ? 0 : 1);
