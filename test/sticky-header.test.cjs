const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'assets', 'base.js'), 'utf8');

function page({ observer = true, header = true } = {}) {
  const dom = new JSDOM(header ? '<header class="site-header"><button class="menu" aria-expanded="false">Menu</button><nav class="nav"></nav></header>' : '<main></main>', {
    url: 'https://www.adelaidecarpentryhub.com.au/', runScripts: 'outside-only',
  });
  let height = 95;
  let notifyResize;
  const element = dom.window.document.querySelector('.site-header');
  if (element) element.getBoundingClientRect = () => ({ height });
  if (observer) dom.window.ResizeObserver = class {
    constructor(callback) { notifyResize = callback; }
    observe() {}
  };
  dom.window.eval(script);
  return { dom, setHeight(value) { height = value; }, resize() { notifyResize(); } };
}

// Removing header measurement, its observer, or its resize fallback must break these contracts.
test('anchor clearance tracks the rendered header when navigation wraps or text changes', () => {
  const fixture = page();
  const root = fixture.dom.window.document.documentElement;
  assert.equal(root.style.getPropertyValue('--site-header-height'), '95px');
  fixture.setHeight(158.5);
  fixture.resize();
  assert.equal(root.style.getPropertyValue('--site-header-height'), '159px');
  fixture.setHeight(83);
  fixture.resize();
  assert.equal(root.style.getPropertyValue('--site-header-height'), '83px');
  fixture.dom.window.close();
});

test('header clearance responds to viewport resize when ResizeObserver is unavailable', () => {
  const fixture = page({ observer: false });
  fixture.setHeight(71);
  fixture.dom.window.dispatchEvent(new fixture.dom.window.Event('resize'));
  assert.equal(fixture.dom.window.document.documentElement.style.getPropertyValue('--site-header-height'), '71px');
  fixture.dom.window.close();
});

test('mobile navigation remains operable after header measurement starts', () => {
  const fixture = page();
  const document = fixture.dom.window.document;
  document.querySelector('.menu').click();
  assert.equal(document.querySelector('.nav').dataset.open, 'true');
  assert.equal(document.querySelector('.menu').getAttribute('aria-expanded'), 'true');
  document.querySelector('.menu').click();
  assert.equal(document.querySelector('.nav').dataset.open, 'false');
  fixture.dom.window.close();
});

test('pages without a shared header keep their default clearance', () => {
  const fixture = page({ header: false });
  assert.equal(fixture.dom.window.document.documentElement.style.getPropertyValue('--site-header-height'), '');
  fixture.dom.window.close();
});
