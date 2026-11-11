// ==========================================================================
// SCHNAP Electric Products — CS-Cart Dispatch Controller & Session Bridge
// Connects static frontend -> Cloudflare Worker (commerce-worker.situs.id) -> live CS-Cart
// ==========================================================================

import { CONFIG } from './config.js?v=afde963';
import { swrFetch, getCached } from './cache.js?v=afde963';
import {
  parseCatalogResponse,
  parseSubcategoriesResponse,
  parseProductDetailResponse,
  parseCartResponse,
  parseBrandsResponse,
  extractSecurityHashFromText,
} from './parser.js?v=afde963';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js?v=afde963';

const SESSION_KEY = 'schnap_x_session_v1';
const HASH_KEY = 'schnap_security_hash_v1';
const LOCAL_CART_KEY = 'schnap_trade_cart_v1';

// Telemetry State for Pitch Header Pill
const telemetryState = {
  mode: 'live-edge', // 'live-edge' | 'seed-fallback'
  lastDispatch: 'index.index',
  latencyMs: 0,
  cacheStatus: 'READY',
  hasSession: false,
  securityHash: '',
};
const telemetryListeners = new Set();

export function getTelemetryState() {
  return { ...telemetryState };
}

export function subscribeTelemetry(fn) {
  telemetryListeners.add(fn);
  fn(getTelemetryState());
  return () => telemetryListeners.delete(fn);
}

function emitTelemetry(patch) {
  Object.assign(telemetryState, patch);
  const snapshot = getTelemetryState();
  telemetryListeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // ignore
    }
  });
}

// Session & Security Hash Accessors
export function getXSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function setXSession(val) {
  if (!val) return;
  try {
    sessionStorage.setItem(SESSION_KEY, val);
    emitTelemetry({ hasSession: true });
  } catch {
    // ignore
  }
}

export function getSecurityHash() {
  try {
    return sessionStorage.getItem(HASH_KEY) || '';
  } catch {
    return '';
  }
}

export function setSecurityHash(hash) {
  if (!hash) return;
  try {
    sessionStorage.setItem(HASH_KEY, hash);
    emitTelemetry({ securityHash: hash });
  } catch {
    // ignore
  }
}

// Initialize telemetry from stored session
emitTelemetry({
  hasSession: Boolean(getXSession()),
  securityHash: getSecurityHash(),
});

let tokenBootstrapPromise = null;

/**
 * Ensures a matched CS-Cart X-Session and security_hash exist before any POST dispatch.
 */
