import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { chineseRoute, isCopy, normalize } from './i18n.mjs';
import { enhanceFeeds } from './feed-resources.mjs';

export function localizedResources(directory, pages, origin, dictionary) {
  const translate = value => {
    if (!isCopy(value)) return value;
    const translated = dictionary.get(normalize(value));
    if (!translated) throw new Error(`Resource string needs Chinese translation: ${value}`);
    return translated;
  };
  const url = value => value.startsWith(origin + '/') ? origin + chineseRoute(value.slice(origin.length)) : value;
  const fields = new Set(['title', 'name', 'description', 'summary']);
  const localize = (value, key = '') => {
    if (typeof value === 'string') return value.startsWith('https://') ? url(value) : fields.has(key) ? translate(value) : value;
    if (Array.isArray(value)) return value.map(item => localize(item, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v, k)]));
    return value;
  };
  const output = path.join(directory, 'zh');
  fs.mkdirSync(output, { recursive: true });
  for (const file of ['services.json', 'service-areas.json', 'feed.json']) {
    const original = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    const translated = localize(original);
    translated.language = 'zh-Hans';
    if (file === 'feed.json') for (const item of translated.items) {
      const dom = new JSDOM(pages.get(new URL(item.url).pathname));
      const article = dom.window.document.querySelector('article') || dom.window.document.querySelector('main');
      item.content_text = [...article.querySelectorAll('h2,h3,p,table')].map(node => normalize(node.textContent)).join('\n\n');
      item.tags = item.tags.map(translate);
      dom.window.close();
    }
    fs.writeFileSync(path.join(output, file), JSON.stringify(translated, null, 2) + '\n');
  }
  const feed = JSON.parse(fs.readFileSync(path.join(output, 'feed.json'), 'utf8'));
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  fs.writeFileSync(path.join(output, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(feed.title)}</title><link>${origin}/zh/insights/</link><description>${escape(feed.description)}</description><language>zh-Hans</language>${feed.items.map(item => `<item><title>${escape(item.title)}</title><link>${item.url}</link><guid isPermaLink="true">${item.id}</guid><description>${escape(item.summary)}</description>${item.date_published ? `<pubDate>${new Date(item.date_published).toUTCString()}</pubDate>` : ''}</item>`).join('')}</channel></rss>`);
  const lines = ['# MEL ONE 中文服务', '', translate('MEL ONE provides Adelaide carpentry, custom joinery, decking, cabinetry and heritage timber restoration. Request a clear quote from one local team.'), '', '## 中文页面'];
  for (const [route, html] of pages) {
    if (!route.startsWith('/zh/') || route.endsWith('404.html')) continue;
    const dom = new JSDOM(html);
    lines.push(`- [${dom.window.document.querySelector('h1').textContent}](${origin}${route})`);
    dom.window.close();
  }
  fs.writeFileSync(path.join(output, 'llms.txt'), lines.join('\n') + '\n');
  enhanceFeeds(directory, pages, origin);
}
