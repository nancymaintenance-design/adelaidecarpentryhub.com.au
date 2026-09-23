const button = document.querySelector('.menu');
const nav = document.querySelector('.nav');
if (button && nav) button.addEventListener('click', () => {
  const open = nav.dataset.open !== 'true';
  nav.dataset.open = String(open);
  button.setAttribute('aria-expanded', String(open));
});

for (const form of document.querySelectorAll('form[data-contact-form]')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    const status = form.querySelector('[data-brief-status]');
    const missing = [
      [name, 'name', 'Please enter your name.'],
      [phone, 'phone', 'Please add a phone number.'],
      [email, 'email', 'Please add an email address.'],
      [message, 'message', 'Please add a short project note before saving.']
    ].find(([value]) => !value);
    if (missing) { status.textContent = missing[2]; form.elements[missing[1]].focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; form.elements.email.focus(); return; }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Sending your enquiry…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, message, website: String(data.get('website') || '') }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send your enquiry.');
      form.reset();
      status.textContent = 'Thank you — your enquiry has been sent to MEL ONE.';
    } catch (error) {
      status.textContent = error.message || 'We could not send your enquiry. Please call or email us directly.';
    } finally {
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
    status.textContent = query ? `${visible} ${visible === 1 ? 'street' : 'streets'} found for “${input.value.trim()}”.` : `Showing all ${items.length} streets.`;
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
    message.value = `Project location: ${selectedLocation}\n\n`;
    message.focus();
  }
}