export async function ensureCsrfTokenReady(force = false) {
  if (!force && getXSession() && getSecurityHash()) {
    return { xSession: getXSession(), securityHash: getSecurityHash() };
  }
  if (tokenBootstrapPromise) return tokenBootstrapPromise;

  tokenBootstrapPromise = (async () => {
    try {
      const headers = {
        Accept: 'application/json, text/html, */*',
        'X-Requested-With': 'XMLHttpRequest',
      };
      const existingSession = getXSession();
      if (existingSession) headers['X-Session'] = existingSession;

      const res = await fetch(`${CONFIG.PROXY_BASE}/index.php?dispatch=auth.login_form&is_ajax=1`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      const sess = res.headers.get('X-Session');
      if (sess) setXSession(sess);
      const txt = await res.text();
      let parsed = txt;
      try {
        parsed = JSON.parse(txt);
      } catch {
        // ignore
      }
      const hash = extractSecurityHashFromText(
        typeof parsed === 'string' ? parsed : (parsed.text || '') + JSON.stringify(parsed.html || {})
      );
      if (hash) setSecurityHash(hash);
    } catch {
      // ignore if offline
    } finally {
      tokenBootstrapPromise = null;
    }
    return { xSession: getXSession(), securityHash: getSecurityHash() };
  })();

  return tokenBootstrapPromise;
}

/**
 * Core low-level request to CS-Cart via the Cloudflare Edge Worker (/cscart/index.php?...)
 */
export async function rawDispatch(
  dispatchOrPath,
  { method = 'GET', params = {}, formData = null, isAjax = true, _retried = false } = {}
) {
  if (method === 'POST' && (!getXSession() || !getSecurityHash())) {
    await ensureCsrfTokenReady();
  }

  const startTime = performance.now();
  const isSeoPath =
    dispatchOrPath === 'brands' ||
    dispatchOrPath === '/brands' ||
    dispatchOrPath.includes('.html') ||
    dispatchOrPath.endsWith('/');

  const url = new URL(
    isSeoPath
      ? `${CONFIG.PROXY_BASE}/${dispatchOrPath.replace(/^\//, '')}`
      : `${CONFIG.PROXY_BASE}/index.php`
  );

  if (!isSeoPath && dispatchOrPath) {
    url.searchParams.set('dispatch', dispatchOrPath);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  if (isAjax && method === 'GET') {
    url.searchParams.set('is_ajax', '1');
  }

  const headers = {
    Accept: 'application/json, text/html, */*',
  };

  if (isAjax) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  const xSession = getXSession();
  if (xSession) {
    headers['X-Session'] = xSession;
  }

  let body;
  if (method === 'POST') {
    const bodyParams = formData instanceof URLSearchParams ? new URLSearchParams(formData) : new URLSearchParams();
    if (formData && !(formData instanceof URLSearchParams)) {
      for (const [k, v] of Object.entries(formData)) {
        if (v !== undefined && v !== null) bodyParams.set(k, String(v));
      }
    }
    if (isAjax && !bodyParams.has('is_ajax')) {
      bodyParams.set('is_ajax', '1');
    }
    const secHash = getSecurityHash();
    if (secHash) {
      bodyParams.set('security_hash', secHash);
    }
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    body = bodyParams.toString();
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
    credentials: 'include',
  });

  const latencyMs = Math.round(performance.now() - startTime);
  const newSession = response.headers.get('X-Session');
  const xCache = response.headers.get('X-Cache') || 'LIVE';

  const text = await response.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // HTML response
  }

  const extractedHash = extractSecurityHashFromText(
    typeof parsed === 'string' ? parsed : (parsed.text || '') + JSON.stringify(parsed.html || {})
  );

  // Keep X-Session and security_hash strictly paired so concurrent anonymous GETs never mismatch them
  if (extractedHash) {
    setSecurityHash(extractedHash);
    if (newSession) setXSession(newSession);
  } else if (newSession && (!getXSession() || Boolean(xSession))) {
    setXSession(newSession);
  }

  // Self-heal if CS-Cart ever responds with "Possible CSRF attack"
  if (method === 'POST' && !_retried && text.includes('Possible CSRF attack')) {
    await ensureCsrfTokenReady(true);
    return rawDispatch(dispatchOrPath, { method, params, formData, isAjax, _retried: true });
  }

  emitTelemetry({
    mode: 'live-edge',
    lastDispatch: dispatchOrPath,
    latencyMs,
    cacheStatus: xCache,
  });

  if (!response.ok) {
    throw new Error(`CS-Cart dispatch HTTP ${response.status}`);
  }

  return parsed;
}

// ==========================================================================
// High-Level Catalog, Brands, Subcategory, Search & Product Controllers (with SWR Cache + Seed Fallback)
// ==========================================================================

/**
 * Fetches Brands Directory (`/cscart/brands` -> `https://www.schnap.com.au/brands`)
 */
export async function fetchBrandsCatalog({ onRevalidate } = {}) {
  const cacheKey = 'brands:directory:v1';
  try {
    const result = await swrFetch(
      cacheKey,
      async () => {
        const raw = await rawDispatch('brands');
        const parsed = parseBrandsResponse(raw);
        const byName = new Map();
        for (const b of CONFIG.BRANDS) {
          byName.set(b.name.toLowerCase(), { ...b });
        }
        for (const liveBrand of parsed.brands || []) {
          const key = liveBrand.name.toLowerCase();
          if (byName.has(key)) {
            const existing = byName.get(key);
            if (!existing.logo && liveBrand.logo) existing.logo = liveBrand.logo;
          } else {
            byName.set(key, liveBrand);
          }
        }
        return {
          brands: [...byName.values()],
          title: parsed.title || 'Authorized Electrical Brands',
        };
      },
      { onRevalidate }
    );
    if (result.source === 'session-cache') {
      emitTelemetry({ cacheStatus: 'SWR-CACHE', latencyMs: 1 });
    }
    return result.data;
  } catch {
    emitTelemetry({ mode: 'seed-fallback', cacheStatus: 'SEED' });
    return {
      brands: [...CONFIG.BRANDS],
      title: 'Authorized Electrical Brands',
    };
  }
}

/**
 * Fetches Homepage / Trade Highlights (`dispatch=index.index` & `dispatch=products.newest`)
 */
