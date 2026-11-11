// ==========================================================================
// SCHNAP Electric Products — Checkout Controller (checkout.js)
// Clean 3-step checkout with live store checkout handoff
// ==========================================================================

import { CONFIG } from '../core/config.js?v=afde963';
import { initGlobalShell } from '../components/header.js?v=afde963';
import { formatAud, escapeHtml } from '../components/productCard.js?v=afde963';
import { lucideIcon, hydrateLucideIcons } from '../components/icons.js?v=afde963';
import {
  getCartState,
  subscribeCart,
  rawDispatch,
  submitNativeCartHandoff,
} from '../core/dispatch.js?v=afde963';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js?v=afde963';
import { showToast } from '../components/notifications.js?v=afde963';

let selectedFulfillment = 'pickup';
let selectedPayment = 'card';
let shippingCost = 0;

export async function initCheckoutPage() {
  initGlobalShell();
  hydrateLucideIcons(document);

  subscribeCart((state) => {
    if (!state.isDeliveryUnlocked) {
      selectedFulfillment = 'pickup';
      shippingCost = 0;
    } else if (selectedFulfillment === 'pickup' && !document.body.dataset.userChosePickup) {
      selectedFulfillment = 'sydney_same_day';
      shippingCost = 0;
    }
    renderFulfillmentStep(state);
    renderOrderSummary(state);
  });

  bindCheckoutEvents();

  try {
    await rawDispatch('checkout.checkout');
  } catch {
    // Fallback
  }
}

function renderFulfillmentStep(state) {
  const mount = document.getElementById('checkout-fulfillment-methods');
  const addressBlock = document.getElementById('checkout-delivery-address-block');
  const ruleAlert = document.getElementById('checkout-150-rule-alert');

  if (ruleAlert) {
    if (state.isDeliveryUnlocked) {
      ruleAlert.innerHTML = `
        <div style="background:var(--color-emerald-50);border:1px solid var(--color-emerald-500);border-radius:var(--radius-lg);padding:0.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem">
          <div style="font-size:13px;color:var(--color-emerald-700);display:flex;align-items:center;gap:6px">
            ${lucideIcon('check-circle-2', { size: 16 })}
            <span><strong>Australia-Wide Delivery Unlocked.</strong> Choose courier delivery or Kingsgrove counter pickup.</span>
          </div>
          <span class="badge badge-emerald mono">${formatAud(state.subtotal)}</span>
        </div>
      `;
    } else {
      ruleAlert.innerHTML = `
        <div style="background:var(--color-gold-50);border:1px solid var(--color-gold-200);border-radius:var(--radius-lg);padding:0.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
          <div style="font-size:13px;color:#5C0632">
            <strong style="display:flex;align-items:center;gap:6px">
              ${lucideIcon('map-pin', { size: 15 })}
              <span>Orders under $150 are Pickup Only at Kingsgrove</span>
            </strong>
            <span style="font-size:12px;color:var(--text-secondary);display:block;margin-top:2px">Add <strong>${formatAud(state.remainingForDelivery)}</strong> more for Australia-wide delivery, or collect free 7 days a week.</span>
          </div>
          <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-outline btn-sm">
            ${lucideIcon('plus', { size: 13 })}
            <span>Add Items</span>
          </a>
        </div>
      `;
    }
  }

  if (mount) {
    const canDeliver = state.isDeliveryUnlocked;

    mount.innerHTML = `
      <label class="method-radio-card ${selectedFulfillment === 'pickup' ? 'is-selected' : ''}" data-fulfillment-option="pickup">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="badge badge-emerald">Open 7 Days</span>
          <span class="mono" style="font-weight:700">FREE</span>
        </div>
        <div style="font-weight:700;font-size:15px;color:#5C0632;display:flex;align-items:center;gap:6px">
          ${lucideIcon('map-pin', { size: 15 })}
          <span>Kingsgrove Counter Pickup</span>
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">
          3/192A Kingsgrove Rd, NSW 2208
        </p>
      </label>

      <label
        class="method-radio-card ${selectedFulfillment === 'sydney_same_day' ? 'is-selected' : ''} ${!canDeliver ? 'is-disabled' : ''}"
        data-fulfillment-option="${canDeliver ? 'sydney_same_day' : ''}"
      >
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="badge ${canDeliver ? 'badge-amber' : 'badge-slate'}">
            ${canDeliver ? '$150+ Unlocked' : 'Orders $150+'}
          </span>
          <span class="mono" style="font-weight:700">${canDeliver ? 'FREE' : 'Locked'}</span>
        </div>
        <div style="font-weight:700;font-size:15px;color:#5C0632;display:flex;align-items:center;gap:6px">
          ${lucideIcon('truck', { size: 15 })}
          <span>Australia-Wide Delivery</span>
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">
          Same-day dispatch from our Sydney warehouse.
        </p>
      </label>
    `;
  }

  if (addressBlock) {
    addressBlock.style.display = state.isDeliveryUnlocked && selectedFulfillment !== 'pickup' ? 'block' : 'none';
  }
}

