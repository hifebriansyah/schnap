// ==========================================================================
// SCHNAP Electric Products — Modal Quick-View Component (quickView.js)
// Hydrated via dispatch=products.view / products.quick_view
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { fetchProductDetail, addToCart } from '../core/dispatch.js';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js';
import { formatAud, escapeHtml } from './productCard.js';
import { showToast } from './notifications.js';
import { lucideIcon } from './icons.js';
import { CONFIG } from '../core/config.js';

let modalBackdrop = null;
let activeProduct = null;

function ensureModal() {
  if (modalBackdrop && document.body.contains(modalBackdrop)) return modalBackdrop;
  modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'modal-backdrop';
  modalBackdrop.setAttribute('role', 'dialog');
  modalBackdrop.setAttribute('aria-modal', 'true');
  modalBackdrop.setAttribute('aria-label', 'Product Quick View');
  modalBackdrop.innerHTML = `<div class="quickview-dialog" id="quickview-dialog-content"></div>`;
  document.body.appendChild(modalBackdrop);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop || e.target.closest('[data-qv-close]')) {
      closeQuickView();
      return;
    }

    const packBtn = e.target.closest('[data-qv-pack]');
    if (packBtn) {
      const qty = parseInt(packBtn.getAttribute('data-qv-pack'), 10) || 1;
      const input = modalBackdrop.querySelector('#qv-qty-input');
      if (input) input.value = String(qty);
      modalBackdrop.querySelectorAll('[data-qv-pack]').forEach((b) => b.classList.remove('is-active'));
      packBtn.classList.add('is-active');
      return;
    }

    const stepBtn = e.target.closest('[data-qv-step]');
    if (stepBtn) {
      const delta = parseInt(stepBtn.getAttribute('data-qv-step'), 10) || 0;
      const input = modalBackdrop.querySelector('#qv-qty-input');
      if (input) {
        input.value = String(Math.max(1, (parseInt(input.value, 10) || 1) + delta));
      }
      return;
    }

    const addBtn = e.target.closest('[data-qv-add]');
    if (addBtn && activeProduct) {
      const input = modalBackdrop.querySelector('#qv-qty-input');
      const qty = Math.max(1, parseInt(input?.value || '1', 10) || 1);
      const cart = addToCart(activeProduct, qty);
      showToast({
        title: `Added ${qty}× ${activeProduct.sku} to Trade Cart`,
        message: cart.isDeliveryUnlocked
          ? `Subtotal ${formatAud(cart.subtotal)} — Eligible for Australia-Wide Delivery!`
          : `Subtotal ${formatAud(cart.subtotal)} — Free Kingsgrove Pickup Ready`,
        type: 'success',
      });
      closeQuickView();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop?.classList.contains('is-open')) {
      closeQuickView();
    }
  });

  return modalBackdrop;
}

export async function openQuickView(productId, initialProduct = null) {
  const modal = ensureModal();
  const dialog = modal.querySelector('#quickview-dialog-content');
  modal.classList.add('is-open');

  if (initialProduct) {
    activeProduct = initialProduct;
    renderQuickViewContent(dialog, initialProduct, { loadingSpecs: true });
  } else {
    dialog.innerHTML = `<div style="padding:3rem;text-align:center">Loading technical sheet...</div>`;
  }

  try {
    const fullProduct = await fetchProductDetail(productId);
    if (fullProduct) {
      activeProduct = { ...initialProduct, ...fullProduct, price: fullProduct.price || initialProduct?.price || 0 };
      renderQuickViewContent(dialog, activeProduct, { loadingSpecs: false });
    }
  } catch {
    // Keep initialProduct rendered
  }
}

export function closeQuickView() {
  if (modalBackdrop) {
    modalBackdrop.classList.remove('is-open');
  }
}

