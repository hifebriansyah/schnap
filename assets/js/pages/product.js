// ==========================================================================
// SCHNAP Electric Products — Product Detail Page Controller (product.js)
// Hydrates product.html via dispatch=products.view&product_id={id}
// All icons powered by Lucide (icons.js)
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
      <a href="index.html">Trade Home</a>
      <span>/</span>
      <a href="category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}">${escapeHtml(pillar.name)}</a>
      <span>/</span>
      <span class="mono" style="color:#C4121A;font-weight:700">${escapeHtml(product.sku)}</span>
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
        aria-label="View product image ${idx + 1}"
      >
        <img src="${escapeHtml(imgUrl)}" alt="" onerror="this.src='${fallbackSvg}'" />
      </button>
    `
    )
    .join('');

  const specChipsHtml = (product.specs || [])
    .map((s) => `<span class="spec-chip" style="font-size:12px;padding:4px 8px">${escapeHtml(s)}</span>`)
    .join('');

  const whatsappText = `Hi SCHNAP Trade Desk, I'd like a bulk quote on SKU: ${product.sku} (${product.title}). Quantity needed: `;
  const whatsappUrl = `https://wa.me/61291507744?text=${encodeURIComponent(whatsappText)}`;

  mainMount.innerHTML = `
    <!-- Left Column: High-Res CloudFront Image Gallery -->
    <div class="pdp-gallery-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        ${
          product.discountPct > 0 || product.discountLabel
            ? `<span class="badge badge-discount" style="font-size:12px;padding:5px 10px">${escapeHtml(
                product.discountLabel || `Trade Discount ${product.discountPct}%`
              )}</span>`
            : `<span class="badge badge-emerald">Verified Trade Price</span>`
        }
        <span class="mono" style="font-size:11px;color:var(--text-muted)">
          dispatch=products.view&amp;product_id=${escapeHtml(product.id)}
        </span>
      </div>

      <div class="pdp-main-stage" id="pdp-main-image-stage">
        <img
          id="pdp-primary-img"
          src="${escapeHtml(images[0])}"
          alt="${escapeHtml(product.title)}"
          onerror="this.src='${fallbackSvg}'"
        />
      </div>

      <div class="pdp-thumbs">
        ${thumbsHtml}
      </div>

      <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--color-slate-100);display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-muted)">
        <span style="display:inline-flex;align-items:center;gap:4px">
          ${lucideIcon('check', { size: 13 })}
          <span>Direct CloudFront CDN Media (<code class="mono">d35gtgjy55l0bn.cloudfront.net</code>)</span>
        </span>
        <span>Hover to inspect detail</span>
      </div>
    </div>

    <!-- Right Column: Trade Buy Box & Fulfillment Clarity -->
    <div class="pdp-buy-box">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <a href="search.html?q=${encodeURIComponent(product.brand || 'SCHNAP')}" class="badge badge-navy">${escapeHtml(product.brand || 'SCHNAP Trade')}</a>
          <button
            type="button"
            class="sku-copy-pill"
            id="pdp-copy-sku-btn"
            data-sku="${escapeHtml(product.sku)}"
            style="font-size:12px;padding:4px 10px"
          >
            <span>SKU: ${escapeHtml(product.sku)}</span>
            ${lucideIcon('copy', { size: 12, strokeWidth: 2.2 })}
          </button>
        </div>
        <span class="badge badge-emerald">
          ${lucideIcon('check-circle-2', { size: 12 })}
          <span>In Stock — Immediate Dispatch</span>
        </span>
      </div>

      <h1 class="pdp-title">${escapeHtml(product.title)}</h1>

      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
        ${specChipsHtml}
        <span class="spec-chip" style="font-size:12px;padding:4px 8px">AS/NZS 3000 Compliant</span>
      </div>

      <!-- Upfront Trade Pricing Box -->
      <div class="pdp-price-panel">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em">
            Your Direct Trade Price (AUD Inc. GST)
          </div>
          <div style="display:flex;align-items:baseline;gap:0.75rem;margin-top:4px">
            <span class="pdp-trade-price">${formatAud(product.price)}</span>
            ${
              product.listPrice > product.price
                ? `<span class="price-list" style="font-size:16px">Retail List: ${formatAud(product.listPrice)}</span>`
                : ''
            }
          </div>
        </div>
        ${
          savingsAmt > 0
            ? `<div style="text-align:right">
                <span class="badge badge-amber" style="font-size:12px;padding:6px 10px">
                  Save ${formatAud(savingsAmt)} / unit (${product.discountPct}%)
                </span>
              </div>`
            : ''
        }
      </div>

      <!-- Quick Contractor Quantity Pack Increments -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">
          <span style="font-size:12px;font-weight:700;color:#5D1C25">Select Trade Quantity / Box Pack:</span>
          <span class="mono" style="font-size:12px;color:var(--text-muted)" id="pdp-line-total-preview">
            Line Total: <strong>${formatAud(product.price * selectedQty)}</strong>
          </span>
        </div>
        <div class="pdp-pack-pills">
          <button type="button" class="pack-pill-btn is-active" data-pdp-pack="1">+1 Unit</button>
          <button type="button" class="pack-pill-btn" data-pdp-pack="5">+5 Pack</button>
          <button type="button" class="pack-pill-btn" data-pdp-pack="10">+10 Pack</button>
          <button type="button" class="pack-pill-btn" data-pdp-pack="${boxQty}">+Box (${boxQty} Units)</button>
        </div>
      </div>

      <!-- Primary Add to Cart Action Row -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:center">
        <div class="qty-stepper" style="height:48px">
          <button type="button" class="qty-stepper__btn" data-pdp-step="-1" style="width:42px">
            ${lucideIcon('minus', { size: 16, strokeWidth: 2.5 })}
          </button>
          <input
            type="text"
            inputmode="numeric"
            id="pdp-qty-input"
            class="qty-stepper__input"
            value="${selectedQty}"
            style="width:56px;font-size:15px"
            aria-label="Order quantity"
          />
          <button type="button" class="qty-stepper__btn" data-pdp-step="1" style="width:42px">
            ${lucideIcon('plus', { size: 16, strokeWidth: 2.5 })}
          </button>
        </div>
        <button type="button" class="btn btn-primary btn-lg" id="pdp-add-to-cart-btn" style="height:48px">
          ${lucideIcon('shopping-cart', { size: 18, strokeWidth: 2.4 })}
          <span id="pdp-add-btn-label">Add to Trade Cart — ${formatAud(product.price * selectedQty)}</span>
        </button>
      </div>

      <!-- Dynamic $150 Delivery vs. Kingsgrove Pickup Fulfillment Indicator -->
      <div id="pdp-fulfillment-status-box"></div>

      <!-- Trade Desk Bulk Quote & WhatsApp Actions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <a
          href="${whatsappUrl}"
          target="_blank"
          rel="noopener"
          class="btn btn-emerald"
          id="pdp-whatsapp-quote-btn"
        >
          ${lucideIcon('message-circle', { size: 16 })}
          <span>WhatsApp Bulk Quote</span>
        </a>
        <button
          type="button"
          class="btn btn-outline"
          data-open-drawer="quote"
          data-quote-prefill="${escapeHtml(`${selectedQty}x ${product.sku} — ${product.title}`)}"
        >
          ${lucideIcon('clipboard-list', { size: 16 })}
          <span>Add to Project Quote BOM</span>
        </button>
      </div>
    </div>
  `;

  // Render Structured Technical Specifications & Approvals Tabs
  if (tabsMount) {
    const specRowsHtml = Object.entries(product.specsTable || {})
      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
      .join('');

    tabsMount.innerHTML = `
      <div class="pdp-tabs-nav" role="tablist">
        <button type="button" class="pdp-tab-btn is-active" data-pdp-tab="specs" role="tab">
          Structured Electrical Specifications
        </button>
        <button type="button" class="pdp-tab-btn" data-pdp-tab="compliance" role="tab">
          Standards, Approvals &amp; Installation
        </button>
        <button type="button" class="pdp-tab-btn" data-pdp-tab="delivery" role="tab">
          Kingsgrove Pickup &amp; $150 Delivery Rules
        </button>
      </div>

      <div class="pdp-tab-panel is-active" id="pdp-panel-specs">
        <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:2rem;align-items:start">
          <div>
            <h3 style="font-size:1rem;font-weight:800;color:#5D1C25;margin-bottom:0.75rem">Technical Data Sheet — ${escapeHtml(product.sku)}</h3>
            <table class="spec-table">
              <tbody>
                ${specRowsHtml}
              </tbody>
            </table>
          </div>
          <div style="background:var(--color-slate-50);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:1.25rem">
            <h4 style="font-size:14px;font-weight:800;color:#5D1C25;margin-bottom:0.5rem">Contractor Application Notes</h4>
            <ul style="list-style:disc;padding-left:1.2rem;font-size:13px;color:var(--text-secondary);display:flex;flex-direction:column;gap:0.4rem">
              <li>Must be installed by a licensed electrician in accordance with <strong>AS/NZS 3000 Wiring Rules</strong>.</li>
              <li>Stocked in commercial project quantities at SCHNAP Kingsgrove NSW Warehouse.</li>
              <li>Backed by 100-day trade return policy and full manufacturer warranty.</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="pdp-tab-panel" id="pdp-panel-compliance">
        <h3 style="font-size:1rem;font-weight:800;color:#5D1C25;margin-bottom:0.75rem">Australian Regulatory &amp; Standards Compliance</h3>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;max-width:75ch">
          All electrical protection, cable, and lighting equipment distributed by SCHNAP Electric Products complies with Australian Regulatory Compliance Mark (RCM) requirements and relevant AS/NZS standards. Tax invoices with full ABN and part number itemization are issued automatically upon checkout.
        </p>
      </div>

      <div class="pdp-tab-panel" id="pdp-panel-delivery">
        <div class="pdp-fulfillment-card">
          <div>
            <h4 style="font-weight:800;color:#5D1C25;margin-bottom:4px;display:flex;align-items:center;gap:6px">
              ${lucideIcon('map-pin', { size: 16 })}
              <span>Free 7-Day Kingsgrove Trade Counter Pickup</span>
            </h4>
            <p style="font-size:13px;color:var(--text-secondary)">
              Available on <strong>all orders (no minimum spend)</strong>. Collect from <strong>${escapeHtml(CONFIG.STORE_FACTS.address)}</strong>.<br/>
              Hours: <strong>${escapeHtml(CONFIG.STORE_FACTS.hoursShort)}</strong>.
            </p>
          </div>
          <div>
            <h4 style="font-weight:800;color:#5D1C25;margin-bottom:4px;display:flex;align-items:center;gap:6px">
              ${lucideIcon('truck', { size: 16 })}
              <span>Australia-Wide Courier &amp; Same-Day Sydney Delivery</span>
            </h4>
            <p style="font-size:13px;color:var(--text-secondary)">
              Unlocked automatically when your cart reaches <strong>$150.00 AUD or more</strong>. Same-day Sydney metro courier dispatch available on weekday morning trade orders.
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
    <div class="pdp-fulfillment-card" style="border-color:${qualifiesDelivery ? 'var(--color-emerald-500)' : 'var(--border-strong)'}">
      <div>
        <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:${qualifiesDelivery ? 'var(--color-emerald-700)' : '#5D1C25'}">
          ${qualifiesDelivery ? lucideIcon('check-circle-2', { size: 15 }) : lucideIcon('truck', { size: 15 })}
          <span>${qualifiesDelivery ? 'Qualifies for Australia-Wide Delivery' : 'Australia-Wide Courier Delivery ($150+ Rule)'}</span>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-top:4px">
          ${
            qualifiesDelivery
              ? `With this item (${formatAud(currentProduct.price * selectedQty)}) + current cart (${formatAud(cart.subtotal)}), your ${formatAud(combinedTotal)} total unlocks immediate Australia-wide courier delivery!`
              : `Adding ${selectedQty}× brings your cart to ${formatAud(combinedTotal)}. Add ${formatAud(shortfall)} more to unlock courier delivery.`
          }
        </p>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#5D1C25">
          ${lucideIcon('map-pin', { size: 15 })}
          <span>Free Kingsgrove Counter Pickup (Open 7 Days)</span>
        </div>
        <p style="font-size:12px;color:var(--text-secondary);margin-top:4px">
          Unit 3/192A Kingsgrove Rd, Kingsgrove NSW 2208 • Ready for collection 7 days a week.
        </p>
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
      preview.innerHTML = `Line Total: <strong>${formatAud(currentProduct.price * selectedQty)}</strong>`;
    }
    if (addBtnLabel && currentProduct) {
      addBtnLabel.textContent = `Add to Trade Cart — ${formatAud(currentProduct.price * selectedQty)}`;
    }
    updateFulfillmentClarityBox();
  };

  mainMount?.addEventListener('click', (e) => {
    // Thumbnail switch
    const thumbBtn = e.target.closest('[data-pdp-thumb]');
    if (thumbBtn) {
      const src = thumbBtn.getAttribute('data-pdp-thumb');
      const primaryImg = document.getElementById('pdp-primary-img');
      if (primaryImg && src) primaryImg.src = src;
      mainMount.querySelectorAll('[data-pdp-thumb]').forEach((b) => b.classList.remove('is-active'));
      thumbBtn.classList.add('is-active');
      return;
    }

    // Copy SKU
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

    // Pack Pills
    const packBtn = e.target.closest('[data-pdp-pack]');
    if (packBtn) {
      const packQty = parseInt(packBtn.getAttribute('data-pdp-pack'), 10) || 1;
      mainMount.querySelectorAll('[data-pdp-pack]').forEach((b) => b.classList.remove('is-active'));
      packBtn.classList.add('is-active');
      syncSelectedQtyUI(packQty);
      return;
    }

    // Stepper +/-
    const stepBtn = e.target.closest('[data-pdp-step]');
    if (stepBtn) {
      const delta = parseInt(stepBtn.getAttribute('data-pdp-step'), 10) || 0;
      syncSelectedQtyUI(selectedQty + delta);
      return;
    }

    // Add to Cart
    const addBtn = e.target.closest('#pdp-add-to-cart-btn');
    if (addBtn && currentProduct) {
      const nextCart = addToCart(currentProduct, selectedQty);
      showToast({
        title: `Added ${selectedQty}× ${currentProduct.sku}`,
        message: nextCart.isDeliveryUnlocked
          ? `Cart subtotal ${formatAud(nextCart.subtotal)} — Australia-wide delivery unlocked!`
          : `Cart subtotal ${formatAud(nextCart.subtotal)} — Free Kingsgrove Pickup ready`,
        type: 'success',
      });
      openDrawer('cart');
    }
  });

  document.getElementById('pdp-qty-input')?.addEventListener('input', (e) => {
    syncSelectedQtyUI(e.target.value);
  });

  // Tabs switching
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