export async function fetchHomeCatalog({ onRevalidate } = {}) {
  const cacheKey = 'home:newest:v1';
  try {
    const result = await swrFetch(
      cacheKey,
      async () => {
        const raw = await rawDispatch('products.newest', {
          params: { currency: 'AUD', page: 1 },
        });
        const parsed = parseCatalogResponse(raw);
        if (!parsed.products || parsed.products.length === 0) {
          throw new Error('Empty newest products');
        }
        return parsed;
      },
      { onRevalidate }
    );
    if (result.source === 'session-cache') {
      emitTelemetry({ cacheStatus: 'SWR-CACHE', latencyMs: 1 });
    }
    return result.data;
  } catch {
    emitTelemetry({ mode: 'seed-fallback', cacheStatus: 'SEED' });
    return {
      products: SEED_PRODUCTS,
      totalCount: 29089,
      title: 'Trade Highlights',
    };
  }
}

/**
 * Fetches Category or SEO Slug products + subcategories (`dispatch=categories.view` & `categories.subcategories`)
 */
export async function fetchCategoryCatalog({
  categoryId = '',
  slug = '',
  page = 1,
  sortBy = 'position',
  sortOrder = 'asc',
  featuresHash = '',
  onRevalidate,
} = {}) {
  const targetKey = slug || `cat_${categoryId || '4257'}`;
  const cacheKey = `catalog:${targetKey}:p${page}:s_${sortBy}_${sortOrder}:f_${featuresHash}`;

  try {
    const result = await swrFetch(
      cacheKey,
      async () => {
        const params = { page, sort_by: sortBy, sort_order: sortOrder };
        if (featuresHash) params.features_hash = featuresHash;

        // Fetch products and subcategories in parallel when categoryId is known
        const prodPromise = slug
          ? rawDispatch(slug, { params })
          : rawDispatch('categories.view', { params: { category_id: categoryId || '4257', ...params } });

        const subPromise = categoryId
          ? rawDispatch('categories.subcategories', { params: { category_id: categoryId } }).catch(() => null)
          : Promise.resolve(null);

        const [rawProd, rawSub] = await Promise.all([prodPromise, subPromise]);
        const catalog = parseCatalogResponse(rawProd);

        if (rawSub) {
          const parsedSubs = parseSubcategoriesResponse(rawSub);
          if (parsedSubs.subcategories.length > 0) {
            catalog.subcategories = parsedSubs.subcategories;
          }
        }

        // If a parent category page returns only subcategories without products, merge relevant seed/search items
        if (catalog.products.length === 0) {
          const pillar = CONFIG.PILLARS.find((p) => p.id === String(categoryId) || p.slug === slug);
          if (pillar?.featuredSearch) {
            const searchRaw = await rawDispatch('products.search', {
              params: {
                q: pillar.featuredSearch,
                subcats: 'Y',
                pcode_from_q: 'Y',
                pshort: 'Y',
                pfull: 'Y',
                pname: 'Y',
                pkeywords: 'Y',
                search_performed: 'Y',
              },
            });
            const searchCatalog = parseCatalogResponse(searchRaw);
            catalog.products = searchCatalog.products;
            catalog.totalCount = searchCatalog.totalCount;
            catalog.facets = searchCatalog.facets;
          }
        }

        return catalog;
      },
      { onRevalidate }
    );

    if (result.source === 'session-cache') {
      emitTelemetry({ cacheStatus: 'SWR-CACHE', latencyMs: 1 });
    }
    return result.data;
  } catch {
    emitTelemetry({ mode: 'seed-fallback', cacheStatus: 'SEED' });
    const filtered = categoryId
      ? SEED_PRODUCTS.filter((p) => p.categoryId === String(categoryId))
      : SEED_PRODUCTS;
    const list = filtered.length > 0 ? filtered : SEED_PRODUCTS;
    return {
      products: list,
      subcategories: [],
      facets: [],
      totalCount: list.length,
      title: 'Trade Catalog',
    };
  }
}

/**
 * Fetches Search or Tag results (`dispatch=products.search` or `dispatch=tags.view`)
 */