function renderQuickViewContent(container, product, { loadingSpecs = false } = {}) {
  const sku = escapeHtml(product.sku);
  const title = escapeHtml(product.title);
  const brand = escapeHtml(product.brand || 'SCHNAP Trade');
  const imgUrl = normalizeImageUrl(product.images?.[0] || product.image, {
    upgradeRetina: false,
    sku: product.sku,
    brand: product.brand,
  });
  const fallbackSvg = buildSchematicPlaceholder(product.sku, product.brand);
  const specsEntries = Object.entries(product.specsTable || {}).slice(0, 6);
  const boxQty = product.boxQty || 10;

  container.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title">
        <span class="badge badge-amber">QUICK TECHNICAL VIEW</span>
        <span class="mono" style="font-size:13px">${sku}</span>
      </div>
      <button type="button" class="drawer-close-btn" data-qv-close aria-label="Close Quick View">
        ${lucideIcon('x', { size: 18 })}
      </button>
    </div>

    <div class="quickview-grid">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div style="border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:1.5rem;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;background:#fff">
          <img
            src="${escapeHtml(imgUrl)}"
            alt="${title}"
            style="max-height:280px;object-fit:contain"
            onerror="this.src='${fallbackSvg}'"
          />
        </div>
        <div style="background:var(--color-slate-50);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0.75rem 1rem;font-size:12px">
          <strong style="color:var(--color-emerald-700);display:flex;align-items:center;gap:4px">
            ${lucideIcon('check-circle-2', { size: 14 })}
            <span>In Stock at Kingsgrove NSW Trade Counter</span>
          </strong>
          <div style="color:var(--text-muted);margin-top:2px">${escapeHtml(CONFIG.STORE_FACTS.address)} • Open 7 Days</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
          <span class="badge badge-navy">${brand}</span>
          ${
            product.discountPct > 0
              ? `<span class="badge badge-discount">Trade Discount ${product.discountPct}%</span>`
              : ''
          }
          <span class="badge badge-emerald">${lucideIcon('shield-check', { size: 12 })}<span>AS/NZS Compliant</span></span>
        </div>

        <h2 style="font-family:var(--font-display);font-size:1.35rem;font-weight:800;line-height:1.25;color:#5D1C25">${title}</h2>

        <div class="pdp-price-panel">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted)">Trade Price (Inc. GST)</div>
            <div style="display:flex;align-items:baseline;gap:0.5rem;margin-top:2px">
              <span class="pdp-trade-price">${formatAud(product.price)}</span>
              ${
                product.listPrice > product.price
                  ? `<span class="price-list" style="font-size:14px">List ${formatAud(product.listPrice)}</span>`
                  : ''
              }
            </div>
          </div>
          <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn btn-outline btn-sm">
            <span>Full Spec Sheet</span>
            ${lucideIcon('arrow-right', { size: 14 })}
          </a>
        </div>

        <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:center">
          <div class="qty-stepper" style="height:44px">
            <button type="button" class="qty-stepper__btn" data-qv-step="-1" style="width:38px">
              ${lucideIcon('minus', { size: 14, strokeWidth: 2.5 })}
            </button>
            <input type="text" id="qv-qty-input" class="qty-stepper__input" value="1" style="width:52px;font-size:14px" />
            <button type="button" class="qty-stepper__btn" data-qv-step="1" style="width:38px">
              ${lucideIcon('plus', { size: 14, strokeWidth: 2.5 })}
            </button>
          </div>
          <button type="button" class="btn btn-primary btn-lg" data-qv-add>
            ${lucideIcon('shopping-cart', { size: 17 })}
            <span>Add to Trade Cart</span>
          </button>
        </div>

        <div style="margin-top:0.25rem">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">
            Key Electrical Specifications ${loadingSpecs ? '(Syncing live CS-Cart data...)' : ''}
          </div>
          <table class="spec-table">
            <tbody>
              ${
                specsEntries.length
                  ? specsEntries
                      .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
                      .join('')
                  : `<tr><th>Part Number</th><td>${sku}</td></tr><tr><th>Brand</th><td>${brand}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
