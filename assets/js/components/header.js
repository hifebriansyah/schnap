// ==========================================================================
// SCHNAP Electric Products — Global Shell: Utility Bar, Sticky Header,
// 6-Pillar Mega-Menu, Live Search Dropdown, Mini-Cart & Quote Drawers
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { CONFIG } from '../core/config.js';
import {
  fetchSearchCatalog,
  subscribeCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  submitNativeCartHandoff,
  subscribeTelemetry,
} from '../core/dispatch.js';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js';
import { formatAud, escapeHtml } from './productCard.js';
import { showToast } from './notifications.js';
import { lucideIcon, lucideStars, hydrateLucideIcons } from './icons.js';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js';

export function initGlobalShell({ activePillar = '' } = {}) {
  const headerMount = document.getElementById('site-shell-header');
  const footerMount = document.getElementById('site-shell-footer');

  if (headerMount) {
    headerMount.innerHTML = renderHeaderMarkup(activePillar);
  }
  if (footerMount) {
    footerMount.innerHTML = renderFooterMarkup();
  }

  ensureDrawersMounted();
  hydrateLucideIcons(document);
  bindHeaderEvents();
  bindCartDrawerEvents();
  bindTelemetrySubscription();
}

function renderHeaderMarkup(activePillar) {
  const { STORE_FACTS, PILLARS } = CONFIG;

  const pillarsHtml = PILLARS.map((pillar) => {
    const isActive =
      activePillar === pillar.id ||
      activePillar.toLowerCase() === pillar.name.toLowerCase() ||
      activePillar === pillar.slug;

    const sublinksHtml = pillar.subcategories
      .map((sub) => {
        const url = sub.query
          ? `search.html?q=${encodeURIComponent(sub.query)}&cat=${encodeURIComponent(pillar.id)}`
          : `category.html?category_id=${encodeURIComponent(sub.id)}&slug=${encodeURIComponent(sub.slug)}&parent=${encodeURIComponent(pillar.id)}`;
        return `
          <a href="${url}" class="mega-subcat-link">
            <span>${escapeHtml(sub.name)}</span>
            ${lucideIcon('arrow-right', { size: 13 })}
          </a>
        `;
      })
      .join('');

    return `
      <li class="mega-nav-item">
        <a
          href="category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}"
          class="mega-nav-link ${isActive ? 'is-active' : ''}"
          data-prefetch-key="catalog:cat_${pillar.id}"
        >
          <span>${escapeHtml(pillar.name)}</span>
          ${lucideIcon('chevron-down', { size: 14, strokeWidth: 2.2 })}
        </a>
        <div class="mega-panel" role="region" aria-label="${escapeHtml(pillar.name)} subcategories">
          <div class="container mega-panel-inner">
            <div class="mega-panel-intro">
              <div>
                <span class="badge badge-amber" style="margin-bottom:8px">${escapeHtml(pillar.badge)}</span>
                <h3>${escapeHtml(pillar.name)} Range</h3>
                <p>${escapeHtml(pillar.tagline)}</p>
              </div>
              <a
                href="category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}"
                class="btn btn-navy btn-sm"
              >
                <span>Browse All ${escapeHtml(pillar.name)}</span>
                ${lucideIcon('arrow-right', { size: 14 })}
              </a>
            </div>
            <div class="mega-subcat-grid">
              ${sublinksHtml}
            </div>
            <div class="mega-panel-promo">
              <div>
                <span class="badge badge-discount">TRADE DIRECT</span>
                <h4>Project &amp; Bulk Pricing</h4>
                <p>Need full drum quantities, pre-wired distribution boards, or a commercial luminaire schedule?</p>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-open-drawer="quote">
                ${lucideIcon('file-text', { size: 14 })}
                <span>Request Bulk Trade Quote</span>
              </button>
            </div>
          </div>
        </div>
      </li>
    `;
  }).join('');

  return `
    <!-- Top Trade Utility Bar -->
    <div class="trade-utility-bar">
      <div class="container trade-utility-inner">
        <div class="trade-utility-facts">
          <a href="${STORE_FACTS.phoneHref}" class="trade-fact" title="Call SCHNAP Trade Desk">
            ${lucideIcon('phone', { size: 14, strokeWidth: 2.2 })}
            <strong>${escapeHtml(STORE_FACTS.phone)}</strong>
          </a>
          <span class="trade-utility-divider"></span>
          <span class="trade-fact">
            ${lucideIcon('clock', { size: 14, strokeWidth: 2.2 })}
            <span>Kingsgrove Trade Counter: <strong>${escapeHtml(STORE_FACTS.hoursShort)}</strong></span>
          </span>
          <span class="trade-utility-divider"></span>
          <span class="trade-fact trade-fact--emerald">
            ${lucideIcon('truck', { size: 14, strokeWidth: 2.2 })}
            <span><strong>Same-Day Sydney Dispatch</strong> &amp; $150+ Aus-Wide Delivery</span>
          </span>
          <span class="trade-utility-divider"></span>
          <span class="trade-fact">
            ${lucideStars(5, { size: 12 })}
            <strong>${escapeHtml(STORE_FACTS.rating)}</strong>
            <span>(${escapeHtml(STORE_FACTS.reviewCount)})</span>
          </span>
        </div>

        <div class="trade-utility-actions">
          <span
            id="edge-telemetry-indicator"
            class="edge-telemetry-pill"
            title="Live Cloudflare Worker Gateway connected to www.schnap.com.au CS-Cart"
          >
            <span class="edge-telemetry-dot"></span>
            <span id="edge-telemetry-text">CS-CART EDGE: READY</span>
          </span>

          <button type="button" class="utility-action-btn" data-open-drawer="photo">
            ${lucideIcon('camera', { size: 13, strokeWidth: 2.2 })}
            <span>Send Us a Photo</span>
          </button>

          <button type="button" class="utility-action-btn" data-open-drawer="quote">
            ${lucideIcon('file-text', { size: 13, strokeWidth: 2.2 })}
            <span>Bulk Quote</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sticky Main Trade Header -->
    <header class="site-header">
      <div class="container header-main">
        <a href="index.html" class="brand-logo-link" aria-label="SCHNAP Electric Products Home">
          <div class="brand-logo-wrap">
            <img
              src="${escapeHtml(STORE_FACTS.logoUrl)}"
              alt="SCHNAP Electric Products"
              width="136"
              height="34"
            />
          </div>
          <div class="brand-tagline">
            <span class="brand-tagline__title">Trade Direct Wholesale</span>
            <span class="brand-tagline__sub">3/192A Kingsgrove Rd NSW</span>
          </div>
        </a>

        <!-- Instant SKU & Catalog Search Bar -->
        <div class="header-search-wrap" id="header-search-container">
          <form class="header-search-form" action="search.html" method="GET" id="header-search-form">
            <span class="header-search-icon" aria-hidden="true">
              ${lucideIcon('search', { size: 18, strokeWidth: 2.2 })}
            </span>
            <input
              type="search"
              name="q"
              id="header-search-input"
              class="header-search-input"
              placeholder="Search 29,000+ SKUs, part numbers (e.g. LX620G2, LA210, 6mm earth, Clipsal)..."
              autocomplete="off"
              aria-label="Search SKU or electrical product"
            />
            <kbd class="header-search-kbd" title="Press / to search">/</kbd>
            <button type="submit" class="header-search-submit">Search</button>
          </form>

          <!-- Instant Live Search Dropdown -->
          <div class="search-dropdown" id="header-search-dropdown" role="listbox" aria-label="Instant SKU results"></div>
        </div>

        <!-- Right Trade Actions & Mini-Cart Trigger -->
        <div class="header-actions">
          <a href="cart.html" class="header-action-btn" title="Quick Order / BOM Cart">
            ${lucideIcon('list', { size: 17, strokeWidth: 2 })}
            <span>BOM Cart</span>
          </a>

          <button
            type="button"
            class="header-action-btn header-cart-btn"
            data-open-drawer="cart"
            aria-label="Open Trade Cart Drawer"
          >
            ${lucideIcon('shopping-cart', { size: 18, strokeWidth: 2.2 })}
            <span class="cart-badge-count" id="header-cart-count">0</span>
            <span class="cart-badge-subtotal" id="header-cart-subtotal">$0.00</span>
          </button>
        </div>
      </div>

      <!-- 6-Pillar Mega-Menu Bar -->
      <nav class="mega-nav-bar" aria-label="Primary Trade Categories">
        <div class="container mega-nav-inner">
          <ul class="mega-nav-list">
            <li>
              <a href="index.html" class="mega-nav-link ${activePillar === 'home' ? 'is-active' : ''}">
                ${lucideIcon('home', { size: 14, strokeWidth: 2.2 })}
                <span>Trade Home</span>
              </a>
            </li>
            ${pillarsHtml}
            <li>
              <a href="brands.html" class="mega-nav-link ${activePillar === 'brands' ? 'is-active' : ''}">
                ${lucideIcon('award', { size: 14, strokeWidth: 2.2 })}
                <span>Brands</span>
              </a>
            </li>
          </ul>

          <div class="mega-nav-right">
            <span class="delivery-rule-chip" id="nav-delivery-chip">
              ${lucideIcon('shield-check', { size: 14 })}
              <span>Free 7-Day Kingsgrove Pickup • $150+ Aus-Wide Delivery</span>
            </span>
          </div>
        </div>
      </nav>
    </header>
  `;
}

