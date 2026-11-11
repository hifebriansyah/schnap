// ==========================================================================
// SCHNAP Electric Products — Reusable B2B Product Card & Trade Table Component
// Supports Grid View & Compact Trade Table View (Power-User BOM Mode)
// ==========================================================================

import { normalizeImageUrl, getRetinaSrcset, buildSchematicPlaceholder } from '../core/media.js';
import { addToCart, prefetchResource } from '../core/dispatch.js';
import { bindHoverPrefetch } from '../core/cache.js';
import { showToast } from './notifications.js';

export function formatAud(amount) {
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a single B2B Trade Product Card (Grid View)
 */
export function renderProductCard(product) {
  const id = escapeHtml(product.id);
  const sku = escapeHtml(product.sku || `SKU-${id}`);
  const title = escapeHtml(product.title);
  const brand = escapeHtml(product.brand || 'SCHNAP');
  const imgUrl = normalizeImageUrl(product.image, { sku: product.sku, brand: product.brand });
  const srcset = getRetinaSrcset(imgUrl);
  const fallbackSvg = buildSchematicPlaceholder(product.sku, product.brand);
  const productUrl = `product.html?id=${encodeURIComponent(product.id)}`;
  const specs = (product.specs || []).slice(0, 4);

  const discountBadge =
    product.discountPct > 0 || product.discountLabel
      ? `<span class="badge badge-discount">${escapeHtml(
          product.discountLabel || `Trade Discount ${product.discountPct}%`
        )}</span>`
      : `<span class="badge badge-emerald">Trade Price</span>`;

  const listPriceHtml =
    product.listPrice && product.listPrice > product.price
      ? `<span class="price-list" title="Retail List Price">${formatAud(product.listPrice)}</span>`
      : '';

  const specChipsHtml = specs.length
    ? specs.map((s) => `<span class="spec-chip">${escapeHtml(s)}</span>`).join('')
    : `<span class="spec-chip">AS/NZS Compliant</span><span class="spec-chip">In Stock</span>`;

  return `
    <article class="product-card" data-product-card="${id}" data-prefetch-key="product:${id}">
      <div class="product-card__badges">
        ${discountBadge}
        <button
          type="button"
          class="product-card__qv-trigger"
          data-quick-view="${id}"
          title="Quick View Technical Sheet"
          aria-label="Quick View ${title}"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      <a href="${productUrl}" class="product-card__media" aria-label="${title}">
        <img
          src="${escapeHtml(imgUrl)}"
          ${srcset ? `srcset="${escapeHtml(srcset)}"` : ''}
          alt="${title}"
          loading="lazy"
          width="180"
          height="180"
          onerror="this.removeAttribute('srcset');this.src='${fallbackSvg}'"
        />
      </a>

      <div class="product-card__body">
        <div class="product-card__meta-row">
          <button
            type="button"
            class="sku-copy-pill"
            data-copy-sku="${sku}"
            title="Click to copy part number ${sku}"
          >
            <span>${sku}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <span class="product-card__brand">${brand}</span>
        </div>

        <a href="${productUrl}" class="product-card__title" title="${title}">
          ${title}
        </a>

        <div class="product-card__specs">
          ${specChipsHtml}
        </div>

        <div class="product-card__pricing">
          <div>
            <span class="price-trade">${formatAud(product.price)}</span>
            ${listPriceHtml}
          </div>
          <span class="price-gst-note">Inc. GST</span>
        </div>

        <div class="product-card__actions">
          <div class="qty-stepper" aria-label="Quantity selector">
            <button type="button" class="qty-stepper__btn" data-qty-step="-1" aria-label="Decrease quantity">&minus;</button>
            <input
              type="text"
              inputmode="numeric"
              class="qty-stepper__input"
              value="1"
              min="1"
              aria-label="Quantity for ${sku}"
            />
            <button type="button" class="qty-stepper__btn" data-qty-step="1" aria-label="Increase quantity">&#43;</button>
          </div>
          <button
            type="button"
            class="btn btn-primary product-card__add-btn"
            data-add-to-cart="${id}"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Renders Compact Trade Table View (Power-User Bill of Materials Mode)
 */
export function renderTradeTable(products = []) {
  const rowsHtml = products
    .map((product) => {
      const id = escapeHtml(product.id);
      const sku = escapeHtml(product.sku || `SKU-${id}`);
      const title = escapeHtml(product.title);
      const brand = escapeHtml(product.brand || 'SCHNAP');
      const imgUrl = normalizeImageUrl(product.image, { sku: product.sku, brand: product.brand });
      const fallbackSvg = buildSchematicPlaceholder(product.sku, product.brand);
      const productUrl = `product.html?id=${encodeURIComponent(product.id)}`;
      const specs = (product.specs || []).slice(0, 3).map((s) => `<span class="spec-chip">${escapeHtml(s)}</span>`).join(' ');

      return `
        <tr data-product-card="${id}" data-prefetch-key="product:${id}">
          <td style="width:64px">
            <a href="${productUrl}">
              <img
                src="${escapeHtml(imgUrl)}"
                alt="${title}"
                class="trade-table__thumb"
                loading="lazy"
                onerror="this.src='${fallbackSvg}'"
              />
            </a>
          </td>
          <td style="white-space:nowrap">
            <button type="button" class="sku-copy-pill" data-copy-sku="${sku}" title="Copy SKU">
              <span>${sku}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px;font-weight:600">${brand}</div>
          </td>
          <td>
            <a href="${productUrl}" class="trade-table__title">${title}</a>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${specs}</div>
          </td>
          <td style="white-space:nowrap">
            ${
              product.discountPct > 0
                ? `<span class="badge badge-discount">${product.discountPct}% OFF</span>`
                : `<span class="badge badge-emerald">Trade</span>`
            }
          </td>
          <td style="white-space:nowrap" class="mono">
            <strong style="font-size:15px;color:var(--color-navy-900)">${formatAud(product.price)}</strong>
            ${
              product.listPrice > product.price
                ? `<div style="font-size:11px;color:var(--color-slate-400);text-decoration:line-through">${formatAud(product.listPrice)}</div>`
                : ''
            }
          </td>
          <td style="white-space:nowrap;width:230px">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="qty-stepper">
                <button type="button" class="qty-stepper__btn" data-qty-step="-1">&minus;</button>
                <input type="text" inputmode="numeric" class="qty-stepper__input" value="1" min="1" aria-label="Qty for ${sku}" />
                <button type="button" class="qty-stepper__btn" data-qty-step="1">&#43;</button>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-add-to-cart="${id}">
                + Add
              </button>
              <button type="button" class="product-card__qv-trigger" data-quick-view="${id}" title="Quick View">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="trade-table-wrap">
      <table class="trade-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Part Number / SKU</th>
            <th>Description & Electrical Ratings</th>
            <th>Trade Disc.</th>
            <th>Trade Price</th>
            <th>Order Qty & Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders deterministic shimmer skeleton cards while awaiting CS-Cart response
 */
export function renderSkeletonGrid(count = 8) {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-line skeleton-line--short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-line--med"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `
    )
    .join('');
}

/**
 * Binds interactive events (qty steppers, SKU copy, optimistic Add to Cart, Quick View, and hover prefetch)
 */
export function bindProductCatalogEvents(containerEl, { getProducts, onQuickView } = {}) {
  if (!containerEl || containerEl.dataset.catalogBound === 'true') return;
  containerEl.dataset.catalogBound = 'true';

  bindHoverPrefetch(containerEl, (key) => prefetchResource(key));

  containerEl.addEventListener('click', (e) => {
    // 1. Copy SKU button
    const copyBtn = e.target.closest('[data-copy-sku]');
    if (copyBtn) {
      e.preventDefault();
      const sku = copyBtn.getAttribute('data-copy-sku');
      navigator.clipboard?.writeText(sku).catch(() => {});
      copyBtn.classList.add('is-copied');
      const labelSpan = copyBtn.querySelector('span');
      const prevText = labelSpan ? labelSpan.textContent : sku;
      if (labelSpan) labelSpan.textContent = 'Copied!';
      showToast({
        title: 'Part Number Copied',
        message: `SKU ${sku} copied to clipboard`,
        type: 'success',
        duration: 2000,
      });
      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        if (labelSpan) labelSpan.textContent = prevText;
      }, 1400);
      return;
    }

    // 2. Quantity Stepper (+/-)
    const stepBtn = e.target.closest('[data-qty-step]');
    if (stepBtn) {
      e.preventDefault();
      const delta = parseInt(stepBtn.getAttribute('data-qty-step'), 10) || 0;
      const stepper = stepBtn.closest('.qty-stepper');
      const input = stepper?.querySelector('.qty-stepper__input');
      if (input) {
        const current = parseInt(input.value, 10) || 1;
        input.value = String(Math.max(1, current + delta));
      }
      return;
    }

    // 3. Add to Cart button
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      const prodId = addBtn.getAttribute('data-add-to-cart');
      const card = addBtn.closest('[data-product-card]');
      const qtyInput = card?.querySelector('.qty-stepper__input');
      const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);

      const list = typeof getProducts === 'function' ? getProducts() : [];
      const product = list.find((p) => String(p.id) === String(prodId));
      if (product) {
        const nextCart = addToCart(product, qty);
        const origHtml = addBtn.innerHTML;
        addBtn.innerHTML = `<span>✓ Added (${qty})</span>`;
        addBtn.classList.add('btn-emerald');
        showToast({
          title: `Added ${qty}× ${product.sku}`,
          message: nextCart.isDeliveryUnlocked
            ? `Cart subtotal ${formatAud(nextCart.subtotal)} — Australia-wide delivery unlocked!`
            : `Add ${formatAud(nextCart.remainingForDelivery)} more for Australia-wide delivery, or collect free from Kingsgrove.`,
          type: 'success',
        });
        setTimeout(() => {
          addBtn.innerHTML = origHtml;
          addBtn.classList.remove('btn-emerald');
        }, 1200);
      }
      return;
    }

    // 4. Quick View button
    const qvBtn = e.target.closest('[data-quick-view]');
    if (qvBtn && typeof onQuickView === 'function') {
      e.preventDefault();
      const prodId = qvBtn.getAttribute('data-quick-view');
      const list = typeof getProducts === 'function' ? getProducts() : [];
      const product = list.find((p) => String(p.id) === String(prodId));
      onQuickView(prodId, product);
    }
  });
}
