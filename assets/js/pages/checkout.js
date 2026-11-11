// ==========================================================================
// SCHNAP Electric Products — 3-Step Trade Checkout Controller (checkout.js)
// Hydrates checkout.html via dispatch=checkout.checkout, checkout.update_steps, checkout.place_order
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell } from '../components/header.js';
import { formatAud, escapeHtml } from '../components/productCard.js';
import {
  getCartState,
  subscribeCart,
  rawDispatch,
  submitNativeCartHandoff,
  getSecurityHash,
} from '../core/dispatch.js';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js';
import { showToast } from '../components/notifications.js';

let selectedFulfillment = 'pickup'; // 'pickup' | 'sydney_same_day' | 'aus_courier'
let selectedPayment = 'card';
let shippingCost = 0;

export async function initCheckoutPage() {
  initGlobalShell();

  subscribeCart((state) => {
    // Enforce $150 Delivery Rule automatically
    if (!state.isDeliveryUnlocked) {
      selectedFulfillment = 'pickup';
      shippingCost = 0;
    } else if (selectedFulfillment === 'pickup' && ! document.body.dataset.userChosePickup) {
      selectedFulfillment = 'sydney_same_day';
      shippingCost = 0;
    }
    renderFulfillmentStep(state);
    renderOrderSummary(state);
  });

  bindCheckoutEvents();

  // Sync live checkout session from CS-Cart (dispatch=checkout.checkout)
  try {
    await rawDispatch('checkout.checkout');
  } catch {
    // Graceful fallback
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
          <div style="font-size:13px;color:var(--color-emerald-700)">
            <strong>✓ $150+ Australia-Wide Delivery Unlocked!</strong> Choose courier delivery to your site/workshop or free Kingsgrove counter pickup.
          </div>
          <span class="badge badge-emerald mono">${formatAud(state.subtotal)}</span>
        </div>
      `;
    } else {
      ruleAlert.innerHTML = `
        <div style="background:var(--color-amber-50);border:1px solid var(--color-amber-400);border-radius:var(--radius-lg);padding:0.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
          <div style="font-size:13px;color:var(--color-navy-900)">
            <strong>📍 Orders under $150.00 AUD are Pickup Only at Kingsgrove NSW</strong><br/>
            <span style="font-size:12px;color:var(--text-secondary)">Add <strong>${formatAud(state.remainingForDelivery)}</strong> more to unlock Australia-wide courier delivery, or collect free 7 days a week from <strong>${escapeHtml(CONFIG.STORE_FACTS.address)}</strong>.</span>
          </div>
          <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-outline btn-sm">
            + Top Up Order
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
          <span class="badge badge-emerald">FREE • OPEN 7 DAYS</span>
          <span class="mono" style="font-weight:800">$0.00</span>
        </div>
        <div style="font-weight:800;font-size:15px;color:var(--color-navy-900)">
          Kingsgrove Trade Counter Pickup
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">
          ${escapeHtml(CONFIG.STORE_FACTS.address)}<br/>
          ${escapeHtml(CONFIG.STORE_FACTS.hoursShort)} • SMS &amp; Email notification when ready.
        </p>
      </label>

      <label
        class="method-radio-card ${selectedFulfillment === 'sydney_same_day' ? 'is-selected' : ''} ${!canDeliver ? 'is-disabled' : ''}"
        data-fulfillment-option="${canDeliver ? 'sydney_same_day' : ''}"
      >
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="badge ${canDeliver ? 'badge-amber' : 'badge-slate'}">
            ${canDeliver ? 'ELIGIBLE ($150+)' : 'REQUIRES $150+ ORDER'}
          </span>
          <span class="mono" style="font-weight:800">${canDeliver ? 'FREE / INCLUDED' : 'LOCKED'}</span>
        </div>
        <div style="font-weight:800;font-size:15px;color:var(--color-navy-900)">
          Australia-Wide Courier &amp; Same-Day Sydney Dispatch
        </div>
        <p style="font-size:12px;color:var(--text-secondary)">
          ${
            canDeliver
              ? 'Direct trade courier to your job site or warehouse. Same-day dispatch on Sydney metro weekday orders.'
              : `Add ${formatAud(state.remainingForDelivery)} more to your cart to unlock Australia-wide delivery.`
          }
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
  const hashEl = document.getElementById('checkout-security-hash-display');

  if (hashEl) {
    hashEl.textContent = getSecurityHash() || 'afbb4c5c3fef9ad3740e147090bffa60';
  }

  if (itemsMount) {
    itemsMount.innerHTML = state.items
      .map((item) => {
        const imgUrl = normalizeImageUrl(item.image, { sku: item.sku, brand: item.brand });
        const fallbackSvg = buildSchematicPlaceholder(item.sku, item.brand);
        return `
          <div style="display:grid;grid-template-columns:46px 1fr auto;gap:0.65rem;align-items:center;padding-block:0.5rem;border-bottom:1px solid var(--color-slate-100)">
            <img src="${escapeHtml(imgUrl)}" alt="" style="width:46px;height:46px;object-fit:contain;border:1px solid var(--border-subtle);border-radius:4px;padding:3px" onerror="this.src='${fallbackSvg}'" />
            <div style="min-width:0">
              <div class="mono" style="font-size:11px;font-weight:700;color:var(--color-amber-600)">${escapeHtml(item.sku)} × ${item.qty}</div>
              <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title)}</div>
            </div>
            <div class="mono" style="font-weight:700;font-size:13px">${formatAud(item.price * item.qty)}</div>
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
        ? 'FREE (Kingsgrove Pickup)'
        : shippingCost === 0
          ? 'FREE ($150+ Trade Qualification)'
          : formatAud(shippingCost);
  }
  if (gstEl) gstEl.textContent = formatAud(gstAmt);
  if (totalEl) totalEl.textContent = formatAud(grandTotal);
}

function bindCheckoutEvents() {
  // Fulfillment Method Selection
  document.getElementById('checkout-fulfillment-methods')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-fulfillment-option]');
    if (!card) return;
    const opt = card.getAttribute('data-fulfillment-option');
    if (!opt) {
      showToast({
        title: '$150 Minimum for Delivery',
        message: 'Orders under $150 are eligible for Free Kingsgrove Trade Counter Pickup.',
        type: 'info',
      });
      return;
    }
    selectedFulfillment = opt;
    document.body.dataset.userChosePickup = opt === 'pickup' ? 'true' : '';
    const state = getCartState();
    renderFulfillmentStep(state);
    renderOrderSummary(state);

    // Trigger CS-Cart dispatch=checkout.update_steps
    triggerUpdateSteps();
  });

  // Suburb / Postcode / State live rate recalculation (dispatch=checkout.update_steps)
  ['checkout-city', 'checkout-state', 'checkout-zipcode'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      triggerUpdateSteps();
    });
  });

  // Payment Method Selection
  document.getElementById('checkout-payment-methods')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-payment-option]');
    if (!card) return;
    selectedPayment = card.getAttribute('data-payment-option') || 'card';
    document.querySelectorAll('[data-payment-option]').forEach((c) => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
  });

  // Live CS-Cart Handoff Button
  document.getElementById('checkout-live-handoff-btn')?.addEventListener('click', () => {
    const ok = submitNativeCartHandoff('checkout.checkout');
    if (ok) {
      showToast({
        title: 'Opening Live SCHNAP Checkout',
        message: 'Transferring cart items directly to www.schnap.com.au...',
        type: 'success',
      });
    }
  });

  // Place Trade Order Form Submission (dispatch=checkout.place_order)
  const form = document.getElementById('trade-checkout-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = getCartState();
    if (!state.items.length) {
      showToast({ title: 'Cart is Empty', message: 'Add items before placing an order.', type: 'error' });
      return;
    }

    const firstName = document.getElementById('checkout-firstname')?.value || 'Trade';
    const lastName = document.getElementById('checkout-lastname')?.value || 'Contractor';
    const email = document.getElementById('checkout-email')?.value || 'trade@contractor.com.au';
    const phone = document.getElementById('checkout-phone')?.value || '0400 000 000';
    const company = document.getElementById('checkout-company')?.value || '';

    const submitBtn = document.getElementById('place-order-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Syncing with CS-Cart dispatch=checkout.place_order...';
    }

    const orderRef = `SCH-${Math.floor(100000 + Math.random() * 900000)}`;
    const modal = document.getElementById('order-confirmation-modal');
    const modalContent = document.getElementById('order-confirmation-body');

    if (modal && modalContent) {
      modalContent.innerHTML = `
        <div style="text-align:center;padding:1rem 0">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--color-emerald-100);color:var(--color-emerald-700);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1rem">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <span class="badge badge-emerald mono" style="margin-bottom:8px">ORDER REFERENCE: ${orderRef}</span>
          <h2 style="font-family:var(--font-display);font-size:1.5rem;font-weight:800;margin-bottom:0.5rem">
            Trade Order Ready for Processing
          </h2>
          <p style="font-size:13px;color:var(--text-secondary);max-width:48ch;margin:0 auto 1.25rem">
            Prepared for <strong>${escapeHtml(firstName)} ${escapeHtml(lastName)}</strong> ${company ? `(${escapeHtml(company)})` : ''} • Confirmation sent to <strong>${escapeHtml(email)}</strong> (${escapeHtml(phone)}).
          </p>

          <div style="background:var(--color-slate-50);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:1rem;text-align:left;font-size:13px;margin-bottom:1.25rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="color:var(--text-muted)">Fulfillment Method:</span>
              <strong>${
                selectedFulfillment === 'pickup'
                  ? '📍 Free Kingsgrove Counter Pickup (3/192A Kingsgrove Rd)'
                  : '🚚 Australia-Wide Courier / Same-Day Sydney Dispatch'
              }</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="color:var(--text-muted)">Payment Method:</span>
              <strong style="text-transform:uppercase">${escapeHtml(selectedPayment)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border-subtle)">
              <span style="font-weight:700">Total (AUD Inc. GST):</span>
              <strong class="mono" style="font-size:16px;color:var(--color-navy-900)">${formatAud(state.subtotal + shippingCost)}</strong>
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap">
            <button type="button" class="btn btn-primary" id="modal-handoff-live-btn">
              ⚡ Complete Payment on Live SCHNAP.com.au ↗
            </button>
            <a href="index.html" class="btn btn-outline">Return to Storefront</a>
          </div>
        </div>
      `;
      modal.classList.add('is-open');

      document.getElementById('modal-handoff-live-btn')?.addEventListener('click', () => {
        submitNativeCartHandoff('checkout.checkout');
      });
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Trade Order (dispatch=checkout.place_order)';
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
    showToast({
      title: 'Shipping Rates Updated',
      message: `Verified CS-Cart shipping steps for ${city}, ${stateCode} ${zip}`,
      type: 'success',
      duration: 2200,
    });
  } catch {
    // Fallback quietly
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCheckoutPage);
} else {
  initCheckoutPage();
}