function renderFooterMarkup() {
  const { STORE_FACTS, PILLARS } = CONFIG;
  return `
    <footer class="site-footer">
      <div class="container footer-top">
        <div class="footer-col">
          <div class="brand-logo-wrap" style="width:fit-content;margin-bottom:1rem">
            <img src="${escapeHtml(STORE_FACTS.logoUrl)}" alt="SCHNAP Electric Products" width="136" height="34" />
          </div>
          <p style="font-size:13px;line-height:1.6;color:var(--text-on-dark-muted)">
            Australia’s fastest-growing trade electrical wholesaler. Supplying licensed electricians, solar installers, and industrial switchboard builders with upfront trade pricing 7 days a week.
          </p>
          <div class="footer-counter-card">
            <strong>
              ${lucideIcon('map-pin', { size: 14 })}
              <span>Kingsgrove Trade Counter &amp; Warehouse</span>
            </strong>
            <div>${escapeHtml(STORE_FACTS.address)}</div>
            <div style="color:#FF7A80;margin-top:4px;font-weight:600">${escapeHtml(STORE_FACTS.hoursShort)}</div>
            <div style="margin-top:4px">Phone: <a href="${STORE_FACTS.phoneHref}" style="color:#fff;font-weight:700">${escapeHtml(STORE_FACTS.phone)}</a></div>
          </div>
        </div>

        <div class="footer-col">
          <h4>6-Pillar Trade Catalog</h4>
          <ul class="footer-links">
            ${PILLARS.map(
              (p) =>
                `<li><a href="category.html?category_id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}">${lucideIcon('chevron-right', { size: 13 })}<span>${escapeHtml(p.name)} (${escapeHtml(p.badge)})</span></a></li>`
            ).join('')}
            <li><a href="brands.html">${lucideIcon('award', { size: 13 })}<span>Authorized Brands Directory (200+)</span></a></li>
            <li><a href="search.html?q=rcbo">${lucideIcon('zap', { size: 13 })}<span>6kA Type A RCBOs &amp; Protection</span></a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Trade Services &amp; Fulfillment</h4>
          <ul class="footer-links">
            <li><a href="cart.html">${lucideIcon('shopping-cart', { size: 13 })}<span>Trade Cart &amp; Quick SKU Entry</span></a></li>
            <li><a href="checkout.html">${lucideIcon('check-circle-2', { size: 13 })}<span>Streamlined 3-Step Trade Checkout</span></a></li>
            <li><a href="#quote" data-open-drawer="quote">${lucideIcon('file-text', { size: 13 })}<span>Request Bulk Project Quote</span></a></li>
            <li><a href="#photo" data-open-drawer="photo">${lucideIcon('camera', { size: 13 })}<span>Send Us a Photo (Part ID Desk)</span></a></li>
            <li><a href="https://www.schnap.com.au/payment-and-shipping/" target="_blank" rel="noopener">${lucideIcon('truck', { size: 13 })}<span>$150 Delivery &amp; Kingsgrove Pickup Policy</span>${lucideIcon('arrow-up-right', { size: 12 })}</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Zero-Access Edge Architecture</h4>
          <p style="font-size:12px;line-height:1.55;color:var(--text-on-dark-muted);margin-bottom:0.75rem">
            Decoupled static B2B frontend powered by live CS-Cart controller dispatches (<code class="mono" style="color:#FF7A80">index.php?dispatch=...</code>) via Cloudflare Edge Gateway (<code class="mono">ap-southeast-2</code>) and CloudFront CDN media hotlinking.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            <span class="badge badge-emerald" style="width:fit-content">${lucideIcon('shield-check', { size: 12 })}<span>AS/NZS 3000 Compliant Range</span></span>
            <span class="badge badge-amber" style="width:fit-content">${lucideIcon('check', { size: 12 })}<span>Zero Server Modification Required</span></span>
          </div>
        </div>
      </div>

      <div class="container footer-bottom">
        <div>© 2008 – ${new Date().getFullYear()} SCHNAP Electric Products Pty Ltd (ABN 80 099 079 848). All prices in AUD inc. GST.</div>
        <div style="display:flex;gap:1.25rem;align-items:center">
          <a href="https://www.schnap.com.au/brands" target="_blank" rel="noopener" style="color:#FF7A80;font-weight:600;display:inline-flex;align-items:center;gap:4px">
            <span>Live SCHNAP Brands</span>
            ${lucideIcon('arrow-up-right', { size: 13 })}
          </a>
          <a href="https://www.schnap.com.au/" target="_blank" rel="noopener" style="color:#FFFFFF;font-weight:600;display:inline-flex;align-items:center;gap:4px">
            <span>Live Production Store (www.schnap.com.au)</span>
            ${lucideIcon('arrow-up-right', { size: 13 })}
          </a>
        </div>
      </div>
    </footer>
  `;
}

