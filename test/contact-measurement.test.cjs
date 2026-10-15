const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'src/assets/base.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/contact/index.html'), 'utf8');
const enquiry = { name: 'Alex Example', phone: '0400 000 000', email: 'alex@example.com', message: 'Repair the timber gate at 10 Example Street.', website: '' };
const tick = () => new Promise(resolve => setImmediate(resolve));

function client(t, fetchResponse = async () => ({ ok: true, json: async () => ({ ok: true }) }), analytics = 'working') {
  const dom = new JSDOM(html, { url: 'https://adelaidecarpentryhub.com.au/contact/?street=10%20Example%20Street', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  const requests = [];
  const events = [];
  window.fetch = async (...args) => { requests.push(args); return fetchResponse(...args); };
  if (analytics !== 'missing') window.gtag = (...args) => {
    events.push(JSON.parse(JSON.stringify(args)));
    if (analytics === 'throwing') throw new Error('Analytics unavailable');
  };
  window.eval(script);
  const form = window.document.querySelector('form[data-contact-form]');
  const status = form.querySelector('[data-brief-status]');
  const button = form.querySelector('button[type="submit"]');
  const fill = (values = enquiry) => Object.entries(values).forEach(([key, value]) => { form.elements[key].value = value; });
  const submit = () => {
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  };
  fill();
  return { window, form, status, button, requests, events, fill, submit };
}

test('accepted enquiry resets the form and emits one static generate_lead event', async t => {
  const app = client(t);
  app.submit();
  await tick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0][0], '/api/contact');
  assert.equal(app.requests[0][1].method, 'POST');
  assert.deepEqual(JSON.parse(app.requests[0][1].body), enquiry);
  assert.deepEqual(app.events, [['event', 'generate_lead', { form_name: 'carpentry_enquiry' }]]);
  assert.equal(app.form.elements.name.value, '');
  assert.match(app.status.textContent, /has been sent/);
  assert.equal(app.button.disabled, false);
});

test('a pending enquiry blocks repeat submissions but allows a later new enquiry', async t => {
  let accept;
  const app = client(t, () => new Promise(resolve => { accept = resolve; }));
  app.submit();
  app.submit();
  assert.equal(app.requests.length, 1);
  assert.equal(app.button.disabled, true);
  accept({ ok: true, json: async () => ({ ok: true }) });
  await tick();
  assert.equal(app.events.length, 1);
  app.fill();
  app.submit();
  assert.equal(app.requests.length, 2);
  accept({ ok: true, json: async () => ({ ok: true }) });
  await tick();
  assert.equal(app.events.length, 2);
});

for (const [label, response] of [
  ['network rejection', async () => { throw new Error('Offline'); }],
  ['HTTP failure with an ok payload', async () => ({ ok: false, json: async () => ({ ok: true, error: 'Not accepted' }) })],
  ['HTTP success with a rejected payload', async () => ({ ok: true, json: async () => ({ ok: false, error: 'Not accepted' }) })],
  ['HTTP success without explicit payload success', async () => ({ ok: true, json: async () => ({}) })],
  ['HTTP success with a truthy non-boolean payload', async () => ({ ok: true, json: async () => ({ ok: 'true' }) })],
  ['invalid JSON response', async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid response'); } })],
]) {
  test(`${label} preserves enquiry values and emits no lead`, async t => {
    const app = client(t, response);
    app.submit();
    await tick();
    assert.equal(app.requests.length, 1);
    for (const [key, value] of Object.entries(enquiry)) assert.equal(app.form.elements[key].value, value);
    assert.deepEqual(app.events, []);
    assert.doesNotMatch(app.status.textContent, /has been sent/);
    assert.equal(app.button.disabled, false);
  });
}

for (const [field, value] of [['name', ''], ['phone', ''], ['email', ''], ['message', ''], ['email', 'not-an-email'], ['website', 'bot.example']]) {
  test(`invalid ${field} (${value || 'empty'}) sends no request or lead`, async t => {
    const app = client(t);
    app.form.elements[field].value = value;
    app.submit();
    await tick();
    assert.equal(app.requests.length, 0);
    assert.deepEqual(app.events, []);
    assert.equal(app.form.elements.message.value, field === 'message' ? '' : enquiry.message);
    assert.equal(app.button.disabled, false);
  });
}

for (const analytics of ['missing', 'throwing']) {
  test(`${analytics} analytics cannot turn a successful enquiry into failure`, async t => {
    const app = client(t, undefined, analytics);
    app.submit();
    await tick();
    assert.match(app.status.textContent, /has been sent/);
    assert.equal(app.form.elements.message.value, '');
    assert.equal(app.button.disabled, false);
  });
}

for (const [scheme, method] of [['tel:', 'phone'], ['mailto:', 'email']]) {
  for (const analytics of ['working', 'missing', 'throwing']) {
    test(`${method} click keeps synchronous navigation with ${analytics} analytics`, t => {
      const app = client(t, undefined, analytics);
      const link = app.window.document.querySelector(`a[href^="${scheme}"]`);
      const errors = [];
      app.window.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
      let prevented;
      // Observe native navigation eligibility after the production handler, then suppress JSDOM's unsupported navigation.
      link.addEventListener('click', event => { prevented = event.defaultPrevented; event.preventDefault(); });
      link.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.equal(prevented, false);
      assert.deepEqual(errors, []);
      assert.deepEqual(app.events, analytics === 'missing' ? [] : [['event', 'contact_click', { contact_method: method }]]);
    });
  }
}
