// ==========================================================================
// SCHNAP Electric Products — Product Detail Page Controller (product.js)
// Clean, readable product detail layout with zero technical noise
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell, openDrawer } from '../components/header.js';
import {
  renderProductCard,
  bindProductCatalogEvents,
  formatAud,
  escapeHtml,
} from '../components/productCard.js';
import { openQuickView } from '../components/quickView.js';
import { lucideIcon, hydrateLucideIcons } from '../components/icons.js';
import {
  fetchProductDetail,
  addToCart,
  getCartState,
  subscribeCart,
} from '../core/dispatch.js';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js';
import { showToast } from '../components/notifications.js';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js';

let currentProduct = null;
let selectedQty = 1;

export async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get('id') || '42415';
  const skuParam = params.get('sku') || '';

  const seedMatch =
    SEED_PRODUCTS.find((p) => String(p.id) === String(idParam)) ||
    (skuParam && SEED_PRODUCTS.find((p) => p.sku.toLowerCase() === skuParam.toLowerCase())) ||
    SEED_PRODUCTS[0];

  initGlobalShell({ activePillar: seedMatch?.categoryId || '4257' });
  hydrateLucideIcons(document);

  if (seedMatch && String(seedMatch.id) === String(idParam)) {
    currentProduct = seedMatch;
    renderProductDetail(currentProduct);
  }

  try {
    const liveProd = await fetchProductDetail(idParam, {
      onRevalidate: (fresh) => {
        if (fresh) {
          currentProduct = mergeProductWithSeed(fresh, seedMatch);
          renderProductDetail(currentProduct);
        }
      },
    });
    if (liveProd) {
      currentProduct = mergeProductWithSeed(liveProd, seedMatch);
      renderProductDetail(currentProduct);
    }
  } catch {
    if (!currentProduct) {
      currentProduct = seedMatch;
      renderProductDetail(currentProduct);
    }
  }

  renderRelatedProducts();
}

function mergeProductWithSeed(liveProd, seedMatch) {
  const isSameId = seedMatch && String(seedMatch.id) === String(liveProd.id);
  return {
    ...(isSameId ? seedMatch : {}),
    ...liveProd,
    price: liveProd.price || (isSameId ? seedMatch.price : 0),
    listPrice: liveProd.listPrice || (isSameId ? seedMatch.listPrice : 0),
    specsTable: {
      ...(isSameId ? seedMatch.specsTable : {}),
      ...(liveProd.specsTable || {}),
    },
  };
}