function ensureDrawersMounted() {
  if (document.getElementById('global-drawers-root')) return;
  const root = document.createElement('div');
  root.id = 'global-drawers-root';
  root.innerHTML = `
    <div class="drawer-backdrop" id="global-drawer-backdrop"></div>

    <!-- 1. Slide-Over Mini-Cart Drawer -->
    <aside class="slide-drawer" id="drawer-cart" aria-label="Trade Mini-Cart">
      <div class="drawer-header">
        <div class="drawer-title">
          ${lucideIcon('shopping-cart', { size: 20, strokeWidth: 2.2 })}
          <span>Trade Order Cart</span>
          <span class="badge badge-amber mono" id="drawer-cart-badge">0 items</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Cart Drawer">
          ${lucideIcon('x', { size: 18 })}
        </button>
      </div>

      <!-- Dynamic $150 Delivery Eligibility Progress Bar -->
      <div class="delivery-threshold-box" id="drawer-delivery-box">
        <div class="delivery-threshold-text" id="drawer-delivery-text"></div>
        <div class="delivery-progress-track">
          <div class="delivery-progress-fill" id="drawer-delivery-bar" style="width:0%"></div>
        </div>
      </div>

      <div class="drawer-body" id="drawer-cart-items"></div>

      <div class="drawer-footer">
        <div class="mini-cart-summary-row">
          <span style="color:var(--text-muted)">Trade Discount Savings</span>
          <span class="mono" style="color:var(--color-emerald-600);font-weight:700" id="drawer-cart-savings">-$0.00</span>
        </div>
        <div class="mini-cart-summary-row">
          <span style="color:var(--text-muted)">Fulfillment Status</span>
          <span id="drawer-cart-fulfillment" style="font-weight:700;font-size:12px">Kingsgrove Pickup</span>
        </div>
        <div class="mini-cart-summary-row is-total">
          <span>Trade Subtotal (Inc. GST)</span>
          <span class="mono" id="drawer-cart-subtotal">$0.00</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
          <a href="cart.html" class="btn btn-outline">View Full Cart</a>
          <a href="checkout.html" class="btn btn-primary">
            <span>Trade Checkout</span>
            ${lucideIcon('arrow-right', { size: 15 })}
          </a>
        </div>
        <button
          type="button"
          class="btn btn-navy btn-sm"
          id="drawer-live-handoff-btn"
          title="Submits native HTML POST form to transfer items directly to www.schnap.com.au"
        >
          ${lucideIcon('zap', { size: 14 })}
          <span>Push Cart to Live SCHNAP.com.au</span>
        </button>
      </div>
    </aside>

    <!-- 2. Request Bulk Quote Drawer -->
    <aside class="slide-drawer" id="drawer-quote" aria-label="Request Bulk Trade Quote">
      <div class="drawer-header">
        <div class="drawer-title">
          <span class="badge badge-amber">TRADE DESK</span>
          <span>Request Bulk / Project Quote</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Quote Drawer">
          ${lucideIcon('x', { size: 18 })}
        </button>
      </div>
      <div class="drawer-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:1rem">
          Pricing a multi-dwelling project, commercial switchboard, or solar rollout? Submit your BOM or send directly to our Kingsgrove Trade Desk on WhatsApp for priority turnaround.
        </p>
        <form id="bulk-quote-form" style="display:flex;flex-direction:column;gap:0.85rem">
          <div class="form-field">
            <label class="form-label">Your Name / Contracting Company *</label>
            <input type="text" class="form-input" id="quote-name" placeholder="e.g. Apex Electrical Contracting" required />
          </div>
          <div class="form-field">
            <label class="form-label">ABN or Electrical Licence #</label>
            <input type="text" class="form-input mono" id="quote-abn" placeholder="e.g. ABN 52 123 456 789 / Lic 294810C" />
          </div>
          <div class="form-field">
            <label class="form-label">Mobile / Trade Contact *</label>
            <input type="tel" class="form-input mono" id="quote-phone" placeholder="0400 000 000" required />
          </div>
          <div class="form-field">
            <label class="form-label">SKUs, Quantities &amp; Project Notes *</label>
            <textarea
              class="form-input mono"
              id="quote-items"
              rows="5"
              placeholder="e.g. 50x LX620G2 (20A 6kA RCBO)&#10;10x F3015BLACK (100m 1.5mm 3C Flex)&#10;24x AURORA220-SQ-HDALI"
              required
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            <span>Send Quote Request via WhatsApp &amp; Trade Desk</span>
            ${lucideIcon('arrow-right', { size: 16 })}
          </button>
        </form>
      </div>
    </aside>

    <!-- 3. Send Us a Photo (Part Identification) Drawer -->
    <aside class="slide-drawer" id="drawer-photo" aria-label="Send Us a Photo Part Identification">
      <div class="drawer-header">
        <div class="drawer-title">
          <span class="badge badge-emerald">PART ID DESK</span>
          <span>Send Us a Photo</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Photo Drawer">
          ${lucideIcon('x', { size: 18 })}
        </button>
      </div>
      <div class="drawer-body" style="display:flex;flex-direction:column;gap:1rem">
        <div style="background:var(--color-red-50);border:1px solid var(--color-red-200);border-radius:var(--radius-lg);padding:1rem;font-size:13px">
          <strong style="color:#5D1C25">On-site with an obsolete breaker, contactor, or fitting?</strong>
          <p style="margin-top:4px;color:var(--text-secondary)">
            Snap a photo of the nameplate or switchboard DIN rail. Our Kingsgrove trade counter engineers will identify the exact drop-in replacement within minutes.
          </p>
        </div>

        <label
          for="photo-upload-input"
          style="border:2px dashed var(--color-slate-300);border-radius:var(--radius-lg);padding:2rem 1rem;text-align:center;cursor:pointer;background:var(--color-slate-50)"
        >
          <div style="font-weight:700;color:#5D1C25;margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px">
            ${lucideIcon('camera', { size: 18 })}
            <span>Drop Switchboard / Nameplate Photo Here</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted)" id="photo-file-label">Supports JPG, PNG, HEIC from phone camera</div>
          <input type="file" id="photo-upload-input" accept="image/*" style="display:none" />
        </label>

        <div class="form-field">
          <label class="form-label">Part Markings / Ratings Visible (Optional)</label>
          <input type="text" class="form-input mono" id="photo-notes" placeholder="e.g. Old Federal 20A breaker or 3-phase contactor coil 240V" />
        </div>

        <a
          href="https://wa.me/61291507744?text=Hi%20SCHNAP%20Trade%20Desk%2C%20I%20need%20help%20identifying%20an%20electrical%20part%20from%20site%3A"
          target="_blank"
          rel="noopener"
          class="btn btn-emerald btn-lg"
          id="photo-whatsapp-link"
        >
          ${lucideIcon('message-circle', { size: 17 })}
          <span>Open WhatsApp Trade Identification Desk</span>
          ${lucideIcon('arrow-up-right', { size: 15 })}
        </a>
      </div>
    </aside>
  `;
  document.body.appendChild(root);
}

