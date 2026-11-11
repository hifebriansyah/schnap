// ==========================================================================
// SCHNAP Electric Products — Full Trade Cart & BOM Controller (cart.js)
// Hydrates cart.html via dispatch=checkout.cart, checkout.update, checkout.delete
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell } from '../components/header.js';
import {
  formatAud,
  escapeHtml,
  renderProductCard,
  bindProductCatalogEvents,
} from '../components/productCard.js';
import { openQuickView } from '../components/quickView.js';
import { lucideIcon, hydrateLucideIcons } from '../components/icons.js';
import {
  subscribeCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  syncCartFromBackend,
  submitNativeCartHandoff,
  fetchSearchCatalog,
} from '../core/dispatch.js';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js';
import { showToast } from '../components/notifications.js';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js';

export async function initCartPage() {
  initGlobalShell();
  hydrateLucideIcons(document);
  bindCartPageEvents();

  subscribeCart((state) => {
    renderFulfillmentTracker(state);
    renderCartTable(state);
    renderCartSummary(state);
  });

  renderCrossSellItems();
  await syncCartFromBackend();
}

function renderFulfillmentTracker(state) {
  const mount = document.getElementById('cart-fulfillment-tracker');
  if (!mount) return;

  mount.className = `fulfillment-tracker-card ${state.isDeliveryUnlocked ? 'is-unlocked' : ''}`;
  mount.innerHTML = `
    <div class="fulfillment-tracker-top">
      <div class="fulfillment-tracker-status">
        <div class="fulfillment-icon-circle">
          ${
            state.isDeliveryUnlocked
              ? lucideIcon('check', { size: 22, strokeWidth: 2.5 })
              : lucideIcon('truck', { size: 22, strokeWidth: 2.2 })
          }
        </div>
        <div>
          <h2 style="font-size:1.05rem;font-weight:800;color:#5D1C25">
            ${
              state.isDeliveryUnlocked
                ? 'Australia-Wide Courier Delivery & Same-Day Sydney Dispatch Unlocked!'
                : `Add ${formatAud(state.remainingForDelivery)} more to unlock Australia-Wide Courier Delivery`
            }
          </h2>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:2px">
            ${
              state.isDeliveryUnlocked
                ? 'Your trade order meets the $150.00 AUD minimum delivery threshold — choose courier delivery or free Kingsgrove pickup at checkout.'
                : 'Per SCHNAP shipping policy, orders under $150.00 AUD are eligible for Free 7-Day Pickup at Kingsgrove NSW (3/192A Kingsgrove Rd).'
            }
          </p>
        </div>
      </div>
      <div class="mono" style="font-size:13px;font-weight:800;color:#5D1C25">
        ${formatAud(state.subtotal)} / ${formatAud(state.threshold)}
      </div>
    </div>

    <div class="fulfillment-bar-outer">
      <div class="fulfillment-bar-inner" style="width:${state.progressPct}%"></div>
    </div>

    <div class="fulfillment-dual-options">
      <div class="fulfillment-option-pill ${!state.isDeliveryUnlocked ? 'is-active' : ''}">
        <span style="color:#EB1B24;margin-top:2px">${lucideIcon('map-pin', { size: 18 })}</span>
        <div>
          <strong style="display:block;color:#5D1C25">Free 7-Day Kingsgrove Trade Counter Pickup</strong>
          <span style="color:var(--text-muted)">Always unlocked ($0 minimum) • ${escapeHtml(CONFIG.STORE_FACTS.address)}</span>
        </div>
      </div>
      <div class="fulfillment-option-pill ${state.isDeliveryUnlocked ? 'is-active' : ''}">
        <span style="color:${state.isDeliveryUnlocked ? 'var(--color-emerald-600)' : '#EB1B24'};margin-top:2px">${lucideIcon('truck', { size: 18 })}</span>
        <div>
          <strong style="display:block;color:${state.isDeliveryUnlocked ? 'var(--color-emerald-700)' : '#5D1C25'}">
            Australia-Wide Delivery &amp; Same-Day Sydney Dispatch
          </strong>
          <span style="color:var(--text-muted)">
            ${state.isDeliveryUnlocked ? 'Unlocked ($150+ order)' : `Requires $150.00+ order (${formatAud(state.remainingForDelivery)} away)`}
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderCartTable(state) {
  const tbody = document.getElementById('cart-table-body');
  const countBadge = document.getElementById('cart-header-count');

  if (countBadge) {
    countBadge.textContent = `${state.itemCount} ${state.itemCount === 1 ? 'Unit' : 'Units'} (${state.items.length} Line Items)`;
  }

  if (!tbody) return;

  if (state.items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:3.5rem 1.5rem">
          <div style="font-size:1.15rem;font-weight:800;color:#5D1C25;margin-bottom:0.5rem">Your Trade Cart is Empty</div>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.25rem">
            Use the Quick-Add by SKU bar above or browse our 6-pillar electrical catalog.
          </p>
          <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-primary btn-sm">
            <span>Browse Electrical Catalog</span>
            ${lucideIcon('arrow-right', { size: 14 })}
          </a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.items
    .map((item) => {
      const imgUrl = normalizeImageUrl(item.image, { sku: item.sku, brand: item.brand });
      const fallbackSvg = buildSchematicPlaceholder(item.sku, item.brand);
      const lineTotal = item.price * item.qty;

      return `
        <tr data-cart-row="${escapeHtml(item.id)}">
          <td>
            <div class="cart-item-product">
              <a href="product.html?id=${encodeURIComponent(item.id)}">
                <img src="${escapeHtml(imgUrl)}" alt="" class="cart-item-img" onerror="this.src='${fallbackSvg}'" />
              </a>
              <div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                  <span class="sku-copy-pill mono">${escapeHtml(item.sku)}</span>
                  <span style="font-size:11px;font-weight:700;color:var(--text-muted)">${escapeHtml(item.brand || 'SCHNAP')}</span>
                </div>
                <a
                  href="product.html?id=${encodeURIComponent(item.id)}"
                  style="font-weight:700;color:var(--text-primary);font-size:14px;line-height:1.35;display:block"
                >
                  ${escapeHtml(item.title)}
                </a>
                <div style="font-size:11px;color:var(--color-emerald-600);font-weight:600;margin-top:3px;display:inline-flex;align-items:center;gap:4px">
                  ${lucideIcon('check-circle-2', { size: 12 })}
                  <span>In Stock — Kingsgrove Warehouse</span>
                </div>
              </div>
            </div>
          </td>
          <td class="mono" style="white-space:nowrap">
            <strong style="font-size:15px;color:#5D1C25">${formatAud(item.price)}</strong>
            ${
              item.listPrice > item.price
                ? `<div style="font-size:11px;color:var(--color-slate-400);text-decoration:line-through">${formatAud(item.listPrice)}</div>`
                : ''
            }
          </td>
          <td style="white-space:nowrap">
            <div class="qty-stepper">
              <button type="button" class="qty-stepper__btn" data-cart-qty="${item.qty - 1}" data-id="${escapeHtml(item.id)}">
                ${lucideIcon('minus', { size: 13, strokeWidth: 2.5 })}
              </button>
              <input
                type="text"
                inputmode="numeric"
                class="qty-stepper__input"
                value="${item.qty}"
                data-cart-input="${escapeHtml(item.id)}"
                aria-label="Quantity for ${escapeHtml(item.sku)}"
              />
              <button type="button" class="qty-stepper__btn" data-cart-qty="${item.qty + 1}" data-id="${escapeHtml(item.id)}">
                ${lucideIcon('plus', { size: 13, strokeWidth: 2.5 })}
              </button>
            </div>
          </td>
          <td class="mono" style="white-space:nowrap;font-weight:800;font-size:16px;color:#5D1C25">
            ${formatAud(lineTotal)}
          </td>
          <td style="text-align:right">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              data-cart-delete="${escapeHtml(item.id)}"
              title="Remove line item (dispatch=checkout.delete)"
              style="color:var(--color-slate-500)"
            >
              ${lucideIcon('trash-2', { size: 14 })}
              <span>Remove</span>
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderCartSummary(state) {
  const subtotalEl = document.getElementById('summary-subtotal');
  const savingsEl = document.getElementById('summary-savings');
  const gstEl = document.getElementById('summary-gst');
  const deliveryEl = document.getElementById('summary-delivery');
  const totalEl = document.getElementById('summary-total');

  const gstIncluded = state.subtotal / 11;

  if (subtotalEl) subtotalEl.textContent = formatAud(state.subtotal);
  if (savingsEl) savingsEl.textContent = `-${formatAud(state.tradeSavings)}`;
  if (gstEl) gstEl.textContent = formatAud(gstIncluded);
  if (deliveryEl) {
    deliveryEl.innerHTML = state.isDeliveryUnlocked
      ? `<span style="color:var(--color-emerald-600);font-weight:700">Eligible ($150+ Unlocked)</span>`
      : `<span style="color:#5D1C25;font-weight:700">Free Kingsgrove Pickup</span>`;
  }
  if (totalEl) totalEl.textContent = formatAud(state.subtotal);
}

function bindCartPageEvents() {
  const tbody = document.getElementById('cart-table-body');

  tbody?.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-cart-qty]');
    if (qtyBtn) {
      const id = qtyBtn.getAttribute('data-id');
      const nextQty = parseInt(qtyBtn.getAttribute('data-cart-qty'), 10);
      updateCartQty(id, nextQty);
      return;
    }

    const delBtn = e.target.closest('[data-cart-delete]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-cart-delete');
      removeFromCart(id);
      showToast({
        title: 'Line Item Removed',
        message: 'Synced with CS-Cart dispatch=checkout.delete',
        type: 'info',
      });
    }
  });

  tbody?.addEventListener('change', (e) => {
    const input = e.target.closest('[data-cart-input]');
    if (input) {
      const id = input.getAttribute('data-cart-input');
      updateCartQty(id, parseInt(input.value, 10) || 1);
    }
  });

  // Quick-Add by SKU Form
  const quickSkuForm = document.getElementById('quick-add-sku-form');
  quickSkuForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const skuInput = document.getElementById('quick-sku-code');
    const qtyInput = document.getElementById('quick-sku-qty');
    const query = (skuInput?.value || '').trim();
    const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);
    if (!query) return;

    const qLower = query.toLowerCase();
    let matched = SEED_PRODUCTS.find(
      (p) => p.sku.toLowerCase() === qLower || p.sku.toLowerCase().includes(qLower) || p.title.toLowerCase().includes(qLower)
    );

    if (!matched) {
      try {
        const res = await fetchSearchCatalog({ query, page: 1 });
        matched = res.products?.[0];
      } catch {
        // ignore
      }
    }

    if (matched) {
      addToCart(matched, qty);
      if (skuInput) skuInput.value = '';
      if (qtyInput) qtyInput.value = '1';
      showToast({
        title: `Quick-Added ${qty}× ${matched.sku}`,
        message: matched.title,
        type: 'success',
      });
    } else {
      showToast({
        title: 'SKU Not Found',
        message: `Could not find SKU "${query}". Try LX620G2, LA210, F3015BLACK, or 3800-CTV.`,
        type: 'error',
      });
    }
  });

  // Clear Cart Button
  document.getElementById('cart-clear-all-btn')?.addEventListener('click', () => {
    clearCart();
    showToast({ title: 'Trade Cart Cleared', message: 'All line items removed.', type: 'info' });
  });

  // Approach B: Native CS-Cart Form Handoff Button
  document.getElementById('cart-live-handoff-btn')?.addEventListener('click', () => {
    const ok = submitNativeCartHandoff('checkout.cart');
    if (ok) {
      showToast({
        title: 'Transferring Cart to Live SCHNAP.com.au',
        message: 'Submitting standard HTML POST form (dispatch[checkout.add]) in a new tab...',
        type: 'success',
      });
    }
  });
}

function renderCrossSellItems() {
  const mount = document.getElementById('cart-cross-sell-mount');
  if (!mount) return;
  const picks = SEED_PRODUCTS.slice(0, 4);
  mount.innerHTML = picks.map((p) => renderProductCard(p)).join('');
  bindProductCatalogEvents(mount, {
    getProducts: () => SEED_PRODUCTS,
    onQuickView: (id, prod) => openQuickView(id, prod),
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartPage);
} else {
  initCartPage();
}
