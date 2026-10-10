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
const cityStreetsPath = path.join(projectDir, 'src', 'content-pack', 'city-streets.json');
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
const insightSlugs = new Set([
  'adelaide-deck-replacement-guide',
  'adelaide-custom-wardrobe-planning',
  'adelaide-heritage-timber-repairs',
]);
const draftedInsights = content.services.filter((item) => insightSlugs.has(item.slug));
content.services = content.services.filter((item) => !insightSlugs.has(item.slug));
content.insights.push(...draftedInsights);
const assets = fs.existsSync(assetPath) ? JSON.parse(fs.readFileSync(assetPath, 'utf8')) : { slots: {} };
const ga4Id = /^G-[A-Z0-9]+$/.test(process.env.GA4_MEASUREMENT_ID || '')
  ? process.env.GA4_MEASUREMENT_ID : '';
const gscToken = String(process.env.GSC_VERIFICATION_TOKEN || '').trim();

// The canonical production origin. Override only for an approved alternate domain.
const origin = process.env.SITE_ORIGIN || 'https://www.adelaidecarpentryhub.com.au';

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

function breadcrumbList(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, route], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: canonical(route),
    })),
  };
}

const brandName = content.brand.name;
const brandMark = content.brand.short_name;
// Preserve the existing layout-space guard using verified source-image dimensions.
const imageDimensions = {
  "/assets/mel-one-logo.png": [
    1402,
    1122
  ],
  "/assets/about-team-2026-v2.jpg": [
    960,
    717
  ],
  "/assets/insight-integrated-joinery.jpg": [
    960,
    540
  ],
  "/assets/insight-kitchen-costs.jpg": [
    960,
    540
  ],
  "/assets/insight-heritage-restoration.jpg": [
    960,
    540
  ],
  "/assets/insight-timber-flooring.jpg": [
    960,
    540
  ],
  "/assets/insight-commercial-fitout.jpg": [
    960,
    540
  ],
  "/assets/insight-adelaide-deck-replacement.png": [
    1672,
    941
  ],
  "/assets/insight-adelaide-custom-wardrobe.png": [
    1672,
    941
  ],
  "/assets/insight-adelaide-heritage-timber-repairs.png": [
    1672,
    941
  ],
  "/assets/architectural.jpg": [
    1408,
    752
  ],
  "/assets/doors-furniture.jpg": [
    800,
    1200
  ],
  "/assets/custom-kitchen-bathroom-project.png": [
    1672,
    941
  ],
  "/assets/project-deck-after.webp": [
    1440,
    1080
  ],
  "/assets/project-deck-before.webp": [
    1440,
    1080
  ],
  "/assets/project-deck-during.webp": [
    1440,
    1080
  ],
  "/assets/project-deck-detail.webp": [
    1440,
    1080
  ],
  "/assets/service-door-jamb-interior-trim.png": [
    1672,
    941
  ],
  "/assets/project-window-after-wide.webp": [
    1440,
    1080
  ],
  "/assets/project-window-before.webp": [
    1440,
    1080
  ],
  "/assets/project-window-during.webp": [
    1440,
    1080
  ],
  "/assets/project-window-after-detail.webp": [
    1440,
    1080
  ],
  "/assets/fitout-2026-v2.jpg": [
    960,
    513
  ],
  "/assets/project-door-after.webp": [
    1440,
    1080
  ],
  "/assets/project-door-before.webp": [
    1440,
    1080
  ],
  "/assets/project-door-during.webp": [
    1440,
    1080
  ],
  "/assets/project-door-detail.webp": [
    1440,
    1080
  ],
  "/assets/formwork.jpg": [
    1200,
    654
  ],
  "/assets/project-heritage-detail.webp": [
    1440,
    1080
  ],
  "/assets/project-heritage-before.webp": [
    1440,
    1080
  ],
  "/assets/project-heritage-during.webp": [
    1440,
    1080
  ],
  "/assets/project-heritage-after.webp": [
    1440,
    1080
  ],
  "/assets/framing.jpg": [
    1200,
    654
  ],
  "/assets/service-skirting-board-installation-repairs.png": [
    1672,
    941
  ],
  "/assets/service-renovation-carpentry.png": [
    1672,
    941
  ],
  "/assets/storage.jpg": [
    1408,
    752
  ],
  "/assets/decking.jpg": [
    1200,
    654
  ],
  "/assets/project-fence-after-gate.webp": [
    1440,
    1080
  ],
  "/assets/restoration-2026-v2.jpg": [
    960,
    513
  ],
  "/assets/project-fence-before.webp": [
    1440,
    1080
  ],
  "/assets/project-fence-during.webp": [
    1440,
    1080
  ],
  "/assets/project-fence-after-wide.webp": [
    1440,
    1080
  ]
};
const reserveImageSpace = (html) => html.replace(/<img\b[^>]*>/gi, (tag) => {
  if (/\bwidth="\d+"/i.test(tag) && /\bheight="\d+"/i.test(tag)) return tag;
  const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  const dimensions = imageDimensions[src] || (src?.startsWith('data:image/svg+xml') ? [800, 450] : null);
  return dimensions ? tag.replace('>', ` width="${dimensions[0]}" height="${dimensions[1]}">`) : tag;
});
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
  serviceAreasTitle: 'Service areas',
  ...(content.pageCopy || {}),
};

const navItems = [
  ['/', 'Home', 'home'],
  ['/services/', copy.servicesTitle, 'services'],
  ['/service-areas/', copy.serviceAreasTitle, 'areas'],
  ['/insights/', copy.insightsTitle, 'insights'],
  ['/faq/', copy.faqTitle, 'faq'],
  ['/about/', 'About', 'about'],
];

function header(active = '') {
  return `<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/"><img class="brand-mark" src="/assets/mel-one-logo.png" alt=""><strong>${escapeHtml(brandName)}</strong></a><button class="menu" aria-expanded="false" aria-controls="nav">Menu</button><nav class="nav" id="nav" aria-label="Main"><div class="nav-links">${navItems.map(([href, label, key]) => `<a${active === key ? ' aria-current="page"' : ''} href="${href}">${label}</a>`).join('')}</div><a class="nav-cta" href="/contact/">Contact</a></nav></div></header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap footer-grid"><div><a class="footer-brand" href="/">${escapeHtml(brandName)}</a><p>${escapeHtml(content.brand.tagline)}</p></div><div><strong>Services</strong><a href="/services/">${escapeHtml(copy.servicesTitle)}</a><a href="/service-areas/">Service areas</a><a href="/about/">About</a></div><div><strong>Content</strong><a href="/insights/">${escapeHtml(copy.insightsTitle)}</a><a href="/faq/">${escapeHtml(copy.faqTitle)}</a></div><div><strong>Contact</strong><a href="/contact/">${escapeHtml(content.contact.cta)}</a><p style="color:var(--muted);font-size:14px;margin-top:8px;">${escapeHtml(content.contact.phone)}<br>${escapeHtml(content.contact.email)}<br>${escapeHtml(content.contact.address)}</p></div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(brandName)} · Adelaide, SA</span><span>${escapeHtml(content.brand.industry_label)}</span></div></footer>`;
}