function renderOrderSummary(state) {
  const itemsMount = document.getElementById('checkout-summary-items');
  const subtotalEl = document.getElementById('checkout-summary-subtotal');
  const shippingEl = document.getElementById('checkout-summary-shipping');
  const gstEl = document.getElementById('checkout-summary-gst');
  const totalEl = document.getElementById('checkout-summary-total');

  if (itemsMount) {
    itemsMount.innerHTML = state.items
      .map((item) => {
        const imgUrl = normalizeImageUrl(item.image, { sku: item.sku, brand: item.brand });
        const fallbackSvg = buildSchematicPlaceholder(item.sku, item.brand);
        return `
          <div style="display:grid;grid-template-columns:44px 1fr auto;gap:0.65rem;align-items:center;padding-block:0.5rem;border-bottom:1px solid var(--color-slate-100)">
            <img src="${escapeHtml(imgUrl)}" alt="" style="width:44px;height:44px;object-fit:contain;border:1px solid var(--border-subtle);border-radius:4px;padding:3px" onerror="this.src='${fallbackSvg}'" />
            <div style="min-width:0">
              <div class="mono" style="font-size:11px;font-weight:600;color:var(--color-gold-600)">${escapeHtml(item.sku)} × ${item.qty}</div>
              <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title)}</div>
            </div>
            <div class="mono" style="font-weight:700;font-size:13px;color:#5C0632">${formatAud(item.price * item.qty)}</div>
          </div>
        `;
      })
      .join('');
  }

  const grandTotal = state.subtotal + shippingCost;
  const gstAmt = grandTotal / 11;

  if (subtotalEl) subtotalEl.textContent = formatAud(state.subtotal);
  if (shippingEl) {
    shippingEl.textContent =
      selectedFulfillment === 'pickup'
        ? 'FREE (Pickup)'
        : shippingCost === 0
          ? 'FREE'
          : formatAud(shippingCost);
  }
  if (gstEl) gstEl.textContent = formatAud(gstAmt);
  if (totalEl) totalEl.textContent = formatAud(grandTotal);
}

