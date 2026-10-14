const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'public');
// Exact aliases share the locally prepared Vercel contract. No API is loaded here.
const { redirects = [] } = require('./vercel.json');
const aliases = new Map(redirects.map(rule => [rule.source, rule.destination]));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function createPreviewServer() {
  return http.createServer((req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8', headers = {}) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const notFound = () => {
      try { send(404, fs.readFileSync(path.join(ROOT, '404.html')), mimeTypes['.html']); }
      catch { send(404, 'Page not found'); }
    };
    const raw = req.url || '/';
    const queryAt = raw.indexOf('?');
    const rawPath = queryAt < 0 ? raw : raw.slice(0, queryAt);
    const query = queryAt < 0 ? '' : raw.slice(queryAt);
    let pathname;
    try { pathname = decodeURIComponent(rawPath); }
    catch { send(400, 'Invalid request path'); return; }
    // Validate the raw path before URL normalization can hide dot segments.
    if (!pathname.startsWith('/') || /%2f|%5c/i.test(rawPath) ||
        /[\\\x00-\x1f\x7f#]/.test(pathname) || pathname.includes('//') ||
        pathname.split('/').some(segment => segment === '.' || segment === '..')) {
      send(400, 'Invalid request path');
      return;
    }
    if (pathname === '/api/contact' || pathname === '/api/contact/') {
      send(503, JSON.stringify({ success: false, error: 'Enquiry sending is disabled in this local preview. Please use the displayed contact details.' }), mimeTypes['.json']);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(405, 'Method not allowed', undefined, { Allow: 'GET, HEAD' });
      return;
    }
    const destination = aliases.get(pathname);
    if (destination) { send(308, '', undefined, { Location: destination + query }); return; }
    if (pathname === '/404.html') { notFound(); return; }
    const filePath = path.resolve(ROOT, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    const insideRoot = target => {
      const relative = path.relative(ROOT, target);
      return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
    };
    if (!insideRoot(filePath)) { send(400, 'Invalid request path'); return; }
    try {
      // Reject directory requests and escaped symlinks without exposing filesystem data.
      if (!fs.statSync(filePath).isFile() || !insideRoot(fs.realpathSync(filePath))) { notFound(); return; }
      send(200, fs.readFileSync(filePath), mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'EINVAL'].includes(error.code)) notFound();
      else send(500, 'Server error');
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 5173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('PORT must be an integer between 0 and 65535.');
    process.exitCode = 1;
  } else {
    const server = createPreviewServer();
    server.on('error', error => { console.error('Preview could not start: ' + (error.code || error.message)); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => {
      console.log('MEL ONE local preview: http://127.0.0.1:' + server.address().port);
    });
  }
}

module.exports = { createPreviewServer };