export async function fetchSearchCatalog({
  query = '',
  brand = '',
  tag = '',
  page = 1,
  sortBy = 'position',
  sortOrder = 'asc',
} = {}) {
  const cleanQ = (query || tag || '').trim();
  const cleanBrand = (brand || '').trim();
  const cacheKey = `search:${cleanQ.toLowerCase()}:b_${cleanBrand.toLowerCase()}:tag_${tag}:p${page}:s_${sortBy}_${sortOrder}`;

  try {
    const result = await swrFetch(cacheKey, async () => {
      let raw;
      const brandObj = cleanBrand
        ? CONFIG.BRANDS.find(
            (b) =>
              b.name.toLowerCase() === cleanBrand.toLowerCase() ||
              b.slug.replace('/', '').toLowerCase() === cleanBrand.toLowerCase() ||
              (b.query && b.query.toLowerCase() === cleanBrand.toLowerCase())
          )
        : null;

      if (tag && !query) {
        raw = await rawDispatch('tags.view', { params: { tag, page } });
      } else if (cleanBrand && !cleanQ) {
        if (brandObj?.slug) {
          try {
            raw = await rawDispatch(brandObj.slug, { params: { page, sort_by: sortBy, sort_order: sortOrder } });
            const parsedBrand = parseCatalogResponse(raw);
            if (parsedBrand.products && parsedBrand.products.length > 0) {
              return parsedBrand;
            }
          } catch {
            // fallback to search
          }
        }
        raw = await rawDispatch('products.search', {
          params: {
            q: brandObj?.query || cleanBrand,
            match: 'all',
            subcats: 'Y',
            pcode_from_q: 'Y',
            pshort: 'Y',
            pfull: 'Y',
            pname: 'Y',
            pkeywords: 'Y',
            search_performed: 'Y',
            page,
            sort_by: sortBy,
            sort_order: sortOrder,
          },
        });
      } else {
        raw = await rawDispatch('products.search', {
          params: {
            q: cleanQ || 'rcbo',
            match: 'all',
            subcats: 'Y',
            pcode_from_q: 'Y',
            pshort: 'Y',
            pfull: 'Y',
            pname: 'Y',
            pkeywords: 'Y',
            search_performed: 'Y',
            page,
            sort_by: sortBy,
            sort_order: sortOrder,
          },
        });
      }

      const parsed = parseCatalogResponse(raw);
      // If tag view has no items, fallback to keyword search for the tag name
      if (parsed.products.length === 0 && tag) {
        const fallbackRaw = await rawDispatch('products.search', {
          params: {
            q: tag,
            subcats: 'Y',
            pcode_from_q: 'Y',
            pshort: 'Y',
            pfull: 'Y',
            pname: 'Y',
            pkeywords: 'Y',
            search_performed: 'Y',
          },
        });
        return parseCatalogResponse(fallbackRaw);
      }
      return parsed;
    });

    if (result.source === 'session-cache') {
      emitTelemetry({ cacheStatus: 'SWR-CACHE', latencyMs: 1 });
    }
    return result.data;
  } catch {
    emitTelemetry({ mode: 'seed-fallback', cacheStatus: 'SEED' });
    let matched = [...SEED_PRODUCTS];
    if (cleanBrand) {
      const bLower = cleanBrand.toLowerCase();
      matched = matched.filter(
        (p) =>
          (p.brand || '').toLowerCase() === bLower ||
          (p.brand || '').toLowerCase().includes(bLower) ||
          bLower.includes((p.brand || '').toLowerCase())
      );
    }
    if (cleanQ) {
      const qLower = cleanQ.toLowerCase();
      matched = matched.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.sku.toLowerCase().includes(qLower) ||
          p.brand.toLowerCase().includes(qLower) ||
          (p.specs || []).some((s) => s.toLowerCase().includes(qLower))
      );
    }
    const results = matched.length ? matched : cleanBrand || cleanQ ? [] : SEED_PRODUCTS;
    return {
      products: results,
      subcategories: [],
      facets: [],
      totalCount: results.length,
      title: cleanBrand ? cleanBrand : cleanQ ? `Search results for "${cleanQ}"` : 'All Trade Products',
    };
  }
}

/**
 * Fetches full Product Detail (`dispatch=products.view&product_id={id}`)
 */
