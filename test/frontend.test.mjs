// Tests frontend core modules (config, media, parser, cache, pitchSeeds). Run: node test/frontend.test.mjs
import assert from 'node:assert';
import { CONFIG } from '../assets/js/core/config.js';
import { normalizeImageUrl, getRetinaSrcset, buildSchematicPlaceholder } from '../assets/js/core/media.js';
import {
  extractSecurityHashFromText,
  inferElectricalSpecs,
  inferBrandFromTitle,
  unwrapEnvelope,
} from '../assets/js/core/parser.js';
import { SEED_PRODUCTS, SEED_REVIEWS, SEED_FAQS } from '../assets/js/data/pitchSeeds.js';

// 1. Config & $150 Delivery Threshold
assert.strictEqual(CONFIG.FREE_DELIVERY_THRESHOLD, 150.0);
assert.strictEqual(CONFIG.PILLARS.length, 6);
assert.ok(CONFIG.PILLARS.some((p) => p.id === '4255' && p.name === 'Cable'));
assert.ok(CONFIG.PILLARS.some((p) => p.id === '4264' && p.name === 'Tools'));

// 2. Media normalizer & SVG schematic fallback
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
assert.ok(decodeURIComponent(placeholder).includes('LX620G2'));

// 3. Parser utilities
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

// 4. Pitch seeds integrity
assert.ok(SEED_PRODUCTS.length >= 14);
for (const p of SEED_PRODUCTS) {
  assert.ok(p.id && p.sku && p.title && p.price > 0);
  assert.ok(p.image.startsWith('https://d35gtgjy55l0bn.cloudfront.net/'));
}
assert.ok(SEED_REVIEWS.length >= 3);
assert.ok(SEED_FAQS.length >= 4);

console.log('frontend core: all tests passed');
