const RECIPIENT = 'handymanfelix.au2026@outlook.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 4000;

const text = (value) => String(value || '').trim();
const escapeHtml = (value) => text(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function validateContact(input = {}) {
  const name = text(input.name);
  const phone = text(input.phone);
  const email = text(input.email);
  const message = text(input.message);

  if (text(input.website)) return { error: 'Please submit a valid enquiry.' };
  if (!name) return { error: 'Please enter your name.' };
  if (!phone) return { error: 'Please add a phone number.' };
  if (!email || !EMAIL_PATTERN.test(email)) return { error: 'Please enter a valid email address.' };
  if (!message) return { error: 'Please add your project details or question.' };
  if ([name, phone, email, message].some((value) => value.length > MAX_FIELD_LENGTH)) {
    return { error: 'One or more fields are too long.' };
  }

  return { value: { name, phone, email, message } };
}

function createEmailPayload(enquiry, from) {
  const safe = Object.fromEntries(Object.entries(enquiry).map(([key, value]) => [key, escapeHtml(value)]));
  return {
    from,
    to: [RECIPIENT],
    reply_to: enquiry.email,
    subject: `New MEL ONE website enquiry — ${enquiry.name}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17372f;line-height:1.5"><h1>New MEL ONE website enquiry</h1><p><strong>Name:</strong> ${safe.name}</p><p><strong>Phone:</strong> ${safe.phone}</p><p><strong>Email:</strong> ${safe.email}</p><hr><p><strong>Project or question:</strong></p><p>${safe.message.replaceAll('\n', '<br>')}</p></body></html>`,
    text: `New MEL ONE website enquiry\n\nName: ${enquiry.name}\nPhone: ${enquiry.phone}\nEmail: ${enquiry.email}\n\nProject or question:\n${enquiry.message}`,
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const validation = validateContact(await readBody(req));
    if (validation.error) return res.status(400).json(validation);

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return res.status(500).json({ error: 'Email delivery is not configured yet.' });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(createEmailPayload(validation.value, from)),
    });
    if (!response.ok) {
      console.error('Resend rejected contact email:', response.status, await response.text());
      return res.status(502).json({ error: 'We could not send your enquiry. Please call or email us directly.' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(400).json({ error: 'Please check your details and try again.' });
  }
}

module.exports = handler;
module.exports.validateContact = validateContact;
module.exports.createEmailPayload = createEmailPayload;