export function openDrawer(name, { prefillQuote = '' } = {}) {
  const backdrop = document.getElementById('global-drawer-backdrop');
  document.querySelectorAll('.slide-drawer').forEach((d) => d.classList.remove('is-open'));
  const target = document.getElementById(`drawer-${name}`);
  if (target && backdrop) {
    backdrop.classList.add('is-open');
    target.classList.add('is-open');
    if (name === 'quote' && prefillQuote) {
      const textarea = document.getElementById('quote-items');
      if (textarea) textarea.value = prefillQuote;
    }
  }
}

export function closeAllDrawers() {
  document.getElementById('global-drawer-backdrop')?.classList.remove('is-open');
  document.querySelectorAll('.slide-drawer').forEach((d) => d.classList.remove('is-open'));
}

function bindHeaderEvents() {
  // Open/Close Drawer triggers
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-drawer]');
    if (openBtn) {
      e.preventDefault();
      const drawerName = openBtn.getAttribute('data-open-drawer');
      const prefill = openBtn.getAttribute('data-quote-prefill') || '';
      openDrawer(drawerName, { prefillQuote: prefill });
      return;
    }

    if (e.target.closest('[data-close-drawer]') || e.target.id === 'global-drawer-backdrop') {
      closeAllDrawers();
    }
  });

  // Keyboard shortcut '/' to focus search input
  const searchInput = document.getElementById('header-search-input');
  const searchDropdown = document.getElementById('header-search-dropdown');

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput?.focus();
    } else if (e.key === 'Escape') {
      searchDropdown?.classList.remove('is-open');
      closeAllDrawers();
    }
  });

  // Debounced Instant Live Search Dropdown (dispatch=products.search)
  if (searchInput && searchDropdown) {
    let searchTimer = null;

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim();
      clearTimeout(searchTimer);
      if (q.length < 2) {
        searchDropdown.classList.remove('is-open');
        return;
      }

      searchTimer = setTimeout(async () => {
        const qLower = q.toLowerCase();
        const localHits = SEED_PRODUCTS.filter(
          (p) =>
            p.sku.toLowerCase().includes(qLower) ||
            p.title.toLowerCase().includes(qLower) ||
            p.brand.toLowerCase().includes(qLower)
        ).slice(0, 5);

        renderSearchDropdown(searchDropdown, q, localHits, { isSyncing: true });

        try {
          const remote = await fetchSearchCatalog({ query: q, page: 1 });
          const combined = remote.products?.length ? remote.products.slice(0, 6) : localHits;
          renderSearchDropdown(searchDropdown, q, combined, {
            isSyncing: false,
            totalCount: remote.totalCount || combined.length,
          });
        } catch {
          renderSearchDropdown(searchDropdown, q, localHits, { isSyncing: false, totalCount: localHits.length });
        }
      }, 220);
    });

    // Click outside closes search dropdown
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#header-search-container')) {
        searchDropdown.classList.remove('is-open');
      }
    });

    // Quick + Add inside search dropdown
    searchDropdown.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-search-add]');
      if (addBtn) {
        e.preventDefault();
        const rawJson = addBtn.getAttribute('data-product-json');
        if (rawJson) {
          try {
            const prod = JSON.parse(rawJson);
            addToCart(prod, 1);
            showToast({
              title: `Added 1× ${prod.sku}`,
              message: `${prod.title} added to Trade Cart`,
              type: 'success',
            });
          } catch {
            // ignore
          }
        }
      }
    });
  }

  // Bulk Quote Form submission
  const quoteForm = document.getElementById('bulk-quote-form');
  quoteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('quote-name')?.value || '';
    const abn = document.getElementById('quote-abn')?.value || '';
    const phone = document.getElementById('quote-phone')?.value || '';
    const items = document.getElementById('quote-items')?.value || '';
    const msg = `Hi SCHNAP Trade Desk, Bulk Quote Request from ${name} (${abn || phone}):\n${items}`;
    window.open(`https://wa.me/61291507744?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    showToast({
      title: 'Bulk Quote Logged',
      message: 'Opening SCHNAP Kingsgrove Trade Desk on WhatsApp...',
      type: 'success',
    });
    closeAllDrawers();
  });

  // Photo Upload preview
  const photoInput = document.getElementById('photo-upload-input');
  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    const label = document.getElementById('photo-file-label');
    if (file && label) {
      label.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB) — Ready to send`;
      label.style.color = 'var(--color-emerald-600)';
      label.style.fontWeight = '700';
    }
  });
}