function page({ title, description, route, active = '', body, jsonLd }) {
  const fullTitle = title.includes(brandName) ? title : `${title} | ${brandName}`;
  const structured = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>` : '';
  const isInterior = route !== '/';
  const analyticsHead = ga4Id ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4Id}');</script>` : '';
  const searchConsoleHead = gscToken ? `<meta name="google-site-verification" content="${escapeHtml(gscToken)}">` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><meta name="description" content="${escapeHtml(description)}"><title>${escapeHtml(fullTitle)}</title><meta property="og:type" content="website"><meta property="og:site_name" content="${escapeHtml(brandName)}"><meta property="og:title" content="${escapeHtml(fullTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical(route)}"><meta property="og:image" content="${canonical('/assets/hero-bg.jpg')}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="512x512" href="/favicon.png"><link rel="shortcut icon" href="/favicon.ico"><link rel="canonical" href="${canonical(route)}"><link rel="alternate" type="application/feed+json" href="/feed.json"><link rel="alternate" type="application/rss+xml" href="/rss.xml"><link rel="stylesheet" href="/assets/base.css"><link rel="stylesheet" href="/assets/theme.css">${isInterior ? '<link rel="stylesheet" href="/assets/interior.css">' : ''}${analyticsHead}${searchConsoleHead}${structured}</head><body class="${isInterior ? 'interior' : ''}">${header(active)}<main id="main">${body}</main>${footer()}<script src="/assets/base.js" defer></script></body></html>`;
}

function writeRoute(route, html) {
  const destination = route === '/' ? path.join(siteDir, 'index.html')
    : route === '/404.html' ? path.join(siteDir, '404.html')
    : path.join(siteDir, route, 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, reserveImageSpace(html), 'utf8');
  console.log(`  ✓ ${route}`);
}

const numberLabel = (index, label) => `<span class="section-no">${String(index).padStart(2, '0')} / ${escapeHtml(label)}</span>`;
const card = (href, item, label) => {
  const cat = escapeHtml(item.category || label);
  const date = item.date ? ` · ${escapeHtml(item.date)}` : '';
  const image = slot(`insight.${item.slug}`);
  const imgSrc = image?.src || svgImage((item.slug || 'insight').replace(/-/g, ''), 800, 450);
  const alt = escapeHtml(image?.alt || '');
  return `<article class="editorial-card">
    <a class="editorial-card-link" href="${href}" aria-label="Read ${escapeHtml(item.title)}">
      <span class="card-media"><img src="${imgSrc}" alt="${alt}" loading="lazy"></span>
      <span class="card-body">
        <span class="card-meta">${cat}${date}</span>
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="card-summary">${escapeHtml(item.summary)}</span>
        <span class="text-link">Read more ↗</span>
      </span>
    </a>
  </article>`;
};

const seoTitles = {
  service: {
    'house-framing': 'Adelaide House Framing',
    'outdoor-living': 'Adelaide Outdoor Living Carpentry',
    'fix-out-second-fix': 'Adelaide Fix-Out & Second Fix',
    'formwork-carpentry': 'Adelaide Formwork Carpentry',
    'fitout-refurbishment': 'Adelaide Fitout & Refurbishment',
    'custom-kitchen-bathroom': 'Adelaide Kitchen & Bathroom Cabinetry',
    'architectural-joinery': 'Adelaide Architectural Joinery',
    'storage-solutions': 'Adelaide Custom Storage Solutions',
    'custom-doors-furniture': 'Adelaide Custom Doors & Furniture',
    'restoration-maintenance': 'Adelaide Timber Restoration & Maintenance',
    'heritage-carpentry': 'Adelaide Heritage Carpentry',
    'decking-restoration-flooring': 'Adelaide Decking & Timber Flooring',
    'door-window-repairs': 'Adelaide Door & Window Repairs',
    'skirting-board-installation-repairs': 'Adelaide Skirting Board Installation & Repairs',
    'door-jamb-interior-trim': 'Adelaide Door Jambs & Interior Trim',
    'timber-fencing-repairs-replacement': 'Adelaide Timber Fencing Repairs & Replacement',
    'timber-gates-installation-repairs': 'Adelaide Timber Gate Installation & Repairs',
    'renovation-carpentry': 'Adelaide Renovation Carpentry',
  },
  insight: {
    'why-integrated-carpentry-joinery': 'Integrated Carpentry & Joinery Adelaide',
    'kitchen-renovation-cost-guide': 'Adelaide Kitchen Renovation Cost Guide',
    'heritage-building-timber-restoration': 'Adelaide Heritage Timber Restoration Guide',
    'timber-flooring-oiling-guide': 'Timber Flooring Guide for Adelaide Homes',
    'commercial-fitout-process': 'Adelaide Commercial Fitout Guide',
    'adelaide-deck-replacement-guide': 'Adelaide Deck Replacement Guide',
    'adelaide-custom-wardrobe-planning': 'Adelaide Custom Wardrobe Planning',
    'adelaide-heritage-timber-repairs': 'Adelaide Heritage Timber Repair Guide',
  },
};

const seoDescriptions = {
  'door-window-repairs': 'Adelaide door and window repairs for timber frames, sashes and trim. Discuss visible damage, operation and a practical repair scope with MEL ONE.',
  'skirting-board-installation-repairs': 'Adelaide skirting board installation and repairs for new rooms and renovations, planned around profiles, flooring transitions and interior trim.',
  'door-jamb-interior-trim': 'Adelaide door jambs, architraves and interior trim for renovated homes, with practical planning for reveals, floors and second-fix details.',
  'timber-fencing-repairs-replacement': 'Adelaide timber fencing repairs and replacement for damaged palings, rails and posts. Plan access, visible condition and practical next steps.',
  'timber-gates-installation-repairs': 'Adelaide timber gate installation and repairs for side access, gardens and fences, planned around alignment, hardware and everyday use.',
  'renovation-carpentry': 'Adelaide renovation carpentry for altered openings, trim, repairs and joinery interfaces. Plan staged work around the existing home with MEL ONE.',
  'why-integrated-carpentry-joinery': 'Learn how coordinated Adelaide carpentry and joinery can reduce handover gaps, duplicated work and avoidable project delays.',
  'kitchen-renovation-cost-guide': 'Understand Adelaide kitchen renovation cost drivers, scope decisions and the information needed for a clearer cabinetry quote.',
  'adelaide-deck-replacement-guide': 'An Adelaide guide to deck replacement: inspect boards, joists and fixings, then prepare a safer, more useful repair brief.',
  'adelaide-custom-wardrobe-planning': 'Plan an Adelaide custom wardrobe with MEL ONE: measurements, storage layout, materials, hardware, quote inclusions, approved changes and installation handover.',
  'adelaide-heritage-timber-repairs': 'Plan Adelaide heritage timber repairs for doors, windows and external joinery with condition checks and repair-versus-replace guidance.',
};

