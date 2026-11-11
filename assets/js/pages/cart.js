// ==========================================================================
// SCHNAP Electric Products — Cart Page Controller (cart.js)
// Clean, focused cart management
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
              ? lucideIcon('check', { size: 20, strokeWidth: 2.4 })
              : lucideIcon('truck', { size: 20, strokeWidth: 2 })
          }
        </div>
        <div>
          <h2 style="font-size:1rem;font-weight:700;color:#5D1C25">
            ${
              state.isDeliveryUnlocked
                ? 'Australia-Wide Delivery Unlocked'
                : `Add ${formatAud(state.remainingForDelivery)} more for Australia-Wide Delivery`
            }
          </h2>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:2px">
            ${
              state.isDeliveryUnlocked
                ? 'Choose courier delivery or free Kingsgrove counter pickup at checkout.'
                : 'Orders under $150 are available for free 7-day pickup at our Kingsgrove branch.'
            }
          </p>
        </div>
      </div>
      <div class="mono" style="font-size:13px;font-weight:700;color:#5D1C25">
        ${formatAud(state.subtotal)} / ${formatAud(state.threshold)}
      </div>
    </div>

    <div class="fulfillment-bar-outer">
      <div class="fulfillment-bar-inner" style="width:${state.progressPct}%"></div>
    </div>
  `;
}

function renderCartTable(state) {
  const tbody = document.getElementById('cart-table-body');
  const countBadge = document.getElementById('cart-header-count');

  if (countBadge) {
    countBadge.textContent = `${state.itemCount}`;
  }

  if (!tbody) return;

  if (state.items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:3.5rem 1.5rem">
          <div style="font-size:1.1rem;font-weight:700;color:#5D1C25;margin-bottom:0.5rem">Your Cart is Empty</div>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.25rem">
            Use the Quick-Add SKU bar above or browse our catalog.
          </p>
          <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-primary btn-sm">
            <span>Browse Catalog</span>
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
                  <span style="font-size:11px;font-weight:600;color:var(--color-gold-600)">${escapeHtml(item.brand || 'SCHNAP')}</span>
                </div>
                <a
                  href="product.html?id=${encodeURIComponent(item.id)}"
                  style="font-weight:600;color:var(--text-primary);font-size:14px;line-height:1.35;display:block"
                >
                  ${escapeHtml(item.title)}
                </a>
              </div>
            </div>
          </td>
          <td class="mono" style="white-space:nowrap">
            <strong style="font-size:15px;color:#5D1C25">${formatAud(item.price)}</strong>
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
                aria-label="Quantity"
              />
              <button type="button" class="qty-stepper__btn" data-cart-qty="${item.qty + 1}" data-id="${escapeHtml(item.id)}">
                ${lucideIcon('plus', { size: 13, strokeWidth: 2.5 })}
              </button>
            </div>
          </td>
          <td class="mono" style="white-space:nowrap;font-weight:700;font-size:15px;color:#5D1C25">
            ${formatAud(lineTotal)}
          </td>
          <td style="text-align:right">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              data-cart-delete="${escapeHtml(item.id)}"
              title="Remove item"
            >
              ${lucideIcon('trash-2', { size: 14 })}
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
      ? `<span style="color:var(--color-emerald-600);font-weight:600">Delivery Unlocked</span>`
      : `<span style="color:#5D1C25;font-weight:600">Kingsgrove Pickup</span>`;
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
    }
  });

  tbody?.addEventListener('change', (e) => {
    const input = e.target.closest('[data-cart-input]');
    if (input) {
      const id = input.getAttribute('data-cart-input');
      updateCartQty(id, parseInt(input.value, 10) || 1);
    }
  });

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
        title: `Added ${qty}× ${matched.sku}`,
        message: matched.title,
        type: 'success',
      });
    } else {
      showToast({
        title: 'Part Not Found',
        message: `Could not find "${query}".`,
        type: 'error',
      });
    }
  });

  document.getElementById('cart-clear-all-btn')?.addEventListener('click', () => {
    clearCart();
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
