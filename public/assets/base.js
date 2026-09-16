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
    const message = String(data.get('message') || '').trim();
    const status = form.querySelector('[data-brief-status]');
    if (!message) { status.textContent = '请先填写想解决的问题。'; form.elements.message.focus(); return; }
    const text = '沟通要点\n\n称呼：' + name + '\n想解决的问题：\n' + message + '\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'communication-brief.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '沟通要点已保存到本机。';
  });
}
