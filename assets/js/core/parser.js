// ==========================================================================
// SCHNAP Electric Products — CS-Cart DOMParser & Payload Adapter (parser.js)
// Converts CS-Cart AJAX JSON envelopes & HTML blocks into clean JS models.
// ==========================================================================

import { normalizeImageUrl } from './media.js';
import { CONFIG } from './config.js';

const domParser = typeof DOMParser !== 'undefined' ? new DOMParser() : null;

function parseHtmlDocument(htmlString) {
  if (!domParser || !htmlString) return null;
  return domParser.parseFromString(htmlString, 'text/html');
}

/**
 * Extracts all HTML fragments from a CS-Cart JSON envelope (`{ text, html, title, notifications, current_url }`)
 * or raw HTML string.
 */
export function unwrapEnvelope(payload) {
  if (!payload) return { htmlText: '', title: '', notifications: [], currentUrl: '', securityHash: '' };

  if (typeof payload === 'string') {
    const securityHash = extractSecurityHashFromText(payload);
    return {
      htmlText: payload,
      title: '',
      notifications: [],
      currentUrl: '',
      securityHash,
    };
  }

  let combinedHtml = payload.text || '';
  if (payload.html && typeof payload.html === 'object') {
    combinedHtml += '\n' + Object.values(payload.html).join('\n');
  }

  const securityHash = extractSecurityHashFromText(combinedHtml);
  const notifications = normalizeNotifications(payload.notifications);

  return {
    htmlText: combinedHtml,
    title: cleanText(payload.title || ''),
    notifications,
    currentUrl: payload.current_url || '',
    securityHash,
  };
}

