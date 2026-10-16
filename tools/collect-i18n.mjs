import fs from 'node:fs';
import path from 'node:path';
import { collectCopy, loadTranslations } from './i18n.mjs';

const root = process.cwd();
const dictionary = loadTranslations(root);
const entries = new Map();
const walk = directory => {
  for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
    if (file.name === 'zh' || file.name === 'assets') continue;
    const filename = path.join(directory, file.name);
    if (file.isDirectory()) walk(filename);
    else if (file.name.endsWith('.html')) {
      const route = '/' + path.relative(path.join(root, 'public'), filename).replaceAll('\\', '/').replace(/index\.html$/, '');
      for (const source of collectCopy(fs.readFileSync(filename, 'utf8'))) {
        if (!dictionary.has(source)) {
          if (!entries.has(source)) entries.set(source, []);
          entries.get(source).push(route);
        }
      }
    }
  }
};
walk(path.join(root, 'public'));
const resourceFields = new Set(['title', 'name', 'description', 'summary', 'tags']);
const collectResource = (value, key = '') => {
  if (typeof value === 'string' && resourceFields.has(key) && /[A-Za-z]/.test(value) && !/^https?:/.test(value) && !dictionary.has(value) && value !== 'Adelaide') entries.set(value, ['/resources/']);
  else if (Array.isArray(value)) value.forEach(item => collectResource(item, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collectResource(v, k));
};
for (const file of ['services.json', 'service-areas.json', 'feed.json']) collectResource(JSON.parse(fs.readFileSync(path.join(root, 'public', file), 'utf8')));
const groups = { shared: {}, servicesA: {}, servicesB: {}, guides: {} };
for (const [source, routes] of entries) {
  const serviceRoutes = routes.filter(route => /^\/services\/.+\/$/.test(route));
  const allServices = [...new Set([...entries.values()].flat().filter(route => /^\/services\/.+\/$/.test(route)))].sort();
  const group = routes.length > 3 ? 'shared' : routes.some(route => route.startsWith('/insights/')) ? 'guides' : serviceRoutes.length ? (allServices.indexOf(serviceRoutes[0]) < 13 ? 'servicesA' : 'servicesB') : 'shared';
  groups[group][source] = '';
}
const directory = path.join(root, '../reports/i18n/translation-gaps');
fs.mkdirSync(directory, { recursive: true });
for (const [group, catalogue] of Object.entries(groups)) {
  fs.writeFileSync(path.join(directory, group + '.json'), JSON.stringify(catalogue, null, 2) + '\n');
  console.log(group, Object.keys(catalogue).length, JSON.stringify(catalogue).length);
}
