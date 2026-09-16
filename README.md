# Ellis Services Group — Website

Adelaide-based carpentry & joinery company website.

## Quick Start

```bash
# Install (no dependencies — pure Node.js)
npm install

# Build local preview (outputs to ./public)
npm run build

# Preview locally
npm run serve
# → http://127.0.0.1:5173

# Run checks
npm run check
```

## Project Structure

```
ellisservicesgroup.github.io/
├── build.mjs          ← Site generator (Node.js, no dependencies)
├── serve.cjs          ← Local static server
├── check.cjs          ← Integrity checker
├── package.json       ← npm scripts
├── deploy.ps1         ← One-command deploy to GitHub Pages
├── .gitignore
├── src/               ← Source files (commit these)
│   ├── content-pack/
│   │   └── site-content.json   ← All text content
│   └── assets/
│       ├── base.css            ← Theme foundation (golden-base)
│       ├── base.js             ← Nav + form interactions
│       ├── theme.css           ← Ellis brand overrides
│       ├── hero-bg.jpg         ← Homepage hero image
│       └── asset-manifest.json ← Image slot reference
├── public/            ← Local preview build (git-ignored)
└── docs/              ← GitHub Pages build output (git-tracked)
```

## Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g. `ellisservicesgroup/ellisservicesgroup.github.io`).
2. Run the deploy script and paste your repo URL when asked:
   ```powershell
   .\deploy.ps1
   ```
3. Enable GitHub Pages: **Settings → Pages → Source: Deploy from a branch → Branch: main, Folder: / (root)**
4. Your site will be live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`

> Subsequent runs only build + commit + push — no URL needed again.

## Customising Content

All text lives in `src/content-pack/site-content.json`. Edit and re-run `npm run build`.

## Image Slots

Drop replacement images into `src/assets/` (keep filenames):

| Filename | Used On | Size |
|---|---|---|
| `hero-bg.jpg` | Homepage hero | ~1344×768 |
| `about.jpg` | About page | 4:3 ratio |

SVG placeholder images are embedded in pages automatically. Replace them by dropping real photos in `src/assets/` and rebuilding.