const relatedTargets = {
  'service:house-framing': ['service:fix-out-second-fix', 'service:architectural-joinery', 'insight:commercial-fitout-process'],
  'service:outdoor-living': ['service:decking-restoration-flooring', 'service:timber-fencing-repairs-replacement', 'service:timber-gates-installation-repairs', 'insight:adelaide-deck-replacement-guide'],
  'service:fix-out-second-fix': ['service:door-jamb-interior-trim', 'service:skirting-board-installation-repairs', 'service:renovation-carpentry', 'insight:commercial-fitout-process'],
  'service:formwork-carpentry': ['service:fitout-refurbishment', 'service:house-framing', 'insight:commercial-fitout-process'],
  'service:fitout-refurbishment': ['service:formwork-carpentry', 'service:fix-out-second-fix', 'insight:commercial-fitout-process'],
  'service:custom-kitchen-bathroom': ['service:architectural-joinery', 'service:storage-solutions', 'insight:kitchen-renovation-cost-guide'],
  'service:architectural-joinery': ['service:custom-kitchen-bathroom', 'service:custom-doors-furniture', 'insight:why-integrated-carpentry-joinery'],
  'service:storage-solutions': ['service:custom-kitchen-bathroom', 'service:custom-doors-furniture', 'service:architectural-joinery', 'insight:adelaide-custom-wardrobe-planning'],
  'service:custom-doors-furniture': ['service:architectural-joinery', 'service:storage-solutions', 'insight:adelaide-custom-wardrobe-planning'],
  'service:restoration-maintenance': ['service:door-window-repairs', 'service:heritage-carpentry', 'service:decking-restoration-flooring', 'insight:timber-flooring-oiling-guide'],
  'service:heritage-carpentry': ['service:door-window-repairs', 'service:restoration-maintenance', 'insight:heritage-building-timber-restoration', 'insight:adelaide-heritage-timber-repairs'],
  'service:decking-restoration-flooring': ['service:outdoor-living', 'service:restoration-maintenance', 'insight:adelaide-deck-replacement-guide'],
  'service:door-window-repairs': ['service:custom-doors-furniture', 'service:restoration-maintenance', 'service:heritage-carpentry', 'service:door-jamb-interior-trim'],
  'service:skirting-board-installation-repairs': ['service:door-jamb-interior-trim', 'service:fix-out-second-fix', 'service:renovation-carpentry', 'service:decking-restoration-flooring'],
  'service:door-jamb-interior-trim': ['service:skirting-board-installation-repairs', 'service:custom-doors-furniture', 'service:fix-out-second-fix', 'service:renovation-carpentry'],
  'service:timber-fencing-repairs-replacement': ['service:timber-gates-installation-repairs', 'service:outdoor-living', 'service:decking-restoration-flooring', 'service:restoration-maintenance'],
  'service:timber-gates-installation-repairs': ['service:timber-fencing-repairs-replacement', 'service:outdoor-living', 'service:custom-doors-furniture', 'service:restoration-maintenance'],
  'service:renovation-carpentry': ['service:door-jamb-interior-trim', 'service:skirting-board-installation-repairs', 'service:custom-kitchen-bathroom', 'service:architectural-joinery', 'service:fitout-refurbishment'],
  'insight:why-integrated-carpentry-joinery': ['service:architectural-joinery', 'service:house-framing', 'service:fitout-refurbishment'],
  'insight:kitchen-renovation-cost-guide': ['service:custom-kitchen-bathroom', 'service:architectural-joinery', 'service:storage-solutions'],
  'insight:heritage-building-timber-restoration': ['service:heritage-carpentry', 'service:restoration-maintenance', 'insight:adelaide-heritage-timber-repairs'],
  'insight:timber-flooring-oiling-guide': ['service:decking-restoration-flooring', 'service:restoration-maintenance', 'service:outdoor-living'],
  'insight:commercial-fitout-process': ['service:fitout-refurbishment', 'service:formwork-carpentry', 'service:fix-out-second-fix'],
  'insight:adelaide-deck-replacement-guide': ['service:outdoor-living', 'service:decking-restoration-flooring', 'service:restoration-maintenance'],
  'insight:adelaide-custom-wardrobe-planning': ['service:storage-solutions', 'service:custom-kitchen-bathroom', 'service:architectural-joinery', 'service:custom-doors-furniture'],
  'insight:adelaide-heritage-timber-repairs': ['service:heritage-carpentry', 'service:restoration-maintenance', 'service:custom-doors-furniture'],
};

function detailTitle(kind, item) {
  return seoTitles[kind][item.slug] || `${item.title} Adelaide`;
}

function detailDescription(item) {
  return seoDescriptions[item.slug] || item.summary;
}

function relatedContent(kind, slug) {
  const links = (relatedTargets[`${kind}:${slug}`] || []).map((target) => {
    const [targetKind, targetSlug] = target.split(':');
    const items = targetKind === 'service' ? content.services : content.insights;
    const item = items.find((entry) => entry.slug === targetSlug);
    if (!item) return '';
    const href = targetKind === 'service' ? `/services/${item.slug}/` : `/insights/${item.slug}/`;
    return `<li><a href="${href}">${escapeHtml(item.title)}</a></li>`;
  }).filter(Boolean).join('');
  return `<aside class="service-brief related-content"><p class="kicker">Related planning</p><h2>Continue your Adelaide project research</h2><ul>${links}</ul><a class="text-link" href="/contact/">Discuss your project</a></aside>`;
}

