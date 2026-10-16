import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const normalize = value => value.replace(/\s+/g, ' ').trim();
export const stringId = value => createHash('sha256').update(normalize(value)).digest('hex').slice(0, 16);
const attributes = ['alt', 'aria-label', 'title', 'placeholder', 'data-area-region'];
const schemaFields = new Set(['name', 'headline', 'description', 'text', 'serviceType', 'articleSection', 'keywords', 'caption']);
const keep = new Set(['MEL ONE', 'Instagram', 'YouTube', 'TikTok', 'Microsoft Clarity', 'Australia', 'AU', 'SA', 'Adelaide', '63 Pirie St', '63 Pirie St, Adelaide, SA 5000', 'English', '中文服务']);
export function isCopy(value) {
  const text = normalize(value);
  return /[A-Za-z]/.test(text) && !keep.has(text) && !/^https?:|^tel:|^mailto:|^[^\s]+@[^\s]+\.[^\s]+$/.test(text);
}
function walkSchema(value, visit, key = '') {
  if (typeof value === 'string') return schemaFields.has(key) ? visit(value) : value;
  if (Array.isArray(value)) return value.map(item => walkSchema(item, visit, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walkSchema(v, visit, k)]));
  return value;
}
export function visitCopy(document, visit) {
  const walker = document.createTreeWalker(document.documentElement, 4);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement.closest('script,style,svg,code,pre')) node.nodeValue = visit(node.nodeValue);
  }
  for (const node of document.querySelectorAll('*')) {
    for (const attribute of attributes) if (node.hasAttribute(attribute)) node.setAttribute(attribute, visit(node.getAttribute(attribute)));
  }
  for (const node of document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')) node.setAttribute('content', visit(node.getAttribute('content')));
  for (const node of document.querySelectorAll('script[type="application/ld+json"]')) node.textContent = JSON.stringify(walkSchema(JSON.parse(node.textContent), visit)).replaceAll('<', '\\u003c');
}
export const chineseRoute = route => route === '/404.html' ? '/zh/404.html' : '/zh' + route;
export function loadTranslations(root) {
  const result = new Map();
  const directory = path.join(root, 'src/i18n');
  if (!fs.existsSync(directory)) return result;
  for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.json'))) {
    for (const [source, target] of Object.entries(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')))) {
      if (typeof target !== 'string' || !target.trim()) throw new Error(`Empty Chinese translation: ${source}`);
      if (result.has(normalize(source)) && result.get(normalize(source)) !== target) throw new Error(`Conflicting Chinese translation: ${source}`);
      result.set(normalize(source), target);
    }
  }
  return result;
}
export function collectCopy(html) {
  const dom = new JSDOM(html);
  const result = new Set();
  visitCopy(dom.window.document, value => { if (isCopy(value)) result.add(normalize(value)); return value; });
  dom.window.close();
  return [...result];
}
export function bilingualPages(html, route, origin, dictionary) {
  const englishUrl = origin + route;
  const chineseUrl = origin + chineseRoute(route);
  const alternates = `<link rel="alternate" hreflang="en-AU" href="${englishUrl}"><link rel="alternate" hreflang="zh-Hans" href="${chineseUrl}"><link rel="alternate" hreflang="x-default" href="${englishUrl}">`;
  const switchLink = `<a class="language-switch" data-language-switch lang="zh-Hans" hreflang="zh-Hans" href="${chineseRoute(route)}">中文服务</a>`;
  const english = html.replace('</head>', alternates + '<meta property="og:locale" content="en_AU"></head>').replace('</nav></div></header>', switchLink + '</nav></div></header>');
  const dom = new JSDOM(english);
  const document = dom.window.document;
  const missing = new Set();
  visitCopy(document, value => {
    const text = normalize(value);
    if (text === ',') return value.replace(',', '、');
    if (!isCopy(text)) return value;
    const translated = dictionary.get(text);
    if (translated) return value.replace(value.trim(), translated);
    missing.add(text);
    return value;
  });
  if (missing.size) { dom.window.close(); return { english, missing: [...missing] }; }
  document.documentElement.lang = 'zh-Hans';
  document.querySelector('link[rel="canonical"]').href = chineseUrl;
  document.querySelector('meta[property="og:url"]').content = chineseUrl;
  document.querySelector('meta[property="og:locale"]').content = 'zh_CN';
  for (const item of document.querySelectorAll('[data-location]')) {
    const region = item.closest('[data-area-region]')?.querySelector('h2')?.textContent || '';
    item.dataset.search += ' ' + normalize(region).toLowerCase();
  }
  for (const link of document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (link.matches('[data-language-switch]')) {
      link.href = route; link.textContent = 'English'; link.lang = 'en'; link.hreflang = 'en-AU';
    } else if (/^\/(?!\/|assets\/|api\/|zh\/)/.test(href)) link.setAttribute('href', chineseRoute(href));
  }
  for (const feed of document.querySelectorAll('link[type="application/feed+json"],link[type="application/rss+xml"]')) feed.setAttribute('href', chineseRoute(feed.getAttribute('href')));
  for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
    const localize = (value, key = '') => {
      if (typeof value === 'string' && value.startsWith(origin + '/') && !value.includes('/assets/') && !value.endsWith('/#business')) return origin + chineseRoute(value.slice(origin.length));
      if (Array.isArray(value)) return value.map(item => localize(item, key));
      if (value && typeof value === 'object') {
        const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v, k)]));
        if (result.inLanguage || ['WebPage', 'CollectionPage', 'ContactPage', 'AboutPage', 'Article', 'BlogPosting', 'FAQPage'].includes(result['@type'])) result.inLanguage = 'zh-Hans';
        return result;
      }
      return value;
    };
    node.textContent = JSON.stringify(localize(JSON.parse(node.textContent))).replaceAll('<', '\\u003c');
  }
  const chinese = dom.serialize().replace(/^[\t ]+$/gm, '');
  dom.window.close();
  return { english, chinese, missing: [] };
}