export async function fetchProductDetail(productId, { onRevalidate } = {}) {
  const id = String(productId || '42415');
  const cacheKey = `product:${id}`;
  const seedMatch = SEED_PRODUCTS.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());

  try {
    const result = await swrFetch(
      cacheKey,
      async () => {
        const raw = await rawDispatch('products.view', { params: { product_id: id } });
        const parsed = parseProductDetailResponse(raw, id);
        if (!parsed || !parsed.title) {
          throw new Error('Could not parse product detail');
        }
        return parsed;
      },
      { onRevalidate }
    );
    if (result.source === 'session-cache') {
      emitTelemetry({ cacheStatus: 'SWR-CACHE', latencyMs: 1 });
    }
    return result.data;
  } catch {
    emitTelemetry({ mode: 'seed-fallback', cacheStatus: 'SEED' });
    return seedMatch || SEED_PRODUCTS[0];
  }
}

/**
 * Hover Prefetching entry point (plan.md Section 7.4)
 */
export async function prefetchResource(prefetchKey) {
  if (!prefetchKey || getCached(prefetchKey)) return;
  if (prefetchKey.startsWith('product:')) {
    const id = prefetchKey.split(':')[1];
    await fetchProductDetail(id);
  } else if (prefetchKey.startsWith('catalog:')) {
    const catId = prefetchKey.split(':')[1]?.replace('cat_', '');
    await fetchCategoryCatalog({ categoryId: catId });
  }
}

// ==========================================================================
// Reactive Trade Cart Manager & Optimistic CS-Cart Session Sync
// ==========================================================================

const cartListeners = new Set();
let cartSyncTimer = null;
let cartItems = [];

function saveLocalCart(items) {
  cartItems = items;
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadLocalCart() {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  // Pre-seed with 2 high-velocity trade items on first visit so demo cart is immediately testable
  const initial = [
    {
      id: SEED_PRODUCTS[0].id,
      cartId: SEED_PRODUCTS[0].id,
      sku: SEED_PRODUCTS[0].sku,
      title: SEED_PRODUCTS[0].title,
      brand: SEED_PRODUCTS[0].brand,
      price: SEED_PRODUCTS[0].price,
      listPrice: SEED_PRODUCTS[0].listPrice,
      image: SEED_PRODUCTS[0].image,
      href: SEED_PRODUCTS[0].href,
      qty: 4,
    },
    {
      id: SEED_PRODUCTS[1].id,
      cartId: SEED_PRODUCTS[1].id,
      sku: SEED_PRODUCTS[1].sku,
      title: SEED_PRODUCTS[1].title,
      brand: SEED_PRODUCTS[1].brand,
      price: SEED_PRODUCTS[1].price,
      listPrice: SEED_PRODUCTS[1].listPrice,
      image: SEED_PRODUCTS[1].image,
      href: SEED_PRODUCTS[1].href,
      qty: 2,
    },
  ];
  saveLocalCart(initial);
  return initial;
}

cartItems = loadLocalCart();

export function getCartState() {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const listTotal = cartItems.reduce((sum, item) => sum + (item.listPrice || item.price) * item.qty, 0);
  const tradeSavings = Math.max(0, listTotal - subtotal);
  const itemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const threshold = CONFIG.FREE_DELIVERY_THRESHOLD;
  const remainingForDelivery = Math.max(0, threshold - subtotal);
  const isDeliveryUnlocked = subtotal >= threshold;
  const progressPct = Math.min(100, Math.round((subtotal / threshold) * 100));

  return {
    items: [...cartItems],
    subtotal,
    tradeSavings,
    itemCount,
    threshold,
    remainingForDelivery,
    isDeliveryUnlocked,
    progressPct,
  };
}

export function subscribeCart(fn) {
  cartListeners.add(fn);
  fn(getCartState());
  return () => cartListeners.delete(fn);
}

function notifyCartListeners() {
  const state = getCartState();
  cartListeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      // ignore
    }
  });
}

/**
 * Optimistically adds a product to the Trade Cart and queues a debounced POST
 * to `dispatch=checkout.add` on the live CS-Cart backend.
 */
export function addToCart(product, qty = 1) {
  const amount = Math.max(1, parseInt(qty, 10) || 1);
  const id = String(product.id);
  const existing = cartItems.find((item) => String(item.id) === id || item.sku === product.sku);

  if (existing) {
    existing.qty += amount;
  } else {
    cartItems.push({
      id,
      cartId: product.cartId || id,
      sku: product.sku || `SKU-${id}`,
      title: product.title || 'Trade Item',
      brand: product.brand || 'SCHNAP',
      price: Number(product.price) || 0,
      listPrice: Number(product.listPrice) || Number(product.price) || 0,
      image: product.image || '',
      href: product.href || '',
      qty: amount,
    });
  }

  saveLocalCart(cartItems);
  notifyCartListeners();

  // Queue debounced background POST to CS-Cart `dispatch=checkout.add`
  queueBackendCartAdd(id, amount);
  return getCartState();
}