function collectionJsonLd(route, label, intro, items, kind) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: label,
        url: canonical(route),
        description: intro,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            url: canonical(`/${kind}/${item.slug}/`),
          })),
        },
      },
      breadcrumbList([['Home', '/'], [label, route]]),
    ],
  };
}

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
  'hero-bg.jpg', 'about.jpg', 'about-team-2026-v2.jpg',
  'framing.jpg', 'formwork.jpg', 'decking.jpg', 'secondfix.jpg', 'fitout.jpg', 'fitout-2026-v2.jpg', 'architectural.jpg', 'storage.jpg', 'restoration.jpg', 'restoration-2026-v2.jpg', 'heritage.jpg', 'heritage-2026-v2.jpg',
  'kitchen.jpg', 'custom-kitchen-bathroom-project.png', 'doors-furniture.jpg', 'flooring.jpg',
  'symbol-joint.png', 'symbol-measure.png', 'symbol-grain.png', 'symbol-repair.png',
  'insight-integrated-joinery.jpg', 'insight-kitchen-costs.jpg', 'insight-heritage-restoration.jpg',
  'insight-timber-flooring.jpg', 'insight-commercial-fitout.jpg',
  'insight-adelaide-deck-replacement.png', 'insight-adelaide-custom-wardrobe.png', 'insight-adelaide-heritage-timber-repairs.png',
  'service-door-window-repairs.png', 'service-skirting-board-installation-repairs.png', 'service-door-jamb-interior-trim.png',
  'service-timber-fencing-repairs-replacement.png', 'service-timber-gates-installation-repairs.png', 'service-renovation-carpentry.png',
  'project-deck-before.webp', 'project-deck-during.webp', 'project-deck-detail.webp', 'project-deck-after.webp',
  'project-heritage-before.webp', 'project-heritage-during.webp', 'project-heritage-detail.webp', 'project-heritage-after.webp',
  'project-door-before.webp', 'project-door-during.webp', 'project-door-detail.webp', 'project-door-after.webp',
  'project-fence-during.webp', 'project-fence-after-wide.webp', 'project-fence-after-gate.webp', 'project-fence-before.webp',
  'project-window-after-wide.webp', 'project-window-during.webp', 'project-window-after-detail.webp', 'project-window-before.webp',
  'mel-one-logo.png'
];
for (const img of imageFiles) {
  const src = path.join(srcAssets, img);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(siteDir, 'assets', img));
}

// A crawlable, stable PNG is required for search-engine favicon discovery.
const faviconSource = path.join(srcAssets, 'favicon.png');
if (fs.existsSync(faviconSource)) fs.copyFileSync(faviconSource, path.join(siteDir, 'favicon.png'));
const faviconIcoSource = path.join(srcAssets, 'favicon.ico');
if (fs.existsSync(faviconIcoSource)) fs.copyFileSync(faviconIcoSource, path.join(siteDir, 'favicon.ico'));

// ── Homepage ────────────────────────────────────────────────────────────
const officeMapUrl = 'https://www.google.com/maps/place/63+Pirie+St,+Adelaide+SA+5000,+Australia/';
const officeEmbedUrl = 'https://www.google.com/maps?q=63+Pirie+St%2C+Adelaide%20SA%205000%2C%20Australia&output=embed';

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
          <a class="btn primary" href="/contact/">${escapeHtml(content.hero.primary_cta)}</a>
          <a class="btn ghost" href="/services/">${escapeHtml(content.hero.secondary_cta)}</a>
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
    <div class="card-grid card-grid--balanced">
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
</section>

<section class="section office-location" aria-labelledby="office-location-title">
  <div class="wrap office-location-grid">
    <div class="office-location-copy">
      <span class="section-no">04 / Visit us</span>
      <h2 id="office-location-title">Visit our Adelaide office</h2>
      <p class="office-address">63 Pirie St, Adelaide SA 5000</p>
      <p>Please contact us before visiting so we can make sure the right person is available to discuss your project.</p>
      <div class="actions">
        <a class="btn primary" href="${officeMapUrl}" target="_blank" rel="noopener">Open in Google Maps</a>
        <a class="btn ghost-dark" href="/contact/">Contact us first</a>
      </div>
    </div>
    <div class="office-map-frame">
      <iframe title="Map to MEL ONE's Adelaide office" src="${officeEmbedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>
  </div>
</section>`;

writeRoute('/', page({ title: 'Adelaide Carpentry, Joinery & Timber Restoration', description: content.seo.site_description, route: '/', active: 'home', body: homeBody, jsonLd: {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: brandName, url: canonical('/'), description: content.seo.site_description },
    {
      '@type': 'HomeAndConstructionBusiness',
      '@id': canonical('/#business'),
      name: brandName,
      url: canonical('/'),
      image: canonical('/assets/hero-bg.jpg'),
      logo: canonical('/favicon.png'),
      description: content.seo.site_description,
      telephone: content.contact.phone,
      email: content.contact.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '63 Pirie St',
        addressLocality: 'Adelaide',
        addressRegion: 'SA',
        postalCode: '5000',
        addressCountry: 'AU',
      },
      areaServed: { '@type': 'City', name: 'Adelaide' },
    },
  ],
} }));

// ── Services index (with process merged in) ────────────────────────────
const serviceGroups = [
  {
    title: 'Structural and construction carpentry',
    lead: 'Timber work that helps establish and complete the building sequence from frame through second fix.',
    slugs: ['house-framing', 'formwork-carpentry', 'fix-out-second-fix'],
  },
  {
    title: 'Interior finishing and renovation',
    lead: 'Detailed interior timber work for openings, trim, joinery and rooms being renewed.',
    slugs: ['skirting-board-installation-repairs', 'door-jamb-interior-trim', 'renovation-carpentry', 'custom-kitchen-bathroom', 'architectural-joinery', 'storage-solutions', 'custom-doors-furniture', 'fitout-refurbishment'],
  },
  {
    title: 'Outdoor timber work',
    lead: 'Decking, outdoor structures, fencing and gates planned for everyday use and site conditions.',
    slugs: ['outdoor-living', 'decking-restoration-flooring', 'timber-fencing-repairs-replacement', 'timber-gates-installation-repairs'],
  },
  {
    title: 'Repairs, restoration and heritage work',
    lead: 'Practical repair and careful timber-restoration planning for existing Adelaide homes and details.',
    slugs: ['door-window-repairs', 'restoration-maintenance', 'heritage-carpentry'],
  },
];

const serviceCard = (item, index) => `<article class="service-card">
  <a class="service-media" href="/services/${item.slug}/" aria-hidden="true" tabindex="-1">${thumb(`service.${item.slug}`)}</a>
  <div class="service-card-body">
    <span class="num">${String(index + 1).padStart(2, '0')}</span>
    <h3><a href="/services/${item.slug}/">${escapeHtml(item.title)}</a></h3>
    <p>${escapeHtml(item.summary)}</p>
    <a class="text-link" href="/services/${item.slug}/">View detail ↗</a>
  </div>