function bindCheckoutEvents() {
  document.getElementById('checkout-fulfillment-methods')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-fulfillment-option]');
    if (!card) return;
    const opt = card.getAttribute('data-fulfillment-option');
    if (!opt) {
      showToast({
        title: '$150 Minimum for Delivery',
        message: 'Orders under $150 are eligible for free Kingsgrove counter pickup.',
        type: 'info',
      });
      return;
    }
    selectedFulfillment = opt;
    document.body.dataset.userChosePickup = opt === 'pickup' ? 'true' : '';
    const state = getCartState();
    renderFulfillmentStep(state);
    renderOrderSummary(state);

    triggerUpdateSteps();
  });

  ['checkout-city', 'checkout-state', 'checkout-zipcode'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      triggerUpdateSteps();
    });
  });

  document.getElementById('checkout-payment-methods')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-payment-option]');
    if (!card) return;
    selectedPayment = card.getAttribute('data-payment-option') || 'card';
    document.querySelectorAll('[data-payment-option]').forEach((c) => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
  });

  document.getElementById('checkout-live-handoff-btn')?.addEventListener('click', () => {
    submitNativeCartHandoff('checkout.checkout');
  });

  const form = document.getElementById('trade-checkout-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = getCartState();
    if (!state.items.length) {
      showToast({ title: 'Cart is Empty', message: 'Add items before placing an order.', type: 'error' });
      return;
    }

    if (selectedPayment === 'live_handoff') {
      submitNativeCartHandoff('checkout.checkout');
      return;
    }

    const firstName = document.getElementById('checkout-firstname')?.value || 'Trade';
    const lastName = document.getElementById('checkout-lastname')?.value || 'Customer';
    const email = document.getElementById('checkout-email')?.value || '';
    const phone = document.getElementById('checkout-phone')?.value || '';
    const company = document.getElementById('checkout-company')?.value || '';

    const orderRef = `SCH-${Math.floor(100000 + Math.random() * 900000)}`;
    const modal = document.getElementById('order-confirmation-modal');
    const modalContent = document.getElementById('order-confirmation-body');

    if (modal && modalContent) {
      modalContent.innerHTML = `
        <div style="text-align:center;padding:1rem 0">
          <div style="width:52px;height:52px;border-radius:50%;background:var(--color-emerald-100);color:var(--color-emerald-700);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem">
            ${lucideIcon('check', { size: 26, strokeWidth: 2.5 })}
          </div>
          <span class="badge badge-emerald mono" style="margin-bottom:8px">ORDER ${orderRef}</span>
          <h2 style="font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:#5C0632;margin-bottom:0.5rem">
            Order Ready
          </h2>
          <p style="font-size:13px;color:var(--text-secondary);max-width:44ch;margin:0 auto 1.25rem">
            Prepared for <strong>${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong> ${company ? `(${escapeHtml(company)})` : ''} • ${escapeHtml(email)} (${escapeHtml(phone)}).
          </p>

          <div style="background:var(--color-slate-50);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:1rem;text-align:left;font-size:13px;margin-bottom:1.25rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="color:var(--text-muted)">Fulfillment:</span>
              <strong>${
                selectedFulfillment === 'pickup'
                  ? 'Kingsgrove Counter Pickup'
                  : 'Australia-Wide Delivery'
              }</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border-subtle)">
              <span style="font-weight:700">Total (AUD Inc. GST):</span>
              <strong class="mono" style="font-size:16px;color:#5C0632">${formatAud(state.subtotal + shippingCost)}</strong>
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" id="modal-handoff-live-btn">
              <span>Complete on Live Checkout</span>
              ${lucideIcon('arrow-up-right', { size: 15 })}
            </button>
            <a href="index.html" class="btn btn-outline">Back to Store</a>
          </div>
        </div>
      `;
      modal.classList.add('is-open');

      document.getElementById('modal-handoff-live-btn')?.addEventListener('click', () => {
        submitNativeCartHandoff('checkout.checkout');
      });
    }
  });
}

async function triggerUpdateSteps() {
  const city = document.getElementById('checkout-city')?.value || 'Sydney';
  const stateCode = document.getElementById('checkout-state')?.value || 'NSW';
  const zip = document.getElementById('checkout-zipcode')?.value || '2208';

  try {
    const form = new URLSearchParams();
    form.set('dispatch', 'checkout.update_steps');
    form.set('update_step', 'step_three');
    form.set('next_step', 'step_four');
    form.set('user_data[s_city]', city);
    form.set('user_data[s_state]', stateCode);
    form.set('user_data[s_zipcode]', zip);
    form.set('user_data[s_country]', 'AU');
    await rawDispatch('checkout.update_steps', { method: 'POST', formData: form });
  } catch {
    // Fallback quietly
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutPage);
} else {
  initCheckoutPage();
}
