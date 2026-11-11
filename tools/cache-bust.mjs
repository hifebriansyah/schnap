#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targetDir = process.argv[2] || '.';
const version = (process.argv[3] || Date.now().toString(36)).slice(0, 10);

console.log(`Cache busting in "${targetDir}" with version: ${version}`);

// 1. Update HTML files
if (fs.existsSync(targetDir)) {
  const htmlFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.html'));

  for (const f of htmlFiles) {
    const filePath = path.join(targetDir, f);
    let html = fs.readFileSync(filePath, 'utf8');

    // Cache bust CSS links: href="assets/css/xxx.css(?v=...)"
    html = html.replace(/(href=["']assets\/css\/[^"']+\.css)(?:\?[^"']*)?(["'])/g, `$1?v=${version}$2`);

    // Cache bust script tags: src="assets/js/xxx.js(?v=...)"
    html = html.replace(/(src=["']assets\/js\/[^"']+\.js)(?:\?[^"']*)?(["'])/g, `$1?v=${version}$2`);

    // Cache bust icons: href="assets/img/xxx(.svg|.png|.ico)(?v=...)"
    html = html.replace(/(href=["']assets\/img\/[^"']+\.(?:svg|png|ico))(?:\?[^"']*)?(["'])/g, `$1?v=${version}$2`);

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`  Updated ${f}`);
  }
}

// 2. Recursively update JS files for ES module imports
function walkJs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJs(fullPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      let code = fs.readFileSync(fullPath, 'utf8');
      const updatedCode = code.replace(
        /(from\s+['"])(\.{1,2}\/[^'"]+\.js)(?:\?[^'"]*)?(['"])/g,
        `$1$2?v=${version}$3`
      );
      if (updatedCode !== code) {
        fs.writeFileSync(fullPath, updatedCode, 'utf8');
      }
    }
  }
}

const assetsJsDir = path.join(targetDir, 'assets', 'js');
if (fs.existsSync(assetsJsDir)) {
  walkJs(assetsJsDir);
  console.log(`  Updated ES Module imports in assets/js`);
}

console.log('Cache busting complete.');
