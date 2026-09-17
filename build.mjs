#!/usr/bin/env node
/**
 * MEL ONE — Website Builder
 * Standalone: runs without xiaofan environment.
 *   node build.mjs           → outputs to ./public   (local preview)
 *   node build.mjs --docs    → outputs to ./docs     (GitHub Pages)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = __dirname;

// Detect deploy target: --docs for GitHub Pages, else local preview
const isDocs = process.argv.includes('--docs');
const siteDir = path.join(projectDir, isDocs ? 'docs' : 'public');
const contentPath = path.join(projectDir, 'src', 'content-pack', 'site-content.json');
const assetPath = path.join(projectDir, 'src', 'assets', 'asset-manifest.json');
const themeCssSrc = path.join(projectDir, 'src', 'assets', 'theme.css');
const interiorCssSrc = path.join(projectDir, 'src', 'assets', 'interior.css');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const safeArray = (value) => Array.isArray(value) ? value : [];
const slot = (id) => (assets.slots || {})[id] || null;
const paragraphs = (items) => safeArray(items).map((item) => `<p>${escapeHtml(item)}</p>`).join('');

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const assets = fs.existsSync(assetPath) ? JSON.parse(fs.readFileSync(assetPath, 'utf8')) : { slots: {} };

// Update this to your live domain before deploying:
//   Local preview : http://127.0.0.1:5173
//   GitHub Pages  : https://YOUR-USERNAME.github.io/YOUR-REPO/
//   Custom domain : https://yourdomain.com.au
const origin = process.env.SITE_ORIGIN || 'http://127.0.0.1:5173';

// Service card color palette
const serviceColors = {
  'house-framing':           { bg: '#1a3a2a', accent: '#5fa87a', label: 'Framing' },
  'outdoor-living':          { bg: '#2a4a1a', accent: '#8fc040', label: 'Outdoor' },
  'fix-out-second-fix':      { bg: '#3a2a1a', accent: '#d4a853', label: 'Fix-Out' },
  'formwork-carpentry':      { bg: '#1a2a3a', accent: '#5f8fd4', label: 'Formwork' },
  'fitout-refurbishment':    { bg: '#2a1a3a', accent: '#9f5fd4', label: 'Fitout' },
  'custom-kitchen-bathroom': { bg: '#3a1a2a', accent: '#d45f8f', label: 'Kitchen' },
  'architectural-joinery':   { bg: '#1a3a3a', accent: '#5fd4c4', label: 'Joinery' },
  'storage-solutions':       { bg: '#2a3a1a', accent: '#a8d45f', label: 'Storage' },
  'custom-doors-furniture':  { bg: '#3a3a1a', accent: '#d4c85f', label: 'Doors' },
  'restoration-maintenance': { bg: '#3a1a1a', accent: '#d45f5f', label: 'Restoration' },
  'heritage-carpentry':      { bg: '#2a1a0a', accent: '#c4955a', label: 'Heritage' },
  'decking-restoration-flooring': { bg: '#1a2a1a', accent: '#6ab87a', label: 'Flooring' },
};

function svgImage(id, width = 800, height = 533) {
  const colors = serviceColors[id] || { bg: '#2c3e50', accent: '#e67e22', label: id };
  const label = colors.label || id;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g1_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.5" />
    </linearGradient>
    <pattern id="p_${id}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M0 40 L40 0" stroke="rgba(255,255,255,0.05)" stroke-width="1" fill="none"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g1_${id})"/>
  <rect width="${width}" height="${height}" fill="url(#p_${id})"/>
  <text x="${width/2}" y="${height*0.42}" font-family="system-ui,sans-serif" font-size="${Math.round(width*0.055)}" font-weight="800" fill="rgba(255,255,255,0.15)" text-anchor="middle" letter-spacing="4">${content.brand.short_name}</text>
  <text x="${width/2}" y="${height*0.62}" font-family="system-ui,sans-serif" font-size="${Math.round(width*0.035)}" font-weight="700" fill="rgba(255,255,255,0.55)" text-anchor="middle" letter-spacing="2">${label}</text>
  <rect x="${width*0.08}" y="${height*0.72}" width="${width*0.84}" height="2" fill="rgba(255,255,255,0.1)"/>
  <text x="${width*0.12}" y="${height*0.83}" font-family="system-ui,sans-serif" font-size="${Math.round(width*0.022)}" fill="rgba(255,255,255,0.35)" letter-spacing="1">${content.brand.name} · Adelaide · ${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function media(slotId, className = 'evidence-media') {
  const item = slot(slotId);
  if (!item) return '';
  let src;
  if (item.src?.startsWith('/assets/')) {
    // Check if real image exists in built assets dir, otherwise fall back to SVG
    const filename = item.src.replace('/assets/', '');
    const onDisk = path.join(siteDir, 'assets', filename);
    if (fs.existsSync(onDisk)) {
      src = item.src;
    } else {
      src = svgImage(slotId.replace('service.','').replace('.',''));
    }
  } else {
    src = item.src;
  }
  const alt = escapeHtml(item.alt || '');
  const caption = escapeHtml(item.caption || '');
  return `<figure class="${className}"><img src="${src}" alt="${alt}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;"><figcaption class="caption">${caption}</figcaption></figure>`;
}

// Responsive thumbnail (no caption) — scales with its container via CSS aspect-ratio
function thumb(slotId) {
  const item = slot(slotId);
  if (!item) return '';
  let src;
  if (item.src?.startsWith('/assets/')) {
    const filename = item.src.replace('/assets/', '');
    const onDisk = path.join(siteDir, 'assets', filename);
    src = fs.existsSync(onDisk) ? item.src : svgImage(slotId.replace('service.','').replace('.',''));
  } else {
    src = item.src;
  }
  const alt = escapeHtml(item.alt || '');
  return `<img src="${src}" alt="${alt}" loading="lazy">`;
}

function heroMedia(slotId) {
  const item = slot(slotId);
  if (!item) return '';
  const src = svgImage('hero', 800, 533);
  const alt = escapeHtml(item.alt || '');
  return `<div class="hero-media"><img src="${src}" alt="${alt}"></div>`;
}

function canonical(route) { return `${origin}${route}`; }

const brandName = content.brand.name;
const brandMark = content.brand.short_name;
const copy = {
  servicesTitle: 'Our Services',
  servicesHomeTitle: 'Full-spectrum carpentry, delivered as one',
  servicesLead: content.hero.lead,
  insightsTitle: 'Industry Insights',
  insightsLead: 'Clear, practical judgement on the questions our clients actually face.',
  faqTitle: 'FAQ',
  faqLead: 'Straight answers organised by real questions, so you can judge quickly whether to reach out.',
  faqHomeTitle: 'Start with the common questions',
  faqHomeLead: 'The questions visitors ask most — answered plainly so you can decide fast.',
  faqCta: 'See all questions',
  ...(content.pageCopy || {}),
};

const navItems = [
  ['/', 'Home', 'home'],
  ['/services/', copy.servicesTitle, 'services'],
  ['/insights/', copy.insightsTitle, 'insights'],
  ['/faq/', copy.faqTitle, 'faq'],
  ['/about/', 'About', 'about'],
];

function header(active = '') {
  return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/"><img class="brand-mark" src="/assets/mel-one-logo.png" alt=""><strong>${escapeHtml(brandName)}</strong></a><button class="menu" aria-expanded="false" aria-controls="nav">Menu</button><nav class="nav" id="nav" aria-label="Main"><div class="nav-links">${navItems.map(([href, label, key]) => `<a${active === key ? ' aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}</div><a class="nav-cta" href="/contact/">Contact</a></nav></div></header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap footer-grid"><div><a class="footer-brand" href="/">${escapeHtml(brandName)}</a><p>${escapeHtml(content.brand.tagline)}</p></div><div><strong>Services</strong><a href="/services/">${escapeHtml(copy.servicesTitle)}</a><a href="/about/">About</a></div><div><strong>Content</strong><a href="/insights/">${escapeHtml(copy.insightsTitle)}</a><a href="/faq/">${escapeHtml(copy.faqTitle)}</a></div><div><strong>Contact</strong><a href="/contact/">${escapeHtml(content.contact.cta)}</a><p style="color:var(--muted);font-size:14px;margin-top:8px;">${escapeHtml(content.contact.phone)}<br>${escapeHtml(content.contact.email)}<br>${escapeHtml(content.contact.address)}</p></div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(brandName)} · Adelaide, SA</span><span>${escapeHtml(content.brand.industry_label)}</span></div></footer>`;
}

function page({ title, description, route, active = '', body, jsonLd }) {
  const fullTitle = title.includes(brandName) ? title : `${title} | ${brandName}`;
  const structured = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>` : '';
  const isInterior = route !== '/';
  const favicon = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#17372f"/><text x="50%" y="55%" font-size="25" font-weight="900" fill="#d5a46b" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">${brandMark}</text></svg>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="${escapeHtml(description)}"><title>${escapeHtml(fullTitle)}</title><link rel="icon" href="data:image/svg+xml,${favicon}"><link rel="canonical" href="${canonical(route)}"><link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/assets/theme.css">${isInterior ? '<link rel="stylesheet" href="/assets/interior.css">' : ''}${structured}</head><body class="${isInterior ? 'interior' : ''}">${header(active)}<main id="main">${body}</main>${footer()}<script src="/assets/base.js" defer></script></body></html>`;
}

function writeRoute(route, html) {
  const destination = route === '/' ? path.join(siteDir, 'index.html')
    : route === '/404.html' ? path.join(siteDir, '404.html')
    : path.join(siteDir, route, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, html, 'utf8');
  console.log(`  ✓ ${route}`);
}

const numberLabel = (index, label) => `<span class="section-no">${String(index).padStart(2, '0')} / ${escapeHtml(label)}</span>`;
const card = (href, item, label) => {
  const cat = escapeHtml(item.category || label);
  const date = item.date ? ` · ${escapeHtml(item.date)}` : '';
  const imgSrc = svgImage((item.slug || 'insight').replace(/-/g, ''), 800, 450);
  return `<article class="editorial-card">
    <a class="card-media" href="${href}" aria-hidden="true" tabindex="-1"><img src="${imgSrc}" alt=""></a>
    <div class="card-body">
      <span class="card-meta">${cat}${date}</span>
      <h3><a href="${href}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.summary)}</p>
      <span class="text-link">Read more ↗</span>
    </div>
  </article>`;
};

// ── Build ──────────────────────────────────────────────────────────────
fs.mkdirSync(siteDir, { recursive: true });
fs.mkdirSync(path.join(siteDir, 'assets'), { recursive: true });

// Copy base CSS & JS from src/assets (shipped with this repo)
const cssSrc = path.join(projectDir, 'src', 'assets', 'base.css');
const jsSrc  = path.join(projectDir, 'src', 'assets', 'base.js');
if (fs.existsSync(cssSrc)) fs.copyFileSync(cssSrc, path.join(siteDir, 'assets', 'base.css'));
if (fs.existsSync(jsSrc))  fs.copyFileSync(jsSrc,  path.join(siteDir, 'assets', 'base.js'));
if (fs.existsSync(themeCssSrc)) fs.copyFileSync(themeCssSrc, path.join(siteDir, 'assets', 'theme.css'));
if (fs.existsSync(interiorCssSrc)) fs.copyFileSync(interiorCssSrc, path.join(siteDir, 'assets', 'interior.css'));

// Copy image assets from src/assets (hero + about + 7 service images)
const srcAssets = path.join(projectDir, 'src', 'assets');
const imageFiles = [
  'hero-bg.jpg', 'about.jpg',
  'framing.jpg', 'formwork.jpg', 'decking.jpg', 'secondfix.jpg', 'fitout.jpg', 'architectural.jpg', 'storage.jpg', 'restoration.jpg', 'heritage.jpg',
  'kitchen.jpg', 'doors-furniture.jpg', 'flooring.jpg',
  'symbol-joint.png', 'symbol-measure.png', 'symbol-grain.png', 'symbol-repair.png',
  'mel-one-logo.png'
];
for (const img of imageFiles) {
  const src = path.join(srcAssets, img);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(siteDir, 'assets', img));
}

// ── Homepage ────────────────────────────────────────────────────────────
const homeBody = `
<section class="hero-image-bg">
  <div class="hero-overlay"></div>
  <div class="hero-image-content">
    <div class="wrap">
      <div class="hero-copy">
        <p class="kicker">${escapeHtml(content.hero.eyebrow)}</p>
        <h1>${escapeHtml(content.hero.title)}<br><span>${escapeHtml(content.hero.accent)}</span></h1>
        <p class="lede">${escapeHtml(content.hero.lead)}</p>
        <div class="actions">
          <a class="btn primary" href="/services/">${escapeHtml(content.hero.primary_cta)}</a>
          <a class="btn ghost" href="/about/">${escapeHtml(content.hero.secondary_cta)}</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div>${numberLabel(1, 'Services')}<h2>${escapeHtml(copy.servicesHomeTitle)}</h2></div>
      <p>${escapeHtml(content.method.lead)}</p>
    </div>
    <div class="choice-grid">
      ${content.services.slice(0, 6).map((item, index) => `
        <a class="choice" href="/services/${item.slug}/">
          <span class="num">${String(index + 1).padStart(2, '0')}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
          <span class="text-link">View service ↗</span>
        </a>`).join('')}
    </div>
    <div style="margin-top:32px;text-align:center;">
      <a class="btn" href="/services/">See all ${content.services.length} services →</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <div>${numberLabel(2, 'Insights')}<h2>${escapeHtml(copy.insightsTitle)}</h2></div>
      <a class="text-link" href="/insights/">See all ↗</a>
    </div>
    <div class="card-grid">
      ${content.insights.slice(0, 3).map((item) => card(`/insights/${item.slug}/`, item, copy.insightsTitle)).join('')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap faq">
    <div>
      ${numberLabel(3, 'Questions')}
      <h2>${escapeHtml(copy.faqHomeTitle)}</h2>
      <p>${escapeHtml(copy.faqHomeLead)}</p>
      <a class="btn" href="/faq/">${escapeHtml(copy.faqCta)}</a>
    </div>
    <div>
      ${content.faqs.slice(0, 6).map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}
    </div>
  </div>
</section>

<section class="section closing">
  <div class="wrap closing-inner">
    <h2>${escapeHtml(content.contact.title)}</h2>
    <div>
      <p>${escapeHtml(content.contact.lead)}</p>
      <a class="btn primary" href="/contact/">${escapeHtml(content.contact.cta)}</a>
    </div>
  </div>
</section>`;

writeRoute('/', page({ title: content.brand.tagline, description: content.seo.site_description, route: '/', active: 'home', body: homeBody, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: brandName, url: canonical('/'), description: content.seo.site_description } }));

// ── Services index (with process merged in) ────────────────────────────
const servicesBody = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">${escapeHtml(content.brand.industry_label)}</p><h1>${escapeHtml(copy.servicesTitle)}</h1></div><p class="lede">${escapeHtml(copy.servicesLead)}</p></div></section>
<section class="section"><div class="wrap service-grid">
  ${content.services.map((item, index) => `
    <article class="service-card">
      <a class="service-media" href="/services/${item.slug}/" aria-hidden="true" tabindex="-1">${thumb(`service.${item.slug}`)}</a>
      <div class="service-card-body">
        <span class="num">${String(index + 1).padStart(2, '0')}</span>
        <h2><a href="/services/${item.slug}/">${escapeHtml(item.title)}</a></h2>
        <p>${escapeHtml(item.summary)}</p>
        <a class="text-link" href="/services/${item.slug}/">View detail ↗</a>
      </div>
    </article>`).join('')}
</div></section>
<section class="section method">
  <div class="wrap">
    <div class="section-head">
      <div><h2>${escapeHtml(content.method.title)}</h2></div>
      <p>${escapeHtml(content.method.lead)}</p>
    </div>
    <div class="method-grid">
      ${content.method.steps.map((item, index) => `
        <article class="method-step">
          <span class="num">${String(index + 1).padStart(2, '0')}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.summary)}</p>
        </article>`).join('')}
    </div>
  </div>
</section>`;
writeRoute('/services/', page({ title: copy.servicesTitle, description: copy.servicesLead, route: '/services/', active: 'services', body: servicesBody }));

// ── Service detail ──────────────────────────────────────────────────────
for (const [index, item] of content.services.entries()) {
  const route = `/services/${item.slug}/`;
  const body = `<section class="detail-hero"><div class="wrap detail-grid"><div><p class="kicker">SERVICE ${String(index + 1).padStart(2, '0')}</p><h1>${escapeHtml(item.title)}</h1></div><p class="lede">${escapeHtml(item.lead)}</p></div></section>
<section class="section"><div class="wrap evidence-grid">
  ${media(`service.${item.slug}`)}
  <article class="article">
    ${item.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></section>`).join('')}
  </article>
</div></section>`;
  writeRoute(route, page({ title: item.title, description: item.summary, route, active: 'services', body, jsonLd: { '@context': 'https://schema.org', '@type': 'Service', name: item.title, description: item.summary, provider: { '@type': 'Organization', name: brandName } } }));
}

// ── Insights ─────────────────────────────────────────────────────────────
function collection(kind, label, items, intro) {
  const body = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">${escapeHtml(label)}</p><h1>${escapeHtml(label)}</h1></div><p class="lede">${escapeHtml(intro)}</p></div></section>
<section class="section"><div class="wrap card-grid">
  ${items.map((item) => card(`/${kind}/${item.slug}/`, item, label)).join('')}
</div></section>`;
  writeRoute(`/${kind}/`, page({ title: label, description: intro, route: `/${kind}/`, active: kind, body }));
  for (const item of items) {
    const route = `/${kind}/${item.slug}/`;
    const cat = escapeHtml(item.category || label);
    const date = item.date ? ` · ${escapeHtml(item.date)}` : '';
    const article = `<section class="article-hero"><div class="wrap reading"><p class="kicker">${cat}${date}</p><h1>${escapeHtml(item.title)}</h1><p class="lede">${escapeHtml(item.lead)}</p></div></section>
<section class="section"><article class="wrap reading article">
  ${item.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></section>`).join('')}
</article></section>`;
    writeRoute(route, page({ title: item.title, description: item.summary, route, active: kind, body: article, jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: item.title, description: item.summary, publisher: { '@type': 'Organization', name: brandName } } }));
  }
}

collection('insights', copy.insightsTitle, content.insights, copy.insightsLead);

// ── FAQ ─────────────────────────────────────────────────────────────────
const faqBody = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">FAQ</p><h1>${escapeHtml(copy.faqTitle)}</h1></div><p class="lede">${escapeHtml(copy.faqLead)}</p></div></section>
<section class="section"><div class="wrap faq-page">
  ${content.faqs.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}
</div></section>`;
writeRoute('/faq/', page({ title: copy.faqTitle, description: copy.faqLead, route: '/faq/', active: 'faq', body: faqBody, jsonLd: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: content.faqs.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } }));

// ── About ───────────────────────────────────────────────────────────────
const valuesList = (content.about.values || []).map(v => {
  const details = (v.details || []).map(d => `<li>${escapeHtml(d)}</li>`).join('');
  return `<article class="value-card">
    <div class="value-icon">${escapeHtml(v.heading[0])}</div>
    <h3>${escapeHtml(v.heading)}</h3>
    <p>${escapeHtml(v.body)}</p>
    ${details ? `<ul class="value-details">${details}</ul>` : ''}
  </article>`;
}).join('');
const aboutImageSlot = (() => {
  const item = slot('about');
  if (item && item.src) {
    const fileOnDisk = path.join(siteDir, item.src.replace(/^\//, ''));
    if (fs.existsSync(fileOnDisk)) {
      return `<figure class="about-image"><img src="${item.src}" alt="${escapeHtml(item.alt || '')}"><figcaption>${escapeHtml(item.caption || '')}</figcaption></figure>`;
    }
  }
  return `<div class="about-image-placeholder" title="Drop your team/workshop photo here"><span>Image slot</span><small>Drop at assets/about.jpg</small></div>`;
})();
const aboutBody = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">ABOUT</p><h1>${escapeHtml(content.about.title)}</h1></div><p class="lede">${escapeHtml(content.about.lead)}</p></div></section>
<section class="section"><div class="wrap">
  <h2 class="about-section-title">${escapeHtml(content.about.story_title)}</h2>
  <div class="about-story-grid">
    <article class="reading">
      <p>${escapeHtml(content.about.story)}</p>
    </article>
    ${aboutImageSlot}
  </div>
  <div class="value-grid">${valuesList}</div>
</div></section>
<section class="section section-alt"><div class="wrap reading">
  <h2>${escapeHtml(content.about.scope_title)}</h2>
  <p>${escapeHtml(content.about.scope)}</p>
  </article>
</div></section>`;
writeRoute('/about/', page({ title: content.about.title, description: content.about.lead, route: '/about/', active: 'about', body: aboutBody, jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: brandName, description: content.about.lead } }));

// ── Contact ─────────────────────────────────────────────────────────────
const contactBody = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">CONTACT</p><h1>${escapeHtml(content.contact.title)}</h1></div><p class="lede">${escapeHtml(content.contact.lead)}</p></div></section>
<section class="section"><div class="wrap contact-grid">
  <div>
    <h2>Help us prepare</h2>
    <ul class="check-list">
      ${content.contact.preparation.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
    <div style="margin-top:32px;padding:24px;background:var(--surface);border:1px solid var(--line);border-radius:2px;">
      <p style="font-weight:700;margin-bottom:12px;">📞 Get in touch</p>
      <p style="color:var(--muted);font-size:14px;">
        Phone: <strong>${escapeHtml(content.contact.phone)}</strong><br>
        Email: <strong>${escapeHtml(content.contact.email)}</strong><br>
        Address: <strong>${escapeHtml(content.contact.address)}</strong><br>
        Service area: Adelaide metro &amp; regional SA
      </p>
    </div>
  </div>
  <form class="contact-form" data-local-brief novalidate>
    <h2>Outline your brief</h2>
    <p>Make a quick note for your conversation with MEL ONE, then call or email the details when you are ready.</p>
    <label>Your name<input name="name" autocomplete="name" required></label>
    <label>Phone number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required></label>
    <label>Email address<input name="email" type="email" autocomplete="email" required></label>
    <label>Your project or first question<textarea name="message" rows="6" style="resize:none" required></textarea></label>
    <button class="btn primary" type="submit">Save my note</button>
    <p data-brief-status role="status" aria-live="polite"></p>
  </form>
</div></section>`;
writeRoute('/contact/', page({ title: 'Contact', description: content.contact.lead, route: '/contact/', active: 'contact', body: contactBody }));

// ── 404 ─────────────────────────────────────────────────────────────────
writeRoute('/404.html', page({ title: 'Page not found', description: 'The page you requested does not exist.', route: '/404.html', body: `<section class="page-hero"><div class="wrap"><p class="kicker">404</p><h1>This page was not found</h1><p class="lede">Head back to the homepage to keep exploring our services and insights.</p><a class="btn primary" href="/">Back to home</a></div></section>` }));

// ── Sitemap & robots ────────────────────────────────────────────────────
const allRoutes = [
  '/', '/services/', '/insights/', '/faq/', '/about/', '/contact/', '/404.html',
  ...content.services.map((item) => `/services/${item.slug}/`),
  ...content.insights.map((item) => `/insights/${item.slug}/`),
];
fs.writeFileSync(path.join(siteDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
    allRoutes.filter(r => r !== '/404.html').map(r => `<url><loc>${canonical(r)}</loc></url>`).join('')
  }</urlset>`, 'utf8');
fs.writeFileSync(path.join(siteDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');

console.log('\n✅ Build complete. Output: ' + siteDir);
console.log(`   Total pages: ${allRoutes.length}`);
