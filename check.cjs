#!/usr/bin/env node
// Integrity checker for MEL ONE bilingual website build
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
console.log('\n=== MEL ONE Website Integrity Check ===\n');

// Page count
all &= check(`Total pages: ${htmlFiles.length} (expect 96)`, htmlFiles.length === 96);

// Home page content
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
all &= check('Homepage has hero title', /<h1>Carpenter Adelaide<br><span>Carpentry services for homes and businesses<\/span><\/h1>/.test(home));
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
all &= check('About page has company record', aboutPage.includes('<h2>Carpentry Company and Insurance Details</h2>') && aboutPage.includes('39 666 325 408'));

// No Chinese placeholders remaining
const chineseHomePath = path.join(root, 'zh', 'index.html');
const chineseHome = fs.existsSync(chineseHomePath) ? fs.readFileSync(chineseHomePath, 'utf8') : '';
all &= check('No Chinese placeholder text', !/全周期|待补充|待翻译|TODO/.test(home + chineseHome));
all &= check('English navigation offers Chinese service', /<nav\b[\s\S]*?href="\/zh\/"[^>]*>中文服务<\/a>[\s\S]*?<\/nav>/.test(home));
all &= check('Chinese homepage has translated service content', /<html[^>]*lang="zh-Hans"/.test(chineseHome) && /<h1[^>]*>[^<]*[\u3400-\u9fff]/.test(chineseHome) && /href="\/zh\/services\/"/.test(chineseHome));
all &= check('No old contact email', !home.includes('ellisservicesgroup9'));

// Sitemap
if (fs.existsSync(path.join(root, 'sitemap.xml'))) {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locMatches = sitemap.match(/<loc>/g) || [];
  all &= check(`Sitemap has ${locMatches.length} <loc> entries`, locMatches.length === 96 && !sitemap.includes('/404.html'));
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
  'restoration-maintenance', 'heritage-carpentry', 'decking-restoration-flooring',
  'door-window-repairs', 'skirting-board-installation-repairs', 'door-jamb-interior-trim',
  'timber-fencing-repairs-replacement', 'timber-gates-installation-repairs', 'renovation-carpentry',
  'fascia-eaves-repairs', 'weatherboard-repairs', 'subfloor-timber-repairs', 'accessibility-carpentry',
  'pergola-repairs', 'timber-stairs-handrails', 'cabinet-repairs'];
for (const slug of servicePages) {
  const sp = path.join(root, 'services', slug, 'index.html');
  all &= check(`Service page: ${slug}`, fs.existsSync(sp) && fs.readFileSync(sp, 'utf8').length > 500);
}

// Machine-readable public catalogues
const servicesCataloguePath = path.join(root, 'services.json');
if (fs.existsSync(servicesCataloguePath)) {
  try {
    const servicesCatalogue = JSON.parse(fs.readFileSync(servicesCataloguePath, 'utf8'));
    all &= check('services.json lists all 25 visible services', Array.isArray(servicesCatalogue.items) && servicesCatalogue.items.length === 25);
  } catch {
    all &= check('services.json is valid JSON', false);
  }
} else {
  all &= check('services.json exists', false);
}
all &= check('feed.json exists', fs.existsSync(path.join(root, 'feed.json')));
all &= check('rss.xml exists', fs.existsSync(path.join(root, 'rss.xml')));

// Insights pages
const insightPages = ['why-integrated-carpentry-joinery', 'kitchen-renovation-cost-guide',
  'heritage-building-timber-restoration', 'timber-flooring-oiling-guide', 'commercial-fitout-process',
  'adelaide-deck-replacement-guide', 'adelaide-custom-wardrobe-planning', 'adelaide-heritage-timber-repairs',
  'adelaide-carpentry-cost-guide', 'outdoor-timber-selection-adelaide'];
for (const slug of insightPages) {
  const ip = path.join(root, 'insights', slug, 'index.html');
  all &= check(`Insight page: ${slug}`, fs.existsSync(ip) && fs.readFileSync(ip, 'utf8').length > 500);
}

console.log(`\n${all ? '✅ All checks passed!' : '❌ Some checks failed.'}\n`);
process.exit(all ? 0 : 1);
