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
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { status.textContent = 'Please enter a valid email address.'; form.elements.email.focus(); return; }
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