</article>`;

const servicesBody = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">${escapeHtml(content.brand.industry_label)}</p><h1>${escapeHtml(copy.servicesTitle)}</h1></div><p class="lede">${escapeHtml(copy.servicesLead)}</p></div></section>
<section class="section service-directory"><div class="wrap">
  ${serviceGroups.map((group) => {
    const items = group.slugs.map((slug) => content.services.find((item) => item.slug === slug)).filter(Boolean);
    return `<section class="service-directory-group"><div class="section-head"><div><p class="kicker">Service directory</p><h2>${escapeHtml(group.title)}</h2></div><p>${escapeHtml(group.lead)}</p></div><div class="service-grid">${items.map((item) => serviceCard(item, content.services.indexOf(item))).join('')}</div></section>`;
  }).join('')}
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
writeRoute('/services/', page({ title: 'Adelaide Carpentry & Joinery | MEL ONE', description: copy.servicesLead, route: '/services/', active: 'services', body: servicesBody, jsonLd: collectionJsonLd('/services/', 'Adelaide Carpentry & Joinery', copy.servicesLead, content.services, 'services') }));

// ── Service detail ──────────────────────────────────────────────────────
const realProjects = {
  'decking-restoration-flooring': [{
    id: 'deck-replacement-adelaide',
    title: 'Timber deck replacement',
    summary: 'A four-stage record of a weathered outdoor deck: its condition before work, removal and framing access, completed step detailing and the finished deck.',
    images: [
      ['project-deck-before.webp', 'Weathered timber deck before replacement', 'Before work'],
      ['project-deck-during.webp', 'Carpenter removing old boards during deck replacement', 'During work'],
      ['project-deck-detail.webp', 'Completed timber deck step and edge detailing', 'Completed detail'],
      ['project-deck-after.webp', 'Completed timber deck replacement', 'Completed project'],
    ],
  }],
  'heritage-carpentry': [{
    id: 'heritage-verandah-restoration',
    title: 'Heritage verandah timber restoration',
    summary: 'This sequence records the weathered verandah fabric, careful preparation, restored decorative timberwork and the completed period frontage.',
    images: [
      ['project-heritage-before.webp', 'Weathered heritage verandah before restoration', 'Existing condition'],
      ['project-heritage-during.webp', 'Carpenter preparing decorative heritage verandah timber', 'Restoration in progress'],
      ['project-heritage-detail.webp', 'Restored heritage verandah posts and decorative timberwork', 'Completed detail'],
      ['project-heritage-after.webp', 'Heritage verandah condition documented before restoration', 'Project record'],
    ],
  }],
  'fix-out-second-fix': [{
    id: 'timber-door-jamb-repair',
    title: 'Timber door and jamb repair',
    summary: 'The project documents lower-jamb deterioration, timber preparation, threshold detailing and the finished entry door.',
    images: [
      ['project-door-before.webp', 'Timber entry door and lower jamb before repair', 'Existing condition'],
      ['project-door-during.webp', 'Carpenter repairing the timber door jamb', 'Repair in progress'],
      ['project-door-detail.webp', 'Completed timber door threshold and lower panel detail', 'Completed detail'],
      ['project-door-after.webp', 'Finished timber entry door after repair', 'Completed project'],
    ],
  }],
  'door-window-repairs': [{
      id: 'timber-window-repair',
      title: 'Timber window repair',
      summary: 'A timber window repair sequence covering weathered paint and damaged sections, preparation work, refreshed sill detailing and the completed window.',
      images: [
        ['project-window-before.webp', 'Weathered timber window frame before repair', 'Existing condition'],
        ['project-window-during.webp', 'Carpenter preparing a timber window frame for repair', 'Repair in progress'],
        ['project-window-after-detail.webp', 'Completed timber window sill detail', 'Completed detail'],
        ['project-window-after-wide.webp', 'Completed timber window repair on a weatherboard home', 'Completed project'],
      ],
  }],
  'timber-fencing-repairs-replacement': [{
    id: 'timber-fence-gate-replacement',
    title: 'Timber fence and gate replacement',
    summary: 'The photo record shows the failed original fence, installation work, the completed boundary line and the finished side gate hardware.',
    images: [
      ['project-fence-before.webp', 'Weathered timber boundary fence before replacement', 'Existing condition'],
      ['project-fence-during.webp', 'Carpenter installing timber fence panels and gate framing', 'Installation in progress'],
      ['project-fence-after-wide.webp', 'Completed timber boundary fence', 'Completed fence'],
      ['project-fence-after-gate.webp', 'Completed timber side gate with black hardware', 'Completed gate'],
    ],
  }],
};

function realProjectGallery(serviceSlug) {
  return safeArray(realProjects[serviceSlug]).map((project) => `<section class="real-project" data-project="${project.id}">
  <div class="wrap">
    <div class="real-project-head"><div><p class="kicker">REAL PROJECT</p><h2>${escapeHtml(project.title)}</h2></div><p>${escapeHtml(project.summary)}</p></div>
    <div class="project-gallery">${project.images.map(([src, alt, label]) => `<figure><img src="/assets/${src}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"><figcaption><span>${escapeHtml(label)}</span></figcaption></figure>`).join('')}</div>
  </div>
</section>`).join('');
}

for (const [index, item] of content.services.entries()) {
  const route = `/services/${item.slug}/`;
  const body = `<section class="detail-hero"><div class="wrap detail-grid"><div><p class="kicker">SERVICE ${String(index + 1).padStart(2, '0')}</p><h1>${escapeHtml(item.title)}</h1></div><p class="lede">${escapeHtml(item.lead)}</p></div></section>
<section class="section"><div class="wrap evidence-grid">
  ${media(`service.${item.slug}`)}
  <article class="article">
    ${item.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></section>`).join('')}
    <aside class="service-brief">
      <p class="kicker">Planning notes</p>
      <h2>One team, from first measure to final finish</h2>
      <p>Tell MEL ONE what needs attention or what you want built, your Adelaide suburb and preferred timing. We arrange a site assessment, check the existing condition or measure for new work, and provide a written quote for the agreed scope, materials and access.</p>
      <a class="text-link" href="/contact/">Discuss your project</a>
    </aside>
    ${relatedContent('service', item.slug)}
  </article>
</div></section>${realProjectGallery(item.slug)}`;
  writeRoute(route, page({ title: detailTitle('service', item), description: detailDescription(item), route, active: 'services', body, jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': canonical(`${route}#service`),
        name: item.title,
        description: item.lead,
        url: canonical(route),
        areaServed: { '@type': 'City', name: 'Adelaide' },
        provider: { '@id': canonical('/#business') },
      },
      breadcrumbList([['Home', '/'], [copy.servicesTitle, '/services/'], [item.title, route]]),
    ],
  } }));
}

