const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'public');
let total = 0;
function walk(dir, label) {
  let c = 0;
  function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) w(f);
      else if (e.name === 'index.html') c++;
    }
  }
  w(dir);
  console.log(`${label}: ${c} pages`);
  total += c;
}
walk(root, 'root');
for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (d.isDirectory()) walk(path.join(root, d.name), d.name);
}
console.log(`Total: ${total}`);
