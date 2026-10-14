#!/usr/bin/env node
// Optional asset utility, not a build dependency. Supply an installed sharp
// module path as argument if it is not resolvable locally. Originals stay intact.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const assets = path.resolve(__dirname, '../src/assets');
const families = [
  'service-fascia-eaves-repairs',
  'service-weatherboard-repairs',
  'service-pergola-repairs',
  'service-timber-stairs-handrails',
  'service-cabinet-repairs',
];

async function main() {
  for (const family of families) {
    const original = path.join(assets, `${family}.png`);
    const metadata = await sharp(original).metadata();
    if (metadata.width !== 1448 || metadata.height !== 1086) {
      throw new Error(`Unexpected supplied dimensions: ${family}: ${metadata.width}x${metadata.height}`);
    }
    for (const width of [480, 960, 1448]) {
      const target = path.join(assets, `${family}-${width}.webp`);
      // Proportional downsampling only: no crop, upscaling, retouching or added attribution.
      const result = await sharp(original).resize({ width, withoutEnlargement: true })
        .webp({ quality: 80, effort: 6 }).toFile(target);
      console.log(`${path.basename(target)}: ${result.width}x${result.height}, ${fs.statSync(target).size} bytes`);
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