// ── Insights ─────────────────────────────────────────────────────────────
function collection(kind, label, items, intro) {
  const body = `<section class="page-hero"><div class="wrap page-hero-grid"><div><p class="kicker">${escapeHtml(label)}</p><h1>${escapeHtml(label)}</h1></div><p class="lede">${escapeHtml(intro)}</p></div></section>
<section class="section"><div class="wrap card-grid card-grid--balanced">
  ${items.map((item) => card(`/${kind}/${item.slug}/`, item, label)).join('')}
</div></section>`;
  const collectionTitle = kind === 'insights' ? 'Adelaide Carpentry Insights | MEL ONE' : `${label} | MEL ONE`;
  writeRoute(`/${kind}/`, page({ title: collectionTitle, description: intro, route: `/${kind}/`, active: kind, body, jsonLd: collectionJsonLd(`/${kind}/`, label, intro, items, kind) }));
  for (const item of items) {
    const route = `/${kind}/${item.slug}/`;
    const cat = escapeHtml(item.category || label);
    const date = item.date ? ` · ${escapeHtml(item.date)}` : '';
    const article = `<section class="article-hero"><div class="wrap reading"><p class="kicker">${cat}${date}</p><h1>${escapeHtml(item.title)}</h1><p class="lede">${escapeHtml(item.lead)}</p></div></section>
<section class="section"><article class="wrap reading article">
  ${item.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></section>`).join('')}
  ${item.faqs?.length ? `<section><h2>Wardrobe quote and handover questions</h2>${item.faqs.map(faq => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join('')}</section>` : ''}
  ${relatedContent('insight', item.slug)}
</article></section>
<section class="section article-cta-section"><div class="wrap reading article-cta">
  <p class="kicker">Talk through your scope</p>
  <h2>Planning a timber project in Adelaide?</h2>
  <p>Tell MEL ONE about your Adelaide timber project or repair concern. We arrange a site assessment, confirm the work required and provide a written quote for the agreed scope. Existing photos or drawings are optional; email them to handymanfelix.au2026@outlook.com.</p>
  <a class="btn primary" href="/contact/">Start an enquiry</a>
</div></section>`;
    writeRoute(route, page({ title: detailTitle('insight', item), description: detailDescription(item), route, active: kind, body: article, jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: item.title,
          description: detailDescription(item),
          mainEntityOfPage: canonical(route),
          publisher: { '@id': canonical('/#business') },
        },
        breadcrumbList([['Home', '/'], [label, `/${kind}/`], [item.title, route]]),
        ...(item.faqs?.length ? [{ '@type': 'FAQPage', mainEntity: item.faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) }] : []),
      ],
    } }));
  }
}

collection('insights', copy.insightsTitle, content.insights, copy.insightsLead);

fs.writeFileSync(path.join(siteDir, 'services.json'), JSON.stringify({
  version: 'https://adelaidecarpentryhub.com.au/services-catalogue/1.0',
  title: 'MEL ONE Adelaide Carpentry Services',
  home_page_url: canonical('/services/'),
  items: content.services.map((item) => ({
    name: item.title,
    title: detailTitle('service', item),
    url: canonical(`/services/${item.slug}/`),
    description: item.summary,
  })),
}, null, 2), 'utf8');

const feedDate = (item) => `${item.date || '2026-09-23'}T00:00:00+09:30`;
const feedItems = content.insights.map((item) => ({
  id: canonical(`/insights/${item.slug}/`),
  url: canonical(`/insights/${item.slug}/`),
  title: item.title,
  summary: item.summary,
  content_text: [item.lead, ...item.sections.map((section) => `${section.title}: ${section.summary}`)].join('\n\n'),
  date_published: feedDate(item),
  tags: [item.category || copy.insightsTitle, 'Adelaide', 'Carpentry & Joinery'],
}));
fs.writeFileSync(path.join(siteDir, 'feed.json'), JSON.stringify({
  version: 'https://jsonfeed.org/version/1.1',
  title: `${brandName} — ${copy.insightsTitle}`,
  home_page_url: canonical('/'),
  feed_url: canonical('/feed.json'),
  description: copy.insightsLead,
  language: 'en-AU',
  items: feedItems,
}, null, 2), 'utf8');
fs.writeFileSync(path.join(siteDir, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escapeHtml(`${brandName} — ${copy.insightsTitle}`)}</title><link>${canonical('/insights/')}</link><description>${escapeHtml(copy.insightsLead)}</description><language>en-au</language>${feedItems.map((item) => `<item><title>${escapeHtml(item.title)}</title><link>${item.url}</link><guid isPermaLink="true">${item.id}</guid><description>${escapeHtml(item.summary)}</description><pubDate>${new Date(item.date_published).toUTCString()}</pubDate><category>${escapeHtml(item.tags[0])}</category></item>`).join('')}</channel></rss>`, 'utf8');


// ── Service areas ───────────────────────────────────────────────────────
const serviceAreas = fs.existsSync(cityStreetsPath)
  ? JSON.parse(fs.readFileSync(cityStreetsPath, 'utf8'))
  : (content.serviceAreas || { title: copy.serviceAreasTitle, lead: '', searchLabel: 'Find your location', searchPlaceholder: 'Start typing a street or area', regions: [] });
const locationsFor = (region) => safeArray(region.locations || region.suburbs);
const regionRoute = (region) => `/service-areas/${region.slug}/`;
const areaCount = safeArray(serviceAreas.regions).reduce((total, region) => total + locationsFor(region).length, 0);
const areasBody = `<section class="page-hero service-areas-hero"><div class="wrap page-hero-grid"><div><p class="kicker">ADELAIDE · SOUTH AUSTRALIA</p><h1>${escapeHtml(serviceAreas.title)}</h1></div><p class="lede">${escapeHtml(serviceAreas.lead)}</p></div></section>
<section class="section area-directory-section"><div class="wrap" data-area-directory>
  <div class="area-directory-intro"><p class="kicker">City directory</p><h2>Find your street</h2><p>Browse ${areaCount} City of Adelaide streets by precinct, or search the directory directly.</p></div>
  <div class="area-search-panel"><label for="area-search">${escapeHtml(serviceAreas.searchLabel)}</label><div class="area-search-control"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg><input id="area-search" data-area-search type="search" autocomplete="off" placeholder="${escapeHtml(serviceAreas.searchPlaceholder)}"><button type="button" data-area-clear hidden>Clear</button></div><p class="area-search-status" data-area-status role="status" aria-live="polite">Showing all ${areaCount} streets.</p></div>
  <div class="area-grid">${safeArray(serviceAreas.regions).map((region, index) => `<section class="area-region" data-area-region><header><span class="num">${String(index + 1).padStart(2, '0')}</span><h2><a href="${regionRoute(region)}">${escapeHtml(region.name)}</a></h2><span class="area-region-count">${locationsFor(region).length} streets</span></header><p><a class="area-region-link" href="${regionRoute(region)}">View ${escapeHtml(region.name)} carpentry services</a></p><ul class="suburb-list">${locationsFor(region).map(location => `<li data-location data-search="${escapeHtml((location + ' ' + region.name).toLocaleLowerCase('en-AU'))}"><a href="${regionRoute(region)}?street=${encodeURIComponent(location)}" aria-label="View carpentry services for ${escapeHtml(location)} in ${escapeHtml(region.name)}">${escapeHtml(location)}</a></li>`).join('')}</ul></section>`).join('')}</div>
  <p class="area-empty" data-area-empty hidden>No Adelaide street matched that search. Try the full street name or clear the search.</p>
</div></section>`;
writeRoute('/service-areas/', page({ title: serviceAreas.title, description: serviceAreas.lead, route: '/service-areas/', active: 'areas', body: areasBody, jsonLd: { '@context': 'https://schema.org', '@type': 'Service', name: 'MEL ONE service areas', provider: { '@id': canonical('/#business') }, areaServed: safeArray(serviceAreas.regions).flatMap(region => locationsFor(region).map(name => ({ '@type': 'Place', name: `${name}, ${region.name}, Adelaide, South Australia` }))) } }));

