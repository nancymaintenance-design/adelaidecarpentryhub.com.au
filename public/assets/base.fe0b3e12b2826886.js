const chinese = document.documentElement.lang.startsWith('zh');
const ui = (english, translation) => chinese ? translation : english;
normalizeLegacyStreetState();
// Equivalent pages keep the selected street, directory search and section anchor.
for (const link of document.querySelectorAll('[data-language-switch]')) {
  const updateDestination = () => {
    const destination = new URL(link.getAttribute('href'), window.location.href);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    link.href = destination.pathname + destination.search + destination.hash;
  };
  updateDestination();
  link.addEventListener('click', updateDestination);
  window.addEventListener('hashchange', updateDestination);
  window.addEventListener('popstate', updateDestination);
}

const header = document.querySelector('.site-header');
if (header) {
  const updateHeaderHeight = () => {
    const height = Math.ceil(header.getBoundingClientRect().height);
    if (height > 0) document.documentElement.style.setProperty('--site-header-height', `${height}px`);
  };
  updateHeaderHeight();
  if (typeof ResizeObserver === 'function') new ResizeObserver(updateHeaderHeight).observe(header);
  window.addEventListener('resize', updateHeaderHeight);
}

const button = document.querySelector('.menu');
const nav = document.querySelector('.nav');
if (button && nav) button.addEventListener('click', () => {
  const open = nav.dataset.open !== 'true';
  nav.dataset.open = String(open);
  button.setAttribute('aria-expanded', String(open));
});

function trackContactEvent(name, parameters) {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, parameters);
  } catch {
    // Contact actions remain usable when analytics is unavailable.
  }
}

// Reuse the installed analytics destination; navigation is never a lead conversion.
for (const link of document.querySelectorAll('.breadcrumbs a[data-breadcrumb-position]')) {
  link.addEventListener('click', () => trackContactEvent('breadcrumb_click', {
    source_path: window.location.pathname,
    target_path: new URL(link.href, window.location.origin).pathname,
    locale: chinese ? 'zh-Hans' : 'en-AU',
    position: Number(link.dataset.breadcrumbPosition),
    owner_id: link.closest('.breadcrumbs').dataset.ownerId,
  }));
}

for (const link of document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')) {
  const method = link.getAttribute('href').startsWith('tel:') ? 'phone' : 'email';
  link.addEventListener('click', () => trackContactEvent('contact_click', { contact_method: method }));
}

for (const form of document.querySelectorAll('form[data-contact-form]')) {
  let pending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const status = form.querySelector('[data-brief-status]');
    if (String(data.get('website') || '').trim()) { status.textContent = ui('Please submit a valid enquiry.', '请填写有效的咨询信息。'); return; }
    const missing = [
      [name, 'name', ui('Please enter your name.', '请填写您的姓名。')],
      [phone, 'phone', ui('Please add a phone number.', '请填写联系电话。')],
      [email, 'email', ui('Please add an email address.', '请填写电子邮箱。')],
      [message, 'message', ui('Please describe the repair or installation before sending your enquiry.', '发送咨询前，请简要说明需要维修或安装的项目。')]
    ].find(([value]) => !value);
    if (missing) { status.textContent = missing[2]; form.elements[missing[1]].focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = ui('Please enter a valid email address.', '请填写有效的电子邮箱地址。'); form.elements.email.focus(); return; }
    const button = form.querySelector('button[type="submit"]');
    pending = true;
    button.disabled = true;
    status.textContent = ui('Sending your enquiry…', '正在发送您的咨询……');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, message, website: String(data.get('website') || '') }),
      });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'Unable to send your enquiry.');
      form.reset();
      status.textContent = ui('Thank you — your enquiry has been sent to us. Any visit and assessment charges will be confirmed separately; this is not a booking confirmation.', '感谢您的咨询，信息已发送给我们。上门时间及任何检查费用将另行确认，此提示不代表预约成功。');
      trackContactEvent('generate_lead', { form_name: 'carpentry_enquiry' });
    } catch (error) {
      status.textContent = chinese
        ? (['127.0.0.1', 'localhost'].includes(window.location.hostname) ? '本地预览暂不发送咨询。正式上线后可使用表单，也可直接电话或邮件联系我们。' : '咨询暂未发送成功，请重试，或直接电话、邮件联系我们。')
        : error.message || 'We could not send your enquiry. Please call or email us directly.';
    } finally {
      pending = false;
      button.disabled = false;
    }
  });
}


