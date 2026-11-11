// Tests frontend core modules (config, media, parser, cache, pitchSeeds, icons). Run: node test/frontend.test.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import { CONFIG } from '../assets/js/core/config.js';
import { normalizeImageUrl, getRetinaSrcset, buildSchematicPlaceholder } from '../assets/js/core/media.js';
import {
  extractSecurityHashFromText,
  inferElectricalSpecs,
  inferBrandFromTitle,
  unwrapEnvelope,
  parseBrandsResponse,
} from '../assets/js/core/parser.js';
import { lucideIcon, lucideStars } from '../assets/js/components/icons.js';
import { SEED_PRODUCTS, SEED_REVIEWS, SEED_FAQS } from '../assets/js/data/pitchSeeds.js';

// 1. Config, Brands Directory & $150 Delivery Threshold
assert.strictEqual(CONFIG.FREE_DELIVERY_THRESHOLD, 150.0);
assert.strictEqual(CONFIG.PILLARS.length, 6);
assert.ok(CONFIG.PILLARS.some((p) => p.id === '4255' && p.name === 'Cable'));
assert.ok(CONFIG.PILLARS.some((p) => p.id === '4264' && p.name === 'Tools'));
assert.ok(CONFIG.BRANDS.length >= 25);
assert.ok(CONFIG.BRANDS.some((b) => b.name === 'Clipsal' && b.featured));
assert.ok(CONFIG.BRANDS.some((b) => b.name === 'Hager' && b.featured));
assert.ok(CONFIG.BRANDS.some((b) => b.name === 'Legrand' && b.featured));

// 2. Media normalizer & SVG schematic fallback (#5D1C25 / #FFFFFF / #C58B2A palette)
const cfUrl =
  'https://d35gtgjy55l0bn.cloudfront.net/images/thumbnails/200/200/detailed/163/LA210.png?t=1770916996';
assert.strictEqual(normalizeImageUrl(cfUrl), cfUrl);
assert.match(getRetinaSrcset(cfUrl), /\/images\/thumbnails\/400\/400\/detailed\/163\/LA210\.png/);
assert.strictEqual(
  normalizeImageUrl('../design/themes/schnap_theme/media/images/logo.png'),
  'https://www.schnap.com.au/design/themes/schnap_theme/media/images/logo.png'
);
const placeholder = buildSchematicPlaceholder('LX620G2', 'LANX');
assert.ok(placeholder.startsWith('data:image/svg+xml;utf8,'));
const decodedSvg = decodeURIComponent(placeholder);
assert.ok(decodedSvg.includes('LX620G2'));
assert.ok(decodedSvg.includes('#5D1C25'));
assert.ok(decodedSvg.includes('#C58B2A'));

// 3. Lucide Icons Component
const zapSvg = lucideIcon('zap', { size: 18 });
assert.ok(zapSvg.includes('class="lucide lucide-zap"'));
assert.ok(zapSvg.includes('width="18"'));
const starsSvg = lucideStars(5);
assert.ok(starsSvg.includes('lucide-star'));

// 4. Parser utilities
const hash = extractSecurityHashFromText(
  '<input type="hidden" name="security_hash" class="cm-no-hide-input" value="a6483cb4675e205177a15a42be8f3262" />'
);
assert.strictEqual(hash, 'a6483cb4675e205177a15a42be8f3262');

const specs = inferElectricalSpecs(
  'RCBO 1P 20A 6kA Breaking Capacity 30mA Sensitivity Type A IP65 LANX',
  'LX620G2'
);
assert.ok(specs.includes('1P'));
assert.ok(specs.includes('20A'));
assert.ok(specs.includes('6kA'));
assert.ok(specs.includes('30mA'));

assert.strictEqual(
  inferBrandFromTitle('Aurora Square 35W Downlight 3CCT IP54 200mm DALI Dimmable Haneco'),
  'Haneco'
);

const env = unwrapEnvelope({
  title: 'Tools &amp; Test',
  text: '<input name="security_hash" value="0123456789abcdef0123456789abcdef">',
  notifications: [{ type: 'N', title: 'Added', message: '<b>Item</b> added' }],
});
assert.strictEqual(env.title, 'Tools & Test');
assert.strictEqual(env.securityHash, '0123456789abcdef0123456789abcdef');
assert.strictEqual(env.notifications[0].type, 'success');

assert.strictEqual(typeof parseBrandsResponse, 'function');

// 5. Color Palette, 3-Level Menu & Clean UI Verification
const tokensCss = fs.readFileSync(new URL('../assets/css/tokens.css', import.meta.url), 'utf8');
assert.ok(tokensCss.includes('#5D1C25'));
assert.ok(tokensCss.includes('#5C0632'));
assert.ok(tokensCss.includes('#747F8A'));
assert.ok(tokensCss.includes('#FFFFFF'));
assert.ok(tokensCss.includes('#C58B2A'));
assert.ok(!tokensCss.includes('#EB1B24'));

const brandsHtml = fs.readFileSync(new URL('../brands.html', import.meta.url), 'utf8');
assert.ok(brandsHtml.includes('assets/js/pages/brands.js'));
assert.ok(brandsHtml.includes('data-lucide='));
assert.ok(!brandsHtml.includes('dispatch='));

const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(!indexHtml.includes('Browse by Electrical Trade Discipline'));

const headerJs = fs.readFileSync(new URL('../assets/js/components/header.js', import.meta.url), 'utf8');
assert.ok(headerJs.includes('mega-tree-grid'));
assert.ok(!headerJs.includes('EDGE GATEWAY'));
assert.ok(!headerJs.includes('Zero-Access Edge Architecture'));

// 6. Pitch seeds integrity
assert.ok(SEED_PRODUCTS.length >= 14);
for (const p of SEED_PRODUCTS) {
  assert.ok(p.id && p.sku && p.title && p.price > 0);
  assert.ok(p.image.startsWith('https://d35gtgjy55l0bn.cloudfront.net/'));
}
assert.ok(SEED_REVIEWS.length >= 3);
assert.ok(SEED_FAQS.length >= 4);

console.log('frontend core: all tests passed');