const serviceBySlug = (slug) => content.services.find((service) => service.slug === slug);
const contactForm = (heading, lead, attributes = '') => `<form class="contact-form" data-contact-form ${attributes} novalidate>
  <h2>${escapeHtml(heading)}</h2>
  <p>${escapeHtml(lead)}</p>
  <label>Your name<input name="name" autocomplete="name" required></label>
  <label>Phone number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required></label>
  <label>Email address<input name="email" type="email" autocomplete="email" required></label>
  <label>Your project or first question<textarea name="message" rows="6" style="resize:none" required></textarea></label>
  <input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
  <button class="btn primary" type="submit">Send enquiry</button>
  <p data-brief-status role="status" aria-live="polite"></p>
</form>`;

const renderServiceAreaPage = (region) => {
  const route = regionRoute(region);
  const services = safeArray(region.serviceSlugs).map(serviceBySlug).filter(Boolean);
  const faqs = safeArray(region.faqs);
  const locations = locationsFor(region);
  const body = `<section class="page-hero service-areas-hero"><div class="wrap page-hero-grid"><div><p class="kicker">ADELAIDE · ${escapeHtml(region.name.toUpperCase())}</p><h1>${escapeHtml(region.title)}</h1></div><div><p class="lede">${escapeHtml(region.lead)}</p><a class="btn primary" href="#book-area-work">Request a local site assessment</a></div></div></section>
<section class="section area-detail-section"><div class="wrap area-detail-grid"><div><p class="kicker">LOCATION AND ACCESS</p><h2>Start with the street, access and timber work you need</h2></div><div><p>${escapeHtml(region.focus)}</p><p>${escapeHtml(region.assessment)}</p></div></div></section>
<section class="section area-detail-section area-detail-tint"><div class="wrap"><p class="kicker">PREPARE THE ENQUIRY</p><h2>Three details that prevent guesswork</h2><div class="area-detail-cards">${safeArray(region.bookingDetails).map((item, index) => `<article><span class="section-no">0${index + 1}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
<section class="section area-detail-section"><div class="wrap"><p class="kicker">PROPERTY REPAIR CONTEXT</p><h2>Carpentry and joinery work we can discuss in ${escapeHtml(region.name)}</h2><div class="area-detail-cards">${safeArray(region.scenarios).map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
<section class="section area-detail-section area-detail-tint"><div class="wrap"><p class="kicker">RELATED SERVICE PATHS</p><h2>Find the closest type of timber work</h2><div class="area-service-links">${services.map((service) => `<a href="/services/${service.slug}/"><strong>${escapeHtml(service.title)}</strong><span>${escapeHtml(service.summary)}</span><em>View service details →</em></a>`).join('')}</div></div></section>
<section class="section area-detail-section"><div class="wrap"><p class="kicker">STREETS SERVED</p><h2>Carpentry and joinery near ${escapeHtml(region.name)} streets</h2><p class="area-detail-intro">Choose your street to include it in the booking form below. MEL ONE has more than ten years in carpentry, experienced carpenters and a standardised maintenance team for on-site assessment and agreed repairs.</p><ul class="suburb-list area-detail-streets">${locations.map((location) => `<li><a href="${route}?street=${encodeURIComponent(location)}#book-area-work" aria-label="Book carpentry and joinery near ${escapeHtml(location)} in ${escapeHtml(region.name)}">${escapeHtml(location)}</a></li>`).join('')}</ul></div></section>
<section class="section area-detail-section area-detail-trust"><div class="wrap area-detail-grid"><div><p class="kicker">WHY MEL ONE</p><h2>Experienced local timber repair team</h2></div><div><p>MEL ONE provides carpentry and joinery repairs in Adelaide. Our carpenters inspect the timber, hardware and adjoining finishes on site, identify the repair required and confirm the plan and written quote, including access and any qualified service arrangements.</p><p>For Adelaide enquiries, MEL ONE can respond in as little as 30 minutes, subject to current availability. A detailed street and a short description of the timber work help us move quickly without making assumptions.</p></div></div></section>
<section class="section area-detail-section"><div class="wrap area-faq"><p class="kicker">LOCAL QUESTIONS</p><h2>${escapeHtml(region.name)} carpentry FAQs</h2>${faqs.map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('')}</div></section>
<section class="section area-booking" id="book-area-work"><div class="wrap contact-grid"><div><p class="kicker">CONTACT MEL ONE</p><h2>${escapeHtml(region.bookingTitle)}</h2><p data-area-context>Tell us the street, timber work and any access notes. We contact you to arrange the assessment, check the work required and confirm the scope and quote. Photos are optional; email existing images to handymanfelix.au2026@outlook.com.</p><p><strong>Phone:</strong> ${escapeHtml(content.contact.phone)}<br><strong>Email:</strong> ${escapeHtml(content.contact.email)}<br><strong>Office:</strong> ${escapeHtml(content.contact.address)}</p></div>${contactForm(region.bookingTitle, 'Outline the timber repair, joinery or maintenance work you would like to discuss.', `data-area-region="${escapeHtml(region.name)}" data-area-streets="${escapeHtml(JSON.stringify(locations))}"`)}</div></section>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', name: region.title, description: region.description, url: canonical(route), provider: { '@id': canonical('/#business') }, areaServed: locations.map((name) => ({ '@type': 'Place', name: `${name}, ${region.name}, Adelaide, South Australia` })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: canonical('/') }, { '@type': 'ListItem', position: 2, name: 'Service areas', item: canonical('/service-areas/') }, { '@type': 'ListItem', position: 3, name: region.name, item: canonical(route) }] },
      { '@type': 'FAQPage', mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }
    ]
  };
  writeRoute(route, page({ title: region.title, description: region.description, route, active: 'areas', body, jsonLd }));
};