for (const directory of document.querySelectorAll('[data-area-directory]')) {
  const input = directory.querySelector('[data-area-search]');
  const clear = directory.querySelector('[data-area-clear]');
  const status = directory.querySelector('[data-area-status]');
  const empty = directory.querySelector('[data-area-empty]');
  const regions = [...directory.querySelectorAll('[data-area-region]')];
  const items = [...directory.querySelectorAll('[data-location]')];
  if (!input || !status || !empty) continue;
  const initial = new URLSearchParams(window.location.search).get('location') || '';
  input.value = initial;
  const filter = () => {
    const query = input.value.trim().toLocaleLowerCase('en-AU');
    let visible = 0;
    items.forEach(item => {
      const match = !query || item.dataset.search.includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    });
    regions.forEach(region => {
      region.hidden = ![...region.querySelectorAll('[data-location]')].some(item => !item.hidden);
    });
    empty.hidden = visible !== 0;
    clear.hidden = !query;
    status.textContent = chinese
      ? (query ? `与“${input.value.trim()}”匹配的街道：${visible} 条。` : `显示全部 ${items.length} 条街道。`)
      : query ? `${visible} ${visible === 1 ? 'street' : 'streets'} found for “${input.value.trim()}”.` : `Showing all ${items.length} streets.`;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('location', input.value.trim()); else url.searchParams.delete('location');
    window.history.replaceState({}, '', url);
  };
  input.addEventListener('input', filter);
  clear.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });
  input.addEventListener('keydown', event => { if (event.key === 'Escape' && input.value) { input.value = ''; filter(); } });
  filter();
}


const selectedLocation = new URLSearchParams(window.location.search).get('location');
if (selectedLocation) {
  const message = document.querySelector('form[data-contact-form] textarea[name="message"]');
  if (message && !message.value.trim()) {
    message.value = `${ui('Project location:', '项目地点：')} ${selectedLocation}\n\n`;
    message.focus();
  }
}

function normalizeLegacyStreetState() {
  const street = new URLSearchParams(window.location.search).get('street');
  if (!street) return;
  for (const form of document.querySelectorAll('form[data-area-region]')) {
    let allowed = []; try { allowed = JSON.parse(form.dataset.areaStreets || '[]'); } catch { continue; }
    if (!allowed.includes(street)) continue;
    const url = new URL(window.location.href);
    url.searchParams.delete('street');
    url.hash = `book-area-work&street=${encodeURIComponent(street)}`;
    window.history.replaceState(window.history.state, '', url);
    break;
  }
}

for (const link of document.querySelectorAll('a[data-area-street]')) {
  const destination = new URL(link.getAttribute('href'), window.location.href);
  destination.hash = `book-area-work&street=${encodeURIComponent(link.dataset.areaStreet)}`;
  link.href = destination.pathname + destination.search + destination.hash;
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.href === window.location.href) {
      event.preventDefault();
      applyAreaBookingContext();
    }
  });
}

const areaDraftPrefixes = new WeakMap();
const areaContextDefaults = new WeakMap();
function applyAreaBookingContext() {
  const hash = window.location.hash || '';
  const street = hash.startsWith('#book-area-work&')
    ? new URLSearchParams(hash.slice('#book-area-work&'.length)).get('street')
    : new URLSearchParams(window.location.search).get('street');
  for (const form of document.querySelectorAll('form[data-area-region]')) {
    const region = form.dataset.areaRegion;
    let allowedStreets = [];
    try { allowedStreets = JSON.parse(form.dataset.areaStreets || '[]'); } catch { allowedStreets = []; }
    const message = form.querySelector('textarea[name="message"]');
    const context = form.closest('.area-booking')?.querySelector('[data-area-context]');
    if (context && !areaContextDefaults.has(context)) areaContextDefaults.set(context, context.textContent);
    if (!allowedStreets.includes(street)) {
      const prefix = areaDraftPrefixes.get(form);
      if (message && prefix && message.value.startsWith(prefix)) message.value = message.value.slice(prefix.length);
      areaDraftPrefixes.delete(form);
      if (context) context.textContent = areaContextDefaults.get(context);
      continue;
    }
    const location = `${street}, ${region}`;
    if (context) context.textContent = ui(`Selected location: ${location}. Add the timber work and any access notes. Photos and approximate measurements are optional; existing images can be emailed to handymanfelix.au2026@outlook.com.`, `所选地点：${location}。请补充木工项目及出入安排。照片和大致尺寸并非必需；已有图片可发至 handymanfelix.au2026@outlook.com。`);
    const prefix = `${ui('Project location:', '项目地点：')} ${location}\n\n`;
    const previous = areaDraftPrefixes.get(form);
    if (message && (!message.value.trim() || (previous && message.value.startsWith(previous)))) {
      message.value = prefix + (previous && message.value.startsWith(previous) ? message.value.slice(previous.length) : '');
      areaDraftPrefixes.set(form, prefix);
    }
    if (hash.startsWith('#book-area-work&')) document.getElementById('book-area-work')?.scrollIntoView?.({block:'start'});
  }
}

applyAreaBookingContext();
window.addEventListener('hashchange', applyAreaBookingContext);
window.addEventListener('popstate', applyAreaBookingContext);
