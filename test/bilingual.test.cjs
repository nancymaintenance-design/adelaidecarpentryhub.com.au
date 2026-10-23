const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const output = path.join(root, 'public');
const origin = 'https://www.adelaidecarpentryhub.com.au';
const read = route => fs.readFileSync(path.join(output, route.endsWith('.html') ? route : route + 'index.html'), 'utf8');
const routes = [...fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
const englishRoutes = routes.filter(route => !route.startsWith('/zh/'));
const dom = route => new JSDOM(read(route), { url: origin + route, runScripts: 'outside-only' });
const script = fs.readFileSync(path.join(root, 'src/assets/base.js'), 'utf8');

test('every public page has an equivalent Chinese page with reciprocal language SEO and unchanged media/sections', () => {
  assert.equal(englishRoutes.length, 48);
  assert.equal(routes.length, 96);
  for (const route of [...englishRoutes, '/404.html']) {
    const en = dom(route), zh = dom('/zh' + route);
    const e = en.window.document, z = zh.window.document;
    assert.equal(z.documentElement.lang, 'zh-Hans', route);
    assert.equal(z.querySelector('link[rel="canonical"]').href, origin + '/zh' + route);
    for (const document of [e, z]) {
      assert.equal(document.querySelector('link[hreflang="en-AU"]').href, origin + route);
      assert.equal(document.querySelector('link[hreflang="zh-Hans"]').href, origin + '/zh' + route);
      assert.equal(document.querySelector('link[hreflang="x-default"]').href, origin + route);
    }
    for (const selector of ['h1', 'h2', 'h3', 'details', 'table', 'figure']) assert.equal(z.querySelectorAll(selector).length, e.querySelectorAll(selector).length, route + ' ' + selector);
    assert.deepEqual([...z.querySelectorAll('img')].map(image => image.getAttribute('src')), [...e.querySelectorAll('img')].map(image => image.getAttribute('src')), route);
    assert.match(z.title, /[\u3400-\u9fff]/, route);
    assert.match(z.querySelector('meta[name="description"]').content, /[\u3400-\u9fff]/, route);
    const language = e.querySelector('[data-language-switch]');
    assert.equal(language.textContent, '中文服务');
    assert.equal(language.previousElementSibling.getAttribute('href'), '/contact/');
    assert.equal(z.querySelector('[data-language-switch]').getAttribute('href'), route);
    for (const telephone of z.querySelectorAll('footer a[href^="tel:"]')) assert.equal(telephone.getAttribute('href'), 'tel:+61403202949');
    en.window.close(); zh.window.close();
  }
});

test('About pages show three customer advisers and retain company facts without redundant booking sections', () => {
  for (const route of ['/about/', '/zh/about/']) {
    const page = dom(route), document = page.window.document;
    const advisers = [...document.querySelectorAll('.adviser-card')];
    assert.equal(advisers.length, 3, route);
    for (const [index, name, phone, href] of [[0, 'Riley', '048 242 2607', 'tel:+61482422607'], [1, 'Ella', '041 661 4281', 'tel:+61416614281'], [2, 'Felix', '040 320 2949', 'tel:+61403202949']]) {
      assert.equal(advisers[index].querySelector('h3').textContent, name);
      assert.equal(advisers[index].querySelector('a').textContent, phone);
      assert.equal(advisers[index].querySelector('a').getAttribute('href'), href);
      assert.ok(advisers[index].querySelector('p').textContent.length > 35);
    }
    assert.equal(document.querySelectorAll('.company-details > div').length, 9);
    assert.equal(document.querySelectorAll('.value-grid, .about-faq, main .closing').length, 0);
    assert.doesNotMatch(document.querySelector('main').textContent, /Company registration and insurance|公司注册及保险不能|Site Assessment, Work Scope and Booking|现场评估、施工范围与预约/);
    assert.equal(document.querySelectorAll('.about-image').length, 1);
    page.window.close();
  }
});

test('Chinese internal links stay Chinese and resolve to files and section anchors', () => {
  for (const route of [...routes.filter(route => route.startsWith('/zh/')), '/zh/404.html']) {
    const page = dom(route), document = page.window.document;
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (!href.startsWith('/') && !href.startsWith('#')) continue;
      if (link.matches('[data-language-switch]')) continue;
      const destination = new URL(href, origin + route);
      assert.ok(destination.pathname.startsWith('/zh/'), route + ' → ' + href);
      const filename = path.join(output, destination.pathname.endsWith('/') ? destination.pathname + 'index.html' : destination.pathname);
      assert.ok(fs.existsSync(filename), route + ' → ' + href);
      if (destination.hash) assert.ok(new JSDOM(fs.readFileSync(filename, 'utf8')).window.document.getElementById(decodeURIComponent(destination.hash.slice(1))), route + ' → ' + href);
    }
    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      const graph = JSON.parse(node.textContent);
      assert.ok(graph['@context']);
      for (const question of (graph['@graph'] || [graph]).flatMap(item => item.mainEntity || []).filter(item => item['@type'] === 'Question')) {
        assert.match(question.name, /[\u3400-\u9fff]/);
        assert.match(question.acceptedAnswer.text, /[\u3400-\u9fff]/);
      }
    }
    page.window.close();
  }
});