safeArray(serviceAreas.regions).forEach(renderServiceAreaPage);
fs.writeFileSync(path.join(siteDir, 'service-areas.json'), JSON.stringify({
  version: 1,
  title: serviceAreas.title,
  updated: new Date().toISOString().slice(0, 10),
  regions: safeArray(serviceAreas.regions).map((region) => ({
    name: region.name,
    slug: region.slug,
    title: region.title,
    description: region.description,
    url: canonical(regionRoute(region)),
    streets: locationsFor(region),
    services: safeArray(region.serviceSlugs).map(serviceBySlug).filter(Boolean).map((service) => ({ title: service.title, summary: service.summary, url: canonical(`/services/${service.slug}/`) }))
  }))
}, null, 2), 'utf8');

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
const companyDetails = (content.about.company_details || []).map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${item.url ? `<a class="text-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.value)} ↗</a>` : escapeHtml(item.value)}</dd></div>`).join('');
const aboutSteps = (content.about.process_steps || []).map((item, index) => `<article class="value-card"><div class="value-icon">${String(index + 1).padStart(2, '0')}</div><h3>${escapeHtml(item.heading)}</h3><p>${escapeHtml(item.body)}</p></article>`).join('');
const aboutPriorities = (content.about.priorities || []).map((item, index) => `<article class="value-card"><div class="value-icon">${String(index + 1).padStart(2, '0')}</div><h3>${escapeHtml(item.heading)}</h3><p>${escapeHtml(item.body)}</p></article>`).join('');
const aboutFaq = (content.about.faqs || []).map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('');
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
</div></section>
<section class="section"><div class="wrap about-company">
  <div class="section-head"><div><p class="kicker">COMPANY &amp; INSURANCE</p><h2>${escapeHtml(content.about.company_title || 'Company & insurance details')}</h2></div><p>${escapeHtml(content.about.company_intro || '')}</p></div>
  <dl class="company-details">${companyDetails}</dl>
</div></section>
<section class="section section-alt"><div class="wrap">
  <div class="section-head"><div><p class="kicker">HOW A JOB IS ARRANGED</p><h2>${escapeHtml(content.about.process_title || 'Clear details before work begins')}</h2></div><p>${escapeHtml(content.about.process_lead || '')}</p></div>
  <div class="value-grid">${aboutSteps}</div>
</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><div><p class="kicker">CUSTOMER PRIORITIES</p><h2>${escapeHtml(content.about.priorities_title || 'What shapes a workable Adelaide project')}</h2></div><p>${escapeHtml(content.about.priorities_lead || '')}</p></div>
  <div class="value-grid">${aboutPriorities}</div>
</div></section>
<section class="section section-alt"><div class="wrap reading about-faq">
  <p class="kicker">GOOD TO KNOW</p><h2>${escapeHtml(content.about.faq_title || 'Company and project questions')}</h2>
  ${aboutFaq}
</div></section>
<section class="section closing"><div class="wrap closing-inner"><h2>Start with the job and suburb</h2><div><p>Call ${escapeHtml(content.contact.phone)}, email ${escapeHtml(content.contact.email)} or use our contact form. Tell us the Adelaide suburb, what needs attention and any important access details. We arrange a site assessment and confirm the work scope and written quote. Photos are optional; email existing images to handymanfelix.au2026@outlook.com.</p><a class="btn primary" href="/contact/">Contact MEL ONE</a></div></div></section>`;
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
  <form class="contact-form" data-contact-form novalidate>
    <h2>Outline your brief</h2>
    <p>Send your project details directly to MEL ONE. We will reply using the email address you provide.</p>
    <label>Your name<input name="name" autocomplete="name" required></label>
    <label>Phone number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required></label>
    <label>Email address<input name="email" type="email" autocomplete="email" required></label>
    <label>Your project or first question<textarea name="message" rows="6" style="resize:none" required></textarea></label>
    <input name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">
    <button class="btn primary" type="submit">Send enquiry</button>
    <p data-brief-status role="status" aria-live="polite"></p>
  </form>
</div></section>`;
writeRoute('/contact/', page({ title: 'Contact Adelaide Carpenters | MEL ONE', description: content.contact.lead, route: '/contact/', active: 'contact', body: contactBody, jsonLd: {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ContactPage',
      name: 'Contact MEL ONE Adelaide',
      url: canonical('/contact/'),
      description: content.contact.lead,
      mainEntity: { '@id': canonical('/#business') },
    },
    breadcrumbList([['Home', '/'], ['Contact', '/contact/']]),
  ],
} }));

// ── 404 ─────────────────────────────────────────────────────────────────
writeRoute('/404.html', page({ title: 'Page not found', description: 'The page you requested does not exist.', route: '/404.html', body: `<section class="page-hero"><div class="wrap"><p class="kicker">404</p><h1>This page was not found</h1><p class="lede">Head back to the homepage to keep exploring our services and insights.</p><a class="btn primary" href="/">Back to home</a></div></section>` }));

// ── Sitemap & robots ────────────────────────────────────────────────────
const allRoutes = [
  '/', '/services/', '/service-areas/', '/insights/', '/faq/', '/about/', '/contact/', '/404.html',
  ...safeArray(serviceAreas.regions).map(regionRoute),
  ...content.services.map((item) => `/services/${item.slug}/`),
  ...content.insights.map((item) => `/insights/${item.slug}/`),
];
const routeLabels = new Map([
  ['/', 'Home'],
  ['/about/', 'About'],
  ['/services/', 'Services'],
  ['/service-areas/', 'Service Areas'],
  ['/insights/', 'Insights'],
  ['/faq/', 'FAQ'],
  ['/contact/', 'Contact'],
]);
for (const service of content.services) routeLabels.set(`/services/${service.slug}/`, service.title);
for (const insight of content.insights) routeLabels.set(`/insights/${insight.slug}/`, insight.title);
for (const region of safeArray(serviceAreas.regions)) routeLabels.set(regionRoute(region), region.name);
const llms = [
  `# ${brandName}`,
  '',
  content.seo.site_description,
  '',
  'MEL ONE provides carpentry, custom joinery, decking, cabinetry and heritage timber restoration services. Explore the published service, service area and insight pages below.',
  '',
  '## Published pages',
  ...allRoutes.filter((route) => route !== '/404.html').map((route) => `- [${routeLabels.get(route) || route}](${canonical(route)})`),
  '',
].join('\n');
fs.writeFileSync(path.join(siteDir, 'llms.txt'), llms, 'utf8');
fs.writeFileSync(path.join(siteDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${
    allRoutes.filter(r => r !== '/404.html').map(r => `<url><loc>${canonical(r)}</loc></url>`).join('')
  }</urlset>`, 'utf8');
fs.writeFileSync(path.join(siteDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${canonical('/sitemap.xml')}\n`, 'utf8');

console.log('\n✅ Build complete. Output: ' + siteDir);
console.log(`   Total pages: ${allRoutes.length}`);