export function extractSecurityHashFromText(text) {
  if (!text) return '';
  const inputMatch = text.match(/name=["']security_hash["'][^>]*value=["']([a-f0-9]{16,64})["']/i);
  if (inputMatch) return inputMatch[1];
  const scriptMatch = text.match(/security_hash\s*[:=]\s*["']([a-f0-9]{16,64})["']/i);
  return scriptMatch ? scriptMatch[1] : '';
}

function normalizeNotifications(rawNotifications) {
  if (!rawNotifications) return [];
  const entries = Array.isArray(rawNotifications) ? rawNotifications : Object.values(rawNotifications);
  return entries
    .filter((n) => n && (n.message || n.title))
    .map((n) => ({
      type: n.type === 'N' ? 'success' : n.type === 'E' ? 'error' : 'info',
      title: cleanText(n.title || 'Notice'),
      message: cleanHtmlText(n.message || ''),
    }));
}

function cleanText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHtmlText(html) {
  if (!html) return '';
  return cleanText(String(html).replace(/<[^>]+>/g, ' '));
}

function parsePriceNumber(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Infers structured electrical specifications & brand from product title and SKU
 */
export function inferElectricalSpecs(title = '', sku = '') {
  const specs = [];
  const combined = `${title} ${sku}`;

  const patterns = [
    /\b([1234]P(?:\+N)?|[1234]\s*Pole)\b/i,
    /\b(\d+(?:\.\d+)?\s*A|\d+\s*Amp)\b/i,
    /\b(\d+(?:\.\d+)?\s*kA)\b/i,
    /\b(\d+\s*mA)\b/i,
    /\b(Type\s*[A-Z]{1,2})\b/i,
    /\b(IP\d{2})\b/i,
    /\b(\d+\s*W)\b/i,
    /\b(\d{3,4}\s*V(?:\s*AC|\s*DC)?)\b/i,
    /\b(3CCT|Tri-Colour|DALI(?:-2)?|IC-4|PoE)\b/i,
    /\b(\d+(?:\.\d+)?\s*mm²?)\b/i,
    /\b(\d+\s*m(?:\s*Drum|\s*Roll|\s*Coil)?)\b/i,
    /\b(Cat\s*6A?|Cat\s*5e)\b/i,
  ];

  for (const regex of patterns) {
    const m = combined.match(regex);
    if (m && specs.length < 5) {
      const val = m[1].replace(/\s+/g, ' ').trim();
      if (!specs.includes(val)) specs.push(val);
    }
  }

  return specs;
}

export function inferBrandFromTitle(title = '') {
  const knownBrands = [
    'Clipsal',
    'Hager',
    'ABB',
    'AJAX',
    'LANX',
    'Haneco',
    'Telbix',
    'Electra',
    'Repelec',
    'Channellock',
    'Brooks',
    'Eltech',
    'Certech',
    'Cornick',
    'Havit',
    'Firebox',
    'H.B. Fuller',
    'Legrand',
    'Allen-Bradley',
    'Schneider',
    'Mean Well',
    'Sunny',
  ];
  for (const b of knownBrands) {
    if (new RegExp(`\\b${b.replace('.', '\\.')}\\b`, 'i').test(title)) {
      return b;
    }
  }
  const words = cleanText(title).split(' ');
  const lastWord = words[words.length - 1] || '';
  if (lastWord.length >= 3 && /^[A-Za-z-]+$/.test(lastWord)) {
    return lastWord;
  }
  return 'SCHNAP Trade';
}

/**
 * Parses a single `.rev-card` or `.ty-grid-list__item` element into a structured Product object
 */
export function parseProductCardElement(cardEl) {
  if (!cardEl) return null;

  // Product ID
  const prodInput = cardEl.querySelector('input[name^="product_data["][name$="[product_id]"]');
  const qvLink = cardEl.querySelector('[data-ca-view-id]');
  const priceSpan = cardEl.querySelector('[id^="sec_discounted_price_"]');
  const id =
    prodInput?.value ||
    qvLink?.getAttribute('data-ca-view-id') ||
    priceSpan?.id?.replace('sec_discounted_price_', '') ||
    '';

  if (!id) return null;

  // Title & Link
  const titleAnchor = cardEl.querySelector('a.product-title');
  const rawTitle = titleAnchor?.getAttribute('title') || titleAnchor?.textContent || '';
  const title = cleanText(rawTitle);
  const href = titleAnchor?.getAttribute('href') || `${CONFIG.UPSTREAM_ORIGIN}/index.php?dispatch=products.view&product_id=${id}`;
  const slug = href.startsWith(CONFIG.UPSTREAM_ORIGIN)
    ? href.slice(CONFIG.UPSTREAM_ORIGIN.length).replace(/^\//, '')
    : '';

  // SKU
  const skuEl = cardEl.querySelector('.rev-card-sku, [id^="product_code_"]');
  const sku = cleanText(skuEl?.textContent || `SKU-${id}`);

  // Prices
  const tradePriceEl =
    cardEl.querySelector(`#sec_discounted_price_${id}`) ||
    cardEl.querySelector('[id^="sec_discounted_price_"]') ||
    cardEl.querySelector('.ty-price-num:not(:empty)');
  const listPriceEl =
    cardEl.querySelector(`#sec_list_price_${id}`) ||
    cardEl.querySelector('[id^="sec_list_price_"]');

  const price = parsePriceNumber(tradePriceEl?.textContent);
  const listPrice = parsePriceNumber(listPriceEl?.textContent);

  // Discount Label
  const discountLabelEl = cardEl.querySelector('.ty-product-labels__item--discount .ty-product-labels__content');
  const discountLabel = cleanText(discountLabelEl?.textContent || '');
  const discountPctMatch = discountLabel.match(/(\d+)\s*%/);
  const discountPct = discountPctMatch
    ? parseInt(discountPctMatch[1], 10)
    : listPrice > price && price > 0
      ? Math.round(((listPrice - price) / listPrice) * 100)
      : 0;

  // Images
  const imgs = [...cardEl.querySelectorAll('img.ty-pict, .ty-grid-list__image img')];
  const imageUrls = [];
  for (const img of imgs) {
    const rawSrc = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (rawSrc) {
      imageUrls.push(normalizeImageUrl(rawSrc, { sku, brand: inferBrandFromTitle(title) }));
    }
  }

  const brand = inferBrandFromTitle(title);
  const image = imageUrls[0] || normalizeImageUrl('', { sku, brand });
  const specs = inferElectricalSpecs(title, sku);

  return {
    id: String(id),
    sku,
    title: title || sku,
    brand,
    price,
    listPrice: listPrice > price ? listPrice : 0,
    discountPct,
    discountLabel: discountLabel || (discountPct > 0 ? `Trade Discount ${discountPct}%` : ''),
    image,
    images: imageUrls.length ? imageUrls : [image],
    href,
    slug,
    specs,
    inStock: true,
    boxQty: 10,
  };
}

/**
 * Parses a CS-Cart catalog response (`categories.view`, `products.search`, `products.newest`, `tags.view`, `index.index`)
 */
export function parseCatalogResponse(payload) {
  const { htmlText, title, notifications, currentUrl, securityHash } = unwrapEnvelope(payload);
  const doc = parseHtmlDocument(htmlText);
  if (!doc) {
    return { products: [], subcategories: [], facets: [], totalCount: 0, title, notifications, securityHash };
  }

  // Extract product cards
  const cardEls = doc.querySelectorAll('.rev-card, .ty-grid-list__item');
  const seenIds = new Set();
  const products = [];

  for (const el of cardEls) {
    const prod = parseProductCardElement(el);
    if (prod && prod.price > 0 && !seenIds.has(prod.id)) {
      seenIds.add(prod.id);
      products.push(prod);
    }
  }

  // Extract total products count
  let totalCount = products.length;
  const sortTitleEl = doc.querySelector('.schnap-sorting_title');
  if (sortTitleEl) {
    const text = sortTitleEl.textContent || '';
    const outOfMatch = text.match(/out of\s*(\d[\d,]*)/i) || text.match(/found:\s*(\d[\d,]*)/i);
    if (outOfMatch) {
      totalCount = parseInt(outOfMatch[1].replace(/,/g, ''), 10) || products.length;
    }
  }

  // Extract page heading
  const h1El = doc.querySelector('.ty-mainbox-title__left, .ty-mainbox-title, h1');
  const resolvedTitle = cleanText(h1El?.textContent || title || '');

  // Extract subcategories if present on page
  const subcategories = extractSubcategoriesFromDoc(doc);

  // Build technical facet filters from CS-Cart filter blocks + live product attributes
  const facets = buildCatalogFacets(doc, products);

  return {
    products,
    subcategories,
    facets,
    totalCount,
    title: resolvedTitle,
    currentUrl,
    notifications,
    securityHash,
  };
}

/**
 * Parses `dispatch=categories.subcategories` response
 */
export function parseSubcategoriesResponse(payload) {
  const { htmlText, title, securityHash } = unwrapEnvelope(payload);
  const doc = parseHtmlDocument(htmlText);
  if (!doc) return { subcategories: [], title, securityHash };
  return {
    subcategories: extractSubcategoriesFromDoc(doc),
    title,
    securityHash,
  };
}

function extractSubcategoriesFromDoc(doc) {
  const subcats = [];
  const cards = doc.querySelectorAll('.schnap-subcat-grid__card, .ty-subcategories__item a');
  for (const a of cards) {
    const href = a.getAttribute('href') || '';
    const nameEl = a.querySelector('.schnap-subcat-grid__name') || a;
    const name = cleanText(a.getAttribute('title') || nameEl.textContent || '');
    if (!name) continue;
    const imgEl = a.querySelector('img');
    const img = imgEl ? normalizeImageUrl(imgEl.getAttribute('src') || '') : '';
    const slug = href.startsWith(CONFIG.UPSTREAM_ORIGIN)
      ? href.slice(CONFIG.UPSTREAM_ORIGIN.length).replace(/^\//, '')
      : href;
    const catIdMatch = href.match(/category_id=(\d+)/);
    subcats.push({
      id: catIdMatch ? catIdMatch[1] : '',
      name,
      slug,
      href,
      image: img,
    });
  }
  return subcats;
}

/**
 * Builds structured facet groups (Brand, Rating/Specs, Price Bracket)
 */
export function buildCatalogFacets(doc, products = []) {
  const brandCounts = new Map();
  const specCounts = new Map();

  for (const p of products) {
    if (p.brand) {
      brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
    }
    for (const s of p.specs || []) {
      specCounts.set(s, (specCounts.get(s) || 0) + 1);
    }
  }

  const facets = [];
  if (brandCounts.size > 0) {
    facets.push({
      id: 'brand',
      name: 'Manufacturer / Brand',
      options: [...brandCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({ value, label: value, count })),
    });
  }

  if (specCounts.size > 0) {
    facets.push({
      id: 'spec',
      name: 'Electrical Rating & Spec',
      options: [...specCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([value, count]) => ({ value, label: value, count })),
    });
  }

  facets.push({
    id: 'price',
    name: 'Trade Price Bracket (AUD)',
    options: [
      { value: '0-25', label: 'Under $25', count: products.filter((p) => p.price < 25).length },
      { value: '25-100', label: '$25 – $100', count: products.filter((p) => p.price >= 25 && p.price <= 100).length },
      { value: '100-250', label: '$100 – $250', count: products.filter((p) => p.price > 100 && p.price <= 250).length },
      { value: '250+', label: 'Over $250', count: products.filter((p) => p.price > 250).length },
    ].filter((o) => o.count > 0),
  });

  return facets;
}

/**
 * Parses `dispatch=products.view&product_id={id}` into a detailed Product model
 */
export function parseProductDetailResponse(payload, fallbackId = '') {
  const { htmlText, securityHash, currentUrl } = unwrapEnvelope(payload);
  const doc = parseHtmlDocument(htmlText);
  if (!doc) return null;

  const prodIdInput = doc.querySelector('input[name^="product_data["][name$="[product_id]"]');
  const id = prodIdInput?.value || fallbackId || '';

  const metaSku = doc.querySelector('meta[itemprop="sku"]')?.getAttribute('content');
  const skuBlock = doc.querySelector('.ty-product-block-sku span, [id^="product_code_"]');
  const sku = cleanText(metaSku || skuBlock?.textContent || `SKU-${id}`);

  const metaName = doc.querySelector('meta[itemprop="name"]')?.getAttribute('content');
  const titleBlock = doc.querySelector('.ty-product-block-title, h1');
  const title = cleanText(metaName || titleBlock?.textContent || '');
  if (!title && !id) return null;

  const brandBlock = doc.querySelector('.ty-product-block-brand');
  const rawBrand = cleanText(brandBlock?.textContent?.replace(/^Brand\s*:?/i, '') || '');
  const brand = rawBrand || inferBrandFromTitle(title);

  const tradePriceEl = doc.querySelector('[id^="sec_discounted_price_"], .ty-price-num');
  const listPriceEl = doc.querySelector('[id^="sec_list_price_"]');
  const price = parsePriceNumber(tradePriceEl?.textContent);
  const listPrice = parsePriceNumber(listPriceEl?.textContent);

  const discountLabelEl = doc.querySelector('.ty-product-labels__item--discount .ty-product-labels__content');
  const discountLabel = cleanText(discountLabelEl?.textContent || '');
  const discountPctMatch = discountLabel.match(/(\d+)\s*%/);
  const discountPct = discountPctMatch
    ? parseInt(discountPctMatch[1], 10)
    : listPrice > price && price > 0
      ? Math.round(((listPrice - price) / listPrice) * 100)
      : 0;

  // High-res Gallery Images
  const images = [];
  const previewLinks = doc.querySelectorAll('.ty-product-img a.cm-image-previewer, .ty-product-img img.ty-pict');
  for (const el of previewLinks) {
    const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
    const candidate =
      imgEl?.getAttribute('src') ||
      el.getAttribute('href') ||
      imgEl?.getAttribute('data-src') ||
      '';
    if (candidate) {
      const normalized = normalizeImageUrl(candidate, { upgradeRetina: false, sku, brand });
      if (!images.includes(normalized)) images.push(normalized);
    }
  }
  if (images.length === 0) {
    images.push(normalizeImageUrl('', { sku, brand }));
  }

  // Extract Structured Specifications & Description Sections from #content_description & #content_features
  const descContainer = doc.querySelector('#content_description, .content-description');
  const specsTable = {
    'Part Number / SKU': sku,
    'Manufacturer / Brand': brand,
  };
  const keyFeatures = [];
  const applications = [];
  const standards = [];

  if (descContainer) {
    const lis = descContainer.querySelectorAll('li');
    for (const li of lis) {
      const text = cleanText(li.textContent);
      if (!text) continue;
      if (text.includes(':')) {
        const [k, ...v] = text.split(':');
        const key = cleanText(k);
        const val = cleanText(v.join(':'));
        if (key && val && key.length < 45) {
          specsTable[key] = val;
        }
      } else if (/AS\/NZS|IEC|IP\d{2}|RCM/i.test(text)) {
        standards.push(text);
      } else if (keyFeatures.length < 8) {
        keyFeatures.push(text);
      } else {
        applications.push(text);
      }
    }
  }

  const specs = inferElectricalSpecs(title, sku);
  for (const s of specs) {
    if (/^\d+A$/i.test(s) && !specsTable['Rated Current']) specsTable['Rated Current'] = s;
    if (/^\d+(?:\.\d+)?kA$/i.test(s) && !specsTable['Breaking Capacity']) specsTable['Breaking Capacity'] = s;
    if (/^IP\d{2}$/i.test(s) && !specsTable['Ingress Protection']) specsTable['Ingress Protection'] = s;
  }
  if (standards.length && !specsTable['Standards & Compliance']) {
    specsTable['Standards & Compliance'] = standards.join(', ');
  }
  if (!specsTable['Compliance']) {
    specsTable['Compliance'] = 'AS/NZS 3000 Wiring Rules & RCM Approved';
  }

  const descriptionHtml = descContainer ? descContainer.innerHTML : '';

  return {
    id: String(id),
    sku,
    title,
    brand,
    price,
    listPrice: listPrice > price ? listPrice : 0,
    discountPct,
    discountLabel: discountLabel || (discountPct > 0 ? `Trade Discount ${discountPct}%` : ''),
    image: images[0],
    images,
    href: currentUrl || `${CONFIG.UPSTREAM_ORIGIN}/index.php?dispatch=products.view&product_id=${id}`,
    specs,
    specsTable,
    keyFeatures,
    applications,
    descriptionHtml,
    inStock: true,
    boxQty: 10,
    securityHash,
  };
}

/**
 * Parses `dispatch=checkout.cart` or `dispatch=checkout.add` response
 */
export function parseCartResponse(payload) {
  const { htmlText, notifications, securityHash } = unwrapEnvelope(payload);
  const doc = parseHtmlDocument(htmlText);
  if (!doc) return { items: [], subtotal: 0, notifications, securityHash };

  const items = [];
  const itemBlocks = doc.querySelectorAll('.scnhap-cart-content, .schnap-cart-content');

  for (const block of itemBlocks) {
    const prodIdInput = block.querySelector('input[name^="cart_products["][name$="[product_id]"]');
    const amountInput = block.querySelector('input[name^="cart_products["][name$="[amount]"]');
    const nameAttr = prodIdInput?.getAttribute('name') || amountInput?.getAttribute('name') || '';
    const cartIdMatch = nameAttr.match(/cart_products\[(\d+)\]/);
    const cartId = cartIdMatch ? cartIdMatch[1] : '';
    const productId = prodIdInput?.value || cartId;

    const titleEl = block.querySelector('a.product-title');
    const title = cleanText(titleEl?.textContent || '');
    const href = titleEl?.getAttribute('href') || '';

    const skuEl = block.querySelector('[id^="product_code_update_"], .ty-cart-content__sku');
    const sku = cleanText((skuEl?.textContent || '').replace(/^CODE:\s*/i, ''));

    const priceEl = block.querySelector('[id^="sec_product_price_"]');
    const price = parsePriceNumber(priceEl?.textContent);
    const amount = parseInt(amountInput?.value || '1', 10) || 1;

    const imgEl = block.querySelector('img.ty-pict');
    const image = normalizeImageUrl(imgEl?.getAttribute('src') || '', { sku });

    if (productId && title) {
      items.push({
        cartId: String(cartId || productId),
        id: String(productId),
        sku: sku || `SKU-${productId}`,
        title,
        price,
        qty: amount,
        image,
        href,
      });
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return {
    items,
    subtotal,
    notifications,
    securityHash,
  };
}
