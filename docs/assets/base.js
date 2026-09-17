const button = document.querySelector('.menu');
const nav = document.querySelector('.nav');
if (button && nav) button.addEventListener('click', () => {
  const open = nav.dataset.open !== 'true';
  nav.dataset.open = String(open);
  button.setAttribute('aria-expanded', String(open));
});

for (const form of document.querySelectorAll('form[data-local-brief]')) {
  form.addEventListener('submit', event => {
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
    const text = 'MEL ONE project brief\n\nName: ' + name + '\nPhone: ' + phone + '\nEmail: ' + email + '\n\nProject or first question:\n' + message + '\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'mel-one-project-brief.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Your project note has been saved on this device.';
  });
}