function renderProductDetail(product) {
  document.title = `${product.sku} — ${product.title} | SCHNAP Electric Products`;

  const breadcrumbEl = document.getElementById('pdp-breadcrumb-Mount');
  const mainMount = document.getElementById('pdp-main-mount');
  const tabsMount = document.getElementById('pdp-tabs-mount');

  const pillar =
    CONFIG.PILLARS.find((p) => p.id === String(product.categoryId)) || CONFIG.PILLARS[1];

  if (breadcrumbEl) {
    breadcrumbEl.innerHTML = `
      <a href="index.html">Home</a>
      <span>/</span>
      <a href="category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}">${escapeHtml(pillar.name)}</a>
      <span>/</span>
      <span class="mono" style="color:#5C0632;font-weight:600">${escapeHtml(product.sku)}</span>
    `;
  }

  if (!mainMount) return;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [normalizeImageUrl(product.image, { upgradeRetina: false, sku: product.sku, brand: product.brand })];
  const fallbackSvg = buildSchematicPlaceholder(product.sku, product.brand);
  const boxQty = product.boxQty || 10;
  const savingsAmt =
    product.listPrice > product.price ? product.listPrice - product.price : 0;

  const thumbsHtml = images
    .map(
      (imgUrl, idx) => `
      <button
        type="button"
        class="pdp-thumb-btn ${idx === 0 ? 'is-active' : ''}"
        data-pdp-thumb="${escapeHtml(imgUrl)}"
        aria-label="View image ${idx + 1}"
      >
        <img src="${escapeHtml(imgUrl)}" alt="" onerror="this.src='${fallbackSvg}'" />
      </button>
    `
    )
    .join('');

  const specChipsHtml = (product.specs || [])
    .map((s) => `<span class="spec-chip" style="font-size:12px;padding:4px 8px">${escapeHtml(s)}</span>`)
    .join('');

  const whatsappText = `Hi SCHNAP Trade Desk, I'd like a quote on SKU: ${product.sku} (${product.title}). Quantity: `;
  const whatsappUrl = `${CONFIG.STORE_FACTS.whatsappHref}?text=${encodeURIComponent(whatsappText)}`;

  mainMount.innerHTML = `
    <!-- Left Column: Image Gallery -->
    <div class="pdp-gallery-card">
      <div class="pdp-main-stage" id="pdp-main-image-stage">
        <img
          id="pdp-primary-img"
          src="${escapeHtml(images[0])}"
          alt="${escapeHtml(product.title)}"
          onerror="this.src='${fallbackSvg}'"
        />
      </div>

      ${images.length > 1 ? `<div class="pdp-thumbs">${thumbsHtml}</div>` : ''}
    </div>

    <!-- Right Column: Buy Box -->
    <div class="pdp-buy-box">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <a href="search.html?brand=${encodeURIComponent(product.brand || 'SCHNAP')}" class="badge badge-navy">${escapeHtml(product.brand || 'SCHNAP')}</a>
          <button
            type="button"
            class="sku-copy-pill"
            id="pdp-copy-sku-btn"
            data-sku="${escapeHtml(product.sku)}"
            style="font-size:12px;padding:4px 10px"
          >
            <span>${escapeHtml(product.sku)}</span>
            ${lucideIcon('copy', { size: 12, strokeWidth: 2 })}
          </button>
        </div>
        <span class="badge badge-emerald">
          ${lucideIcon('check-circle-2', { size: 12 })}
          <span>In Stock</span>
        </span>
      </div>

      <h1 class="pdp-title">${escapeHtml(product.title)}</h1>

      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
        ${specChipsHtml}
      </div>

      <!-- Trade Pricing -->
      <div class="pdp-price-panel">
        <div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em">
            Trade Price (Inc. GST)
          </div>
          <div style="display:flex;align-items:baseline;gap:0.75rem;margin-top:4px">
            <span class="pdp-trade-price">${formatAud(product.price)}</span>
            ${
              product.listPrice > product.price
                ? `<span class="price-list" style="font-size:15px">${formatAud(product.listPrice)}</span>`
                : ''
            }
          </div>
        </div>
        ${
          savingsAmt > 0
            ? `<span class="badge badge-amber" style="font-size:11px;padding:5px 9px">
                Save ${formatAud(savingsAmt)} (${product.discountPct}%)
              </span>`
            : ''
        }
      </div>

      <!-- Add to Cart Row -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:center">
        <div class="qty-stepper" style="height:46px">
          <button type="button" class="qty-stepper__btn" data-pdp-step="-1" style="width:40px">
            ${lucideIcon('minus', { size: 15, strokeWidth: 2.5 })}
          </button>
          <input
            type="text"
            inputmode="numeric"
            id="pdp-qty-input"
            class="qty-stepper__input"
            value="${selectedQty}"
            style="width:52px;font-size:15px"
            aria-label="Quantity"
          />
          <button type="button" class="qty-stepper__btn" data-pdp-step="1" style="width:40px">
            ${lucideIcon('plus', { size: 15, strokeWidth: 2.5 })}
          </button>
        </div>
        <button type="button" class="btn btn-primary btn-lg" id="pdp-add-to-cart-btn" style="height:46px">
          ${lucideIcon('shopping-cart', { size: 17, strokeWidth: 2.2 })}
          <span id="pdp-add-btn-label">Add to Cart — ${formatAud(product.price * selectedQty)}</span>
        </button>
      </div>

      <!-- Fulfillment Summary -->
      <div id="pdp-fulfillment-status-box"></div>

      <!-- Bulk Quote Actions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <a
          href="${whatsappUrl}"
          target="_blank"
          rel="noopener"
          class="btn btn-outline"
          id="pdp-whatsapp-quote-btn"
        >
          ${lucideIcon('message-circle', { size: 15 })}
          <span>WhatsApp Enquiry</span>
        </a>
        <button
          type="button"
          class="btn btn-outline"
          data-open-drawer="quote"
          data-quote-prefill="${escapeHtml(`${selectedQty}x ${product.sku} — ${product.title}`)}"
        >
          ${lucideIcon('clipboard-list', { size: 15 })}
          <span>Request Bulk Quote</span>
        </button>
      </div>
    </div>
  `;

  if (tabsMount) {
    const specRowsHtml = Object.entries(product.specsTable || {})
      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    tabsMount.innerHTML = `
      <div class="pdp-tabs-nav" role="tablist">
        <button type="button" class="pdp-tab-btn is-active" data-pdp-tab="specs" role="tab">
          Specifications
        </button>
        <button type="button" class="pdp-tab-btn" data-pdp-tab="delivery" role="tab">
          Delivery &amp; Pickup
        </button>
      </div>

      <div class="pdp-tab-panel is-active" id="pdp-panel-specs">
        <table class="spec-table">
          <tbody>
            ${specRowsHtml}
          </tbody>
        </table>
      </div>

      <div class="pdp-tab-panel" id="pdp-panel-delivery">
        <div class="pdp-fulfillment-card">
          <div>
            <h4 style="font-weight:700;color:#5C0632;margin-bottom:4px;display:flex;align-items:center;gap:6px">
              ${lucideIcon('map-pin', { size: 15 })}
              <span>Kingsgrove Counter Pickup</span>
            </h4>
            <p style="font-size:13px;color:var(--text-secondary)">
              Free on all orders at ${escapeHtml(CONFIG.STORE_FACTS.address)}. Open 7 days.
            </p>
          </div>
          <div>
            <h4 style="font-weight:700;color:#5C0632;margin-bottom:4px;display:flex;align-items:center;gap:6px">
              ${lucideIcon('truck', { size: 15 })}
              <span>Australia-Wide Delivery</span>
            </h4>
            <p style="font-size:13px;color:var(--text-secondary)">
              Available on orders of $150 or more, with same-day dispatch from Sydney.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  bindPdpEvents();
  updateFulfillmentClarityBox();
}

function updateFulfillmentClarityBox() {
  const box = document.getElementById('pdp-fulfillment-status-box');
  if (!box || !currentProduct) return;

  const cart = getCartState();
  const combinedTotal = cart.subtotal + currentProduct.price * selectedQty;
  const qualifiesDelivery = combinedTotal >= CONFIG.FREE_DELIVERY_THRESHOLD;
  const shortfall = Math.max(0, CONFIG.FREE_DELIVERY_THRESHOLD - combinedTotal);

  box.innerHTML = `
    <div class="pdp-fulfillment-card">
      <div>
        <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:${qualifiesDelivery ? 'var(--color-emerald-700)' : '#5C0632'}">
          ${qualifiesDelivery ? lucideIcon('check-circle-2', { size: 14 }) : lucideIcon('truck', { size: 14 })}
          <span>${qualifiesDelivery ? 'Eligible for Australia-Wide Delivery' : `Add ${formatAud(shortfall)} for Delivery`}</span>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:#5C0632">
          ${lucideIcon('map-pin', { size: 14 })}
          <span>Free 7-Day Kingsgrove Pickup</span>
        </div>
      </div>
    </div>
  `;
}

function bindPdpEvents() {
  const mainMount = document.getElementById('pdp-main-mount');
  const tabsMount = document.getElementById('pdp-tabs-mount');

  const syncSelectedQtyUI = (qty) => {
    selectedQty = Math.max(1, parseInt(qty, 10) || 1);
    const input = document.getElementById('pdp-qty-input');
    const preview = document.getElementById('pdp-line-total-preview');
    const addBtnLabel = document.getElementById('pdp-add-btn-label');
    if (input) input.value = String(selectedQty);
    if (preview && currentProduct) {
      preview.innerHTML = `Total: <strong>${formatAud(currentProduct.price * selectedQty)}</strong>`;
    }
    if (addBtnLabel && currentProduct) {
      addBtnLabel.textContent = `Add to Cart — ${formatAud(currentProduct.price * selectedQty)}`;
    }
    updateFulfillmentClarityBox();
  };

  mainMount?.addEventListener('click', (e) => {
    const thumbBtn = e.target.closest('[data-pdp-thumb]');
    if (thumbBtn) {
      const src = thumbBtn.getAttribute('data-pdp-thumb');
      const primaryImg = document.getElementById('pdp-primary-img');
      if (primaryImg && src) primaryImg.src = src;
      mainMount.querySelectorAll('[data-pdp-thumb]').forEach((b) => b.classList.remove('is-active'));
      thumbBtn.classList.add('is-active');
      return;
    }

    const copyBtn = e.target.closest('#pdp-copy-sku-btn');
    if (copyBtn) {
      const sku = copyBtn.getAttribute('data-sku');
      navigator.clipboard?.writeText(sku).catch(() => {});
      showToast({
        title: 'SKU Copied',
        message: `${sku} copied to clipboard`,
        type: 'success',
      });
      return;
    }

    const packBtn = e.target.closest('[data-pdp-pack]');
    if (packBtn) {
      const packQty = parseInt(packBtn.getAttribute('data-pdp-pack'), 10) || 1;
      mainMount.querySelectorAll('[data-pdp-pack]').forEach((b) => b.classList.remove('is-active'));
      packBtn.classList.add('is-active');
      syncSelectedQtyUI(packQty);
      return;
    }

    const stepBtn = e.target.closest('[data-pdp-step]');
    if (stepBtn) {
      const delta = parseInt(stepBtn.getAttribute('data-pdp-step'), 10) || 0;
      syncSelectedQtyUI(selectedQty + delta);
      return;
    }

    const addBtn = e.target.closest('#pdp-add-to-cart-btn');
    if (addBtn && currentProduct) {
      const nextCart = addToCart(currentProduct, selectedQty);
      showToast({
        title: `Added ${selectedQty}× ${currentProduct.sku}`,
        message: `Cart subtotal: ${formatAud(nextCart.subtotal)}`,
        type: 'success',
      });
      openDrawer('cart');
    }
  });

  document.getElementById('pdp-qty-input')?.addEventListener('input', (e) => {
    syncSelectedQtyUI(e.target.value);
  });

  tabsMount?.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-pdp-tab]');
    if (!tabBtn) return;
    const targetId = tabBtn.getAttribute('data-pdp-tab');
    tabsMount.querySelectorAll('[data-pdp-tab]').forEach((b) => b.classList.remove('is-active'));
    tabsMount.querySelectorAll('.pdp-tab-panel').forEach((p) => p.classList.remove('is-active'));
    tabBtn.classList.add('is-active');
    document.getElementById(`pdp-panel-${targetId}`)?.classList.add('is-active');
  });

  subscribeCart(() => updateFulfillmentClarityBox());
}

function renderRelatedProducts() {
  const mount = document.getElementById('pdp-related-mount');
  if (!mount) return;

  const related = SEED_PRODUCTS.filter((p) => String(p.id) !== String(currentProduct?.id)).slice(0, 4);
  mount.innerHTML = related.map((p) => renderProductCard(p)).join('');
  bindProductCatalogEvents(mount, {
    getProducts: () => SEED_PRODUCTS,
    onQuickView: (id, prod) => openQuickView(id, prod),
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductPage);
} else {
  initProductPage();
}