test('language switching preserves selected street and current anchor in both directions', () => {
  for (const [current, target] of [['', '/zh'], ['/zh', '']]) {
    const route = '/service-areas/adelaide-cbd/';
    const page = new JSDOM(read(current + route), { url: origin + current + route + '?street=Rundle%20Mall#book-area-work', runScripts: 'outside-only' });
    page.window.eval(script);
    const link = page.window.document.querySelector('[data-language-switch]');
    assert.equal(new URL(link.href).pathname, target + route);
    assert.equal(new URL(link.href).searchParams.get('street'), null);
    assert.equal(new URL(link.href).hash, '#book-area-work&street=Rundle%20Mall');
    assert.match(page.window.document.querySelector('textarea').value, /Rundle Mall/);
    if (current) assert.match(page.window.document.querySelector('[data-area-context]').textContent, /^所选地点/);
    page.window.close();
  }
});

test('Chinese directory filtering and reset keep localised status messages', () => {
  const page = dom('/zh/service-areas/'); page.window.eval(script);
  const document = page.window.document;
  const input = document.querySelector('[data-area-search]');
  assert.match(document.querySelector('[data-area-status]').textContent, /^显示全部/);
  input.value = 'Pirie'; input.dispatchEvent(new page.window.Event('input'));
  assert.match(document.querySelector('[data-area-status]').textContent, /匹配的街道：1 条/);
  assert.equal(document.querySelectorAll('[data-location]:not([hidden])').length, 1);
  document.querySelector('[data-area-clear]').click();
  assert.match(document.querySelector('[data-area-status]').textContent, /^显示全部/);
  input.value = '北阿德莱德'; input.dispatchEvent(new page.window.Event('input'));
  assert.equal(document.querySelectorAll('[data-location]:not([hidden])').length, 7);
  const switchLink = document.querySelector('[data-language-switch]');
  page.window.history.replaceState({}, '', '?location=Pirie#main');
  switchLink.addEventListener('click', event => event.preventDefault());
  switchLink.click();
  assert.equal(new URL(switchLink.href).searchParams.get('location'), 'Pirie');
  assert.equal(new URL(switchLink.href).hash, '#main');
  page.window.close();
});

test('Chinese contact validation and local preview failure are translated without transmitting a live enquiry', async () => {
  const page = new JSDOM(read('/zh/contact/'), { url: 'http://127.0.0.1:5186/zh/contact/', runScripts: 'outside-only' });
  let requests = 0;
  page.window.fetch = async () => { requests++; return { ok: false, json: async () => ({ error: 'Local preview disabled' }) }; };
  page.window.eval(script);
  const form = page.window.document.querySelector('form');
  form.dispatchEvent(new page.window.Event('submit', { cancelable: true }));
  assert.equal(form.querySelector('[data-brief-status]').textContent, '请填写您的姓名。');
  assert.equal(requests, 0);
  for (const [name, value] of Object.entries({ name: '测试', phone: '000', email: 'test@example.invalid', message: '仅用于离线测试' })) form.elements[name].value = value;
  form.dispatchEvent(new page.window.Event('submit', { cancelable: true }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 1);
  assert.match(form.querySelector('[data-brief-status]').textContent, /^本地预览暂不发送咨询/);
  assert.equal(form.querySelector('button[type="submit"]').disabled, false);
  page.window.close();
});

test('new or revised English copy blocks an incomplete Chinese build rather than silently falling back', async () => {
  const { bilingualPages, loadTranslations } = await import('../tools/i18n.mjs');
  const html = read('/contact/');
  const dictionary = loadTranslations(root);
  const known = bilingualPages(html, '/contact/', origin, dictionary);
  assert.equal(known.missing.length, 0);
  const changed = bilingualPages(html.replace('Describe Your Carpentry Work', 'A revised service scope that needs a new translation'), '/contact/', origin, dictionary);
  assert.ok(changed.missing.includes('A revised service scope that needs a new translation'));
  assert.equal(changed.chinese, undefined);
});

test('Chinese service and region catalogues, feeds and AI index cover the same work', () => {
  const services = JSON.parse(fs.readFileSync(path.join(output, 'zh/services.json')));
  const feed = JSON.parse(fs.readFileSync(path.join(output, 'zh/feed.json')));
  const areas = JSON.parse(fs.readFileSync(path.join(output, 'zh/service-areas.json')));
  assert.equal(services.items.length, 25);
  assert.equal(feed.items.length, 36);
  assert.equal(areas.regions.length, 5);
  for (const item of [...services.items, ...feed.items]) {
    assert.match(item.title, /[\u3400-\u9fff]/);
    assert.match(item.url, /\/zh\//);
  }
  assert.equal(feed.language, 'zh-Hans');
  assert.match(feed.items[0].content_text, /[\u3400-\u9fff]/);
  assert.match(fs.readFileSync(path.join(output, 'zh/rss.xml'), 'utf8'), /<language>zh-Hans<\/language>/);
  const index=fs.readFileSync(path.join(output, 'zh/llms.txt'), 'utf8');
  assert.equal(index,fs.readFileSync(path.join(output,'llms.txt'),'utf8'));
  assert.ok(index.includes('https://www.adelaidecarpentryhub.com.au/zh/services/'));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'clarity-site.json')));
  assert.ok(config.excludedPaths.includes('/zh/contact/'));
  assert.equal(config.privacyPaths.zh, '/zh/clarity-privacy/');
});