function renderSearchDropdown(dropdownEl, query, products, { isSyncing = false, totalCount = 0 } = {}) {
  if (!products || products.length === 0) {
    dropdownEl.innerHTML = `
      <div class="search-dropdown-header">
        <span>Searching CS-Cart for "${escapeHtml(query)}"...</span>
      </div>
      <div style="padding:1.25rem;text-align:center;color:var(--text-muted);font-size:13px">
        Press Enter to run full deep catalog search across 29,000+ SKUs.
      </div>
    `;
    dropdownEl.classList.add('is-open');
    return;
  }

  const rows = products
    .map((p) => {
      const imgUrl = normalizeImageUrl(p.image, { sku: p.sku, brand: p.brand });
      const fallbackSvg = buildSchematicPlaceholder(p.sku, p.brand);
      const safeJson = escapeHtml(
        JSON.stringify({
          id: p.id,
          sku: p.sku,
          title: p.title,
          brand: p.brand,
          price: p.price,
          listPrice: p.listPrice,
          image: imgUrl,
        })
      );

      return `
        <div class="search-dropdown-item">
          <a href="product.html?id=${encodeURIComponent(p.id)}">
            <img src="${escapeHtml(imgUrl)}" alt="" class="search-dropdown-thumb" onerror="this.src='${fallbackSvg}'" />
          </a>
          <div class="search-dropdown-meta">
            <div class="search-dropdown-sku">${escapeHtml(p.sku)} • ${escapeHtml(p.brand || 'SCHNAP')}</div>
            <a href="product.html?id=${encodeURIComponent(p.id)}" class="search-dropdown-title">${escapeHtml(p.title)}</a>
          </div>
          <div class="search-dropdown-right">
            <div class="search-dropdown-price">${formatAud(p.price)}</div>
            <button type="button" class="btn btn-primary btn-sm" data-search-add data-product-json="${safeJson}">
              ${lucideIcon('plus', { size: 12, strokeWidth: 2.5 })}
              <span>Add</span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  dropdownEl.innerHTML = `
    <div class="search-dropdown-header">
      <span>Instant Trade Matches for "${escapeHtml(query)}"</span>
      <span class="mono">${isSyncing ? 'Syncing live CS-Cart...' : `${totalCount || products.length} matches`}</span>
    </div>
    <div>${rows}</div>
    <div class="search-dropdown-footer">
      <a href="search.html?q=${encodeURIComponent(query)}" class="btn btn-navy btn-sm" style="width:100%">
        <span>View All ${totalCount || ''} Results for "${escapeHtml(query)}"</span>
        ${lucideIcon('arrow-right', { size: 14 })}
      </a>
    </div>
  `;
  dropdownEl.classList.add('is-open');
}

function bindCartDrawerEvents() {
  const itemsContainer = document.getElementById('drawer-cart-items');

  itemsContainer?.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-drawer-qty]');
    if (stepBtn) {
      const id = stepBtn.getAttribute('data-id');
      const nextQty = parseInt(stepBtn.getAttribute('data-drawer-qty'), 10);
      updateCartQty(id, nextQty);
      return;
    }

    const rmBtn = e.target.closest('[data-drawer-remove]');
    if (rmBtn) {
      const id = rmBtn.getAttribute('data-drawer-remove');
      removeFromCart(id);
    }
  });

  const handoffBtn = document.getElementById('drawer-live-handoff-btn');
  handoffBtn?.addEventListener('click', () => {
    const ok = submitNativeCartHandoff('checkout.cart');
    if (ok) {
      showToast({
        title: 'Live CS-Cart Handoff Triggered',
        message: 'Posting cart items directly to www.schnap.com.au in a new tab...',
        type: 'success',
      });
    }
  });

  subscribeCart((state) => {
    const countEl = document.getElementById('header-cart-count');
    const subEl = document.getElementById('header-cart-subtotal');
    const drawerBadge = document.getElementById('drawer-cart-badge');
    const navChip = document.getElementById('nav-delivery-chip');

    if (countEl) countEl.textContent = String(state.itemCount);
    if (subEl) subEl.textContent = formatAud(state.subtotal);
    if (drawerBadge) drawerBadge.textContent = `${state.itemCount} ${state.itemCount === 1 ? 'unit' : 'units'}`;

    if (navChip) {
      navChip.innerHTML = state.isDeliveryUnlocked
        ? `${lucideIcon('check-circle-2', { size: 14 })}<span>$150+ Australia-Wide Delivery Unlocked (${formatAud(state.subtotal)})</span>`
        : `${lucideIcon('truck', { size: 14 })}<span>Add ${formatAud(state.remainingForDelivery)} for Aus-Wide Delivery • Free Kingsgrove Pickup</span>`;
    }

    // Update $150 Delivery Threshold Progress Bar in Drawer
    const delivBox = document.getElementById('drawer-delivery-box');
    const delivText = document.getElementById('drawer-delivery-text');
    const delivBar = document.getElementById('drawer-delivery-bar');

    if (delivBox && delivText && delivBar) {
      delivBox.classList.toggle('is-unlocked', state.isDeliveryUnlocked);
      delivBar.style.width = `${state.progressPct}%`;
      delivText.innerHTML = state.isDeliveryUnlocked
        ? `<span style="display:inline-flex;align-items:center;gap:4px">${lucideIcon('check-circle-2', { size: 14 })}<strong>Australia-Wide Delivery &amp; Same-Day Sydney Dispatch Unlocked!</strong></span><span class="mono">${formatAud(state.subtotal)} / $150</span>`
        : `<span>Add <strong>${formatAud(state.remainingForDelivery)}</strong> more for Australia-wide delivery, or collect <strong>FREE from Kingsgrove</strong></span><span class="mono">${state.progressPct}%</span>`;
    }

    // Update Drawer Line Items
    if (itemsContainer) {
      if (state.items.length === 0) {
        itemsContainer.innerHTML = `
          <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
            <div style="font-size:15px;font-weight:700;color:#5D1C25;margin-bottom:6px">Your Trade Cart is Empty</div>
            <p style="font-size:12px;margin-bottom:1.25rem">Browse our 6-pillar electrical catalog or search by SKU above.</p>
            <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-primary btn-sm">Browse Trade Catalog</a>
          </div>
        `;
      } else {
        itemsContainer.innerHTML = state.items
          .map((item) => {
            const imgUrl = normalizeImageUrl(item.image, { sku: item.sku, brand: item.brand });
            const fallbackSvg = buildSchematicPlaceholder(item.sku, item.brand);
            return `
              <div class="mini-cart-item">
                <a href="product.html?id=${encodeURIComponent(item.id)}">
                  <img src="${escapeHtml(imgUrl)}" alt="" class="mini-cart-thumb" onerror="this.src='${fallbackSvg}'" />
                </a>
                <div class="mini-cart-info">
                  <div class="mini-cart-sku">${escapeHtml(item.sku)}</div>
                  <a href="product.html?id=${encodeURIComponent(item.id)}" class="mini-cart-title">${escapeHtml(item.title)}</a>
                  <div class="mini-cart-controls">
                    <div class="qty-stepper" style="height:28px">
                      <button type="button" class="qty-stepper__btn" style="width:24px" data-id="${escapeHtml(item.id)}" data-drawer-qty="${item.qty - 1}">
                        ${lucideIcon('minus', { size: 11, strokeWidth: 2.5 })}
                      </button>
                      <input type="text" class="qty-stepper__input" style="width:32px;font-size:11px" value="${item.qty}" readonly />
                      <button type="button" class="qty-stepper__btn" style="width:24px" data-id="${escapeHtml(item.id)}" data-drawer-qty="${item.qty + 1}">
                        ${lucideIcon('plus', { size: 11, strokeWidth: 2.5 })}
                      </button>
                    </div>
                    <span class="mono" style="font-size:11px;color:var(--text-muted)">@ ${formatAud(item.price)}</span>
                  </div>
                </div>
                <div class="mini-cart-price-col">
                  <span class="mini-cart-line-total">${formatAud(item.price * item.qty)}</span>
                  <button type="button" class="mini-cart-remove" data-drawer-remove="${escapeHtml(item.id)}">
                    ${lucideIcon('trash-2', { size: 12 })}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // Update Drawer Summary Totals
    const savEl = document.getElementById('drawer-cart-savings');
    const fulEl = document.getElementById('drawer-cart-fulfillment');
    const totEl = document.getElementById('drawer-cart-subtotal');

    if (savEl) savEl.textContent = `-${formatAud(state.tradeSavings)}`;
    if (fulEl) {
      fulEl.innerHTML = state.isDeliveryUnlocked
        ? `<span style="color:var(--color-emerald-600);display:inline-flex;align-items:center;gap:4px">${lucideIcon('check', { size: 13 })}<span>Aus-Wide Delivery / Kingsgrove Pickup</span></span>`
        : `<span style="color:#5D1C25">Free Kingsgrove 7-Day Pickup</span>`;
    }
    if (totEl) totEl.textContent = formatAud(state.subtotal);
  });
}

function bindTelemetrySubscription() {
  subscribeTelemetry((t) => {
    const pill = document.getElementById('edge-telemetry-indicator');
    const text = document.getElementById('edge-telemetry-text');
    if (!pill || !text) return;

    pill.classList.toggle('is-seed', t.mode !== 'live-edge');
    if (t.mode === 'live-edge') {
      const latencyStr = t.latencyMs > 0 ? ` • ${t.latencyMs}ms` : '';
      text.textContent = `EDGE GATEWAY: ${t.cacheStatus}${latencyStr}`;
    } else {
      text.textContent = `HYBRID SEED CACHE: ACTIVE`;
    }
  });
}
