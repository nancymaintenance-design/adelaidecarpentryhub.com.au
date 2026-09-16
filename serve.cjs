const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const ROOT = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.endsWith('/')) url += 'index.html';
  const filePath = path.join(ROOT, url);

  try {
    if (!fs.existsSync(filePath)) {
      const notFound = path.join(ROOT, '404.html');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(notFound));
      return;
    }
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(fs.readFileSync(filePath));
  } catch (e) {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🏗️  Ellis Services Group Website`);
  console.log(`   Local:   http://127.0.0.1:${PORT}`);
  console.log(`   Network: http://localhost:${PORT}`);
  console.log(`   Ctrl+C to stop\n`);
});
