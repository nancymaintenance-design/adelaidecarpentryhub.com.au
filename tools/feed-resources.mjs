import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { normalize } from './i18n.mjs';

const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Only writes the existing JSON/RSS endpoints. Page bytes and JSON-LD are untouched.
export function enhanceFeeds(directory, pages, origin) {
  for (const prefix of ['', '/zh']) {
    const output = path.join(directory, prefix);
    const file = path.join(output, 'feed.json');
    const feed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const historic = new Map(feed.items.map(item => [item.url, item]));
    const routes = [
      ...feed.items.map(item => new URL(item.url).pathname),
      ...[...pages.keys()].filter(route => route.startsWith(prefix + '/services/') && route !== prefix + '/services/' && (prefix || !route.startsWith('/zh/'))),
      prefix + '/about/',
    ];
    feed.items = routes.map(route => {
      const html = pages.get(route);
      if (!html) throw new Error(`Feed page is missing: ${route}`);
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const main = document.querySelector('main').cloneNode(true);
      main.querySelectorAll('script,style,iframe,form,button,input,select,textarea,nav,aside').forEach(node => node.remove());
      for (const node of main.querySelectorAll('[href],[src],[srcset]')) {
        for (const attribute of ['href', 'src']) if (node.hasAttribute(attribute)) {
          const value = node.getAttribute(attribute);
          const absolute = new URL(value, origin + route);
          if (['https:', 'http:', 'mailto:', 'tel:'].includes(absolute.protocol)) node.setAttribute(attribute, absolute.href);
          else node.removeAttribute(attribute);
        }
        if (node.hasAttribute('srcset')) node.setAttribute('srcset', node.getAttribute('srcset').split(',').map(part => {
          const [url, descriptor] = part.trim().split(/\s+/);
          const absolute = new URL(url, origin + route);
          return ['http:', 'https:'].includes(absolute.protocol) ? [absolute.href, descriptor].filter(Boolean).join(' ') : '';
        }).filter(Boolean).join(', '));
      }
      const url = origin + route;
      const previous = historic.get(url);
      const title = normalize(main.querySelector('h1').textContent);
      const summary = previous?.summary || normalize(main.querySelector('.lede')?.textContent || document.querySelector('meta[name="description"]').content);
      const tags = [...new Set([...main.querySelectorAll('h1,h2')].map(node => normalize(node.textContent)))].slice(0, 8);
      const item = {
        id: previous?.id || url, url, title, summary,
        content_html: main.innerHTML.replace(/^[\t ]+$/gm, '').trim(),
        content_text: [...main.querySelectorAll('h1,h2,h3,p,summary,figcaption,li,dt,dd,tr')].filter(node => !node.parentElement.closest('li,tr')).map(node => normalize(node.textContent)).join('\n\n'),
        ...(previous?.date_published ? {date_published: previous.date_published} : {}),
        ...(previous?.date_modified ? {date_modified: previous.date_modified} : {}),
        ...(document.querySelector('.editorial-attribution') ? {authors: [{name: 'MEL ONE', url: origin + prefix + '/about/'}]} : {}),
        tags,
      };
      dom.window.close();
      return item;
    });
    const company = feed.items.find(item => item.url === origin + prefix + '/about/');
    const hub = new JSDOM(pages.get(prefix + '/services/'));
    feed.title = 'MEL ONE — ' + normalize(hub.window.document.querySelector('h1').textContent);
    hub.window.close();
    feed.description = company.summary;
    feed.home_page_url = origin + prefix + '/';
    fs.writeFileSync(file, JSON.stringify(feed, null, 2) + '\n');
    const rssUrl = origin + prefix + '/rss.xml';
    const items = feed.items.map(item => `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(item.url)}</link><guid isPermaLink="true">${escapeXml(item.id)}</guid><description>${escapeXml(item.summary)}</description><content:encoded>${escapeXml(item.content_html)}</content:encoded>${item.authors ? `<dc:creator>${escapeXml(item.authors[0].name)}</dc:creator>` : ''}${item.date_published ? `<pubDate>${new Date(item.date_published).toUTCString()}</pubDate>` : ''}${item.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('')}</item>`).join('');
    fs.writeFileSync(path.join(output, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(feed.title)}</title><link>${escapeXml(feed.home_page_url)}</link><description>${escapeXml(feed.description)}</description><language>${feed.language}</language><atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`);
  }
}