export function updateCartQty(idOrSku, newQty) {
  const parsedQty = parseInt(newQty, 10);
  if (parsedQty <= 0) {
    return removeFromCart(idOrSku);
  }

  const item = cartItems.find((i) => String(i.id) === String(idOrSku) || i.sku === idOrSku);
  if (item) {
    item.qty = parsedQty;
    saveLocalCart(cartItems);
    notifyCartListeners();
    queueBackendCartUpdate(item);
  }
  return getCartState();
}

export function removeFromCart(idOrSku) {
  const target = cartItems.find((i) => String(i.id) === String(idOrSku) || i.sku === idOrSku);
  cartItems = cartItems.filter((i) => String(i.id) !== String(idOrSku) && i.sku !== idOrSku);
  saveLocalCart(cartItems);
  notifyCartListeners();

  if (target?.cartId) {
    rawDispatch('checkout.delete', {
      method: 'GET',
      params: { cart_id: target.cartId, redirect_mode: 'cart' },
    }).catch(() => {});
  }
  return getCartState();
}

export function clearCart() {
  saveLocalCart([]);
  notifyCartListeners();
}

function queueBackendCartAdd(productId, amount) {
  clearTimeout(cartSyncTimer);
  cartSyncTimer = setTimeout(async () => {
    try {
      const form = new URLSearchParams();
      form.set(`dispatch[checkout.add..${productId}]`, '');
      form.set(`product_data[${productId}][product_id]`, String(productId));
      form.set(`product_data[${productId}][amount]`, String(amount));
      form.set('result_ids', 'cart_status*,wish_list*,checkout*,account_info*');
      await rawDispatch('checkout.add', { method: 'POST', formData: form });
    } catch {
      // Optimistic local state remains authoritative if offline
    }
  }, CONFIG.CART_DEBOUNCE_MS);
}

function queueBackendCartUpdate(item) {
  clearTimeout(cartSyncTimer);
  cartSyncTimer = setTimeout(async () => {
    try {
      const form = new URLSearchParams();
      form.set('dispatch[checkout.update]', '');
      form.set(`cart_products[${item.cartId || item.id}][product_id]`, String(item.id));
      form.set(`cart_products[${item.cartId || item.id}][amount]`, String(item.qty));
      form.set('result_ids', 'cart*,checkout*');
      await rawDispatch('checkout.update', { method: 'POST', formData: form });
    } catch {
      // Optimistic local state remains authoritative
    }
  }, CONFIG.CART_DEBOUNCE_MS);
}

/**
 * Hydrates / reconciles cart with CS-Cart `dispatch=checkout.cart`
 */
export async function syncCartFromBackend() {
  try {
    const raw = await rawDispatch('checkout.cart');
    const parsed = parseCartResponse(raw);
    if (parsed.items && parsed.items.length > 0) {
      // Merge cartIds from live session
      for (const remoteItem of parsed.items) {
        const local = cartItems.find((i) => String(i.id) === String(remoteItem.id));
        if (local) {
          local.cartId = remoteItem.cartId;
        }
      }
      saveLocalCart(cartItems);
      notifyCartListeners();
    }
    return getCartState();
  } catch {
    return getCartState();
  }
}

/**
 * Approach B (plan.md Section 2): Native HTML Form Handoff to Live CS-Cart
 */
export function submitNativeCartHandoff(targetDispatch = 'checkout.cart') {
  const { items } = getCartState();
  if (!items.length) return false;

  const form = document.createElement('form');
  form.action = `${CONFIG.PROXY_BASE}/index.php`;
  form.method = 'POST';
  form.target = '_blank';
  form.style.display = 'none';

  const addHidden = (name, value) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  };

  const secHash = getSecurityHash();
  if (secHash) {
    addHidden('security_hash', secHash);
  }
  const xSession = getXSession();
  if (xSession) {
    addHidden('_x_session', xSession);
  }

  addHidden('dispatch[checkout.add]', 'Add to cart');
  for (const item of items) {
    addHidden(`product_data[${item.id}][product_id]`, item.id);
    addHidden(`product_data[${item.id}][amount]`, item.qty);
  }
  addHidden('redirect_url', `index.php?dispatch=${targetDispatch}`);

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 1000);
  return true;
}
