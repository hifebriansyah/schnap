// ==========================================================================
// SCHNAP Electric Products — Global Shell: Utility Bar, Sticky Header,
// 3-Level Mega-Menu, Live Search Dropdown, Mini-Cart & Quote Drawers
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { CONFIG } from '../core/config.js?v=afde963';
import {
  fetchSearchCatalog,
  subscribeCart,
  addToCart,
  updateCartQty,
  removeFromCart,
} from '../core/dispatch.js?v=afde963';
import { normalizeImageUrl, buildSchematicPlaceholder } from '../core/media.js?v=afde963';
import { formatAud, escapeHtml } from './productCard.js?v=afde963';
import { showToast } from './notifications.js?v=afde963';
import { lucideIcon, lucideStars, hydrateLucideIcons } from './icons.js?v=afde963';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js?v=afde963';

// 3-Level Menu Groups (Level 1 Pillar -> Level 2 Category Group -> Level 3 Links)
const PILLAR_GROUPS_MAP = {
  '4255': [
    {
      name: 'Power Cables',
      slug: 'power-cables.html',
      id: '4266',
      items: [
        { name: 'Building Wire', id: '4267', slug: 'building-wire.html' },
        { name: 'Twin & Earth Cable', id: '4268', slug: 'twin-and-earth-cable.html' },
        { name: 'Orange Circular Cable', id: '4269', slug: 'orange-circular-cable.html' },
        { name: 'Flexible Cable', id: '4271', slug: 'flexible-cable.html' },
      ],
    },
    {
      name: 'Data & Comms',
      slug: 'data-and-comms-cable.html',
      id: '4270',
      items: [
        { name: 'Cat6 & Cat6A Cable', query: 'Cat6A' },
        { name: 'Patch Leads & Panels', query: 'patch lead' },
        { name: 'Fibre Optic Cabling', query: 'fibre' },
        { name: 'Data Cabinets & Racks', query: 'cabinet' },
      ],
    },
    {
      name: 'Specialty & Solar',
      slug: 'solar-cable.html',
      id: '4272',
      items: [
        { name: 'Solar DC Cable', id: '4272', slug: 'solar-cable.html' },
        { name: 'Control & Security Cable', query: 'security cable' },
        { name: 'Low Voltage Garden Cable', query: 'garden cable' },
      ],
    },
    {
      name: 'Conduit & Terminations',
      slug: 'conduit-and-ducts.html',
      id: '4274',
      items: [
        { name: 'Rigid & Corrugated Conduit', id: '4274', slug: 'conduit-and-ducts.html' },
        { name: 'Copper & Aluminium Lugs', id: '4273', slug: 'cable-accessories.html' },
        { name: 'Cable Tray & Ties', query: 'cable tray' },
      ],
    },
  ],
  '4257': [
    {
      name: 'Circuit Protection',
      slug: 'electrical.html',
      id: '4277',
      items: [
        { name: '1P & 2P RCBOs (6kA)', query: 'rcbo' },
        { name: 'Circuit Breakers (MCB)', query: 'breaker' },
        { name: 'Main Switches & Isolators', query: 'main switch' },
        { name: 'RCDs & Surge Protection', query: 'RCD' },
      ],
    },
    {
      name: 'Switches & Outlets',
      slug: 'powerpoints.html',
      id: '4275',
      items: [
        { name: 'Internal Powerpoints', id: '4275', slug: 'powerpoints.html' },
        { name: 'Weatherproof Outlets', query: 'weatherproof' },
        { name: 'Switches & Mechanisms', id: '4276', slug: 'switches-and-mechs.html' },
        { name: 'Cover Plates & Grids', id: '4279', slug: 'cover-plates-and-grid-plates.html' },
      ],
    },
    {
      name: 'Switchboards & Metering',
      slug: 'electrical.html',
      id: '4282',
      items: [
        { name: 'Loadcentres & Enclosures', query: 'enclosure' },
        { name: 'Busbars & Links', query: 'busbar' },
        { name: 'Earthing Stakes & Clips', query: 'earth' },
        { name: 'kWh Meters & Timers', query: 'timer' },
      ],
    },
    {
      name: 'Alarms & Accessories',
      slug: 'mounting-accessories.html',
      id: '4280',
      items: [
        { name: '230V Smoke & Heat Alarms', id: '4281', slug: 'sensors-bells-and-chimes.html', query: 'alarm' },
        { name: 'Mounting Blocks & Wall Boxes', id: '4280', slug: 'mounting-accessories.html' },
        { name: 'Plugs, Leads & Adaptors', id: '4278', slug: 'plugs-sockets-and-adaptors.html' },
      ],
    },
  ],
  '4258': [
    {
      name: 'Indoor Lighting',
      slug: 'indoor-lighting.html',
      id: '4284',
      items: [
        { name: 'IC-4 Tri-Colour Downlights', id: '4284', slug: 'indoor-lighting.html' },
        { name: 'DALI-2 Commercial Downlights', query: 'DALI' },
        { name: 'LED Panels & Troffers', query: 'panel' },
        { name: 'LED Strip & Profiles', query: 'strip' },
      ],
    },
    {
      name: 'Commercial & Outdoor',
      slug: 'commercial-and-industrial.html',
      id: '4285',
      items: [
        { name: 'LED Battens', id: '4288', slug: 'commercial-and-industrial.html', query: 'batten' },
        { name: 'Industrial Highbays', query: 'highbay' },
        { name: 'Floodlights & Bunkers', id: '4286', slug: 'outdoor-and-landscape.html' },
      ],
    },
    {
      name: 'Emergency & Lamps',
      slug: 'exit-and-emergency.html',
      id: '4287',
      items: [
        { name: 'LED Exit Signs', id: '4287', slug: 'exit-and-emergency.html' },
        { name: 'Emergency Spitfires', query: 'spitfire' },
        { name: 'Lamps & Globes', id: '4289', slug: 'lamps-and-globes.html' },
        { name: 'LED Drivers', id: '4291', slug: 'lighting-accessories.html' },
      ],
    },
    {
      name: 'Fans & Ventilation',
      slug: 'ceiling-fan-lights-and-fittings.html',
      id: '4290',
      items: [
        { name: 'Ceiling Sweep Fans', id: '4290', slug: 'ceiling-fan-lights-and-fittings.html' },
        { name: 'Exhaust Fans & 3-in-1', query: 'exhaust' },
        { name: 'Ducting & Fittings', query: 'duct' },
      ],
    },
  ],
  '4261': [
    {
      name: 'Solar & Battery',
      slug: 'inverters.html',
      id: '4293',
      items: [
        { name: 'Solar & Hybrid Inverters', id: '4293', slug: 'inverters.html' },
        { name: 'Battery Storage (BESS)', id: '4294', slug: 'battery-storage.html' },
        { name: 'Solar Panels', id: '4295', slug: 'solar-panels.html' },
        { name: 'Solar Racking & BOS', id: '4296', slug: 'solar-racking.html' },
      ],
    },
    {
      name: 'EV & Power Protection',
      slug: 'ev-chargers-and-accessories.html',
      id: '4292',
      items: [
        { name: 'EV Chargers & Leads', id: '4292', slug: 'ev-chargers-and-accessories.html' },
        { name: 'Network Protection Boards', id: '4299', slug: 'network-protection-boards.html' },
        { name: 'MC4 & Isolators', id: '4297', slug: 'solar-bos-and-accessories.html' },
      ],
    },
    {
      name: 'Security & Surveillance',
      slug: 'solar-panels.html',
      id: '4298',
      items: [
        { name: 'AJAX 5MP PoE Cameras', query: 'ajax' },
        { name: 'NVRs & Kits', query: 'NVR' },
        { name: 'Intercoms & Access Control', query: 'intercom' },
      ],
    },
    {
      name: 'Smart Automation',
      slug: 'solar-panels.html',
      id: '4261',
      items: [
        { name: 'C-Bus Automation', query: 'C-Bus' },
        { name: 'Smart Switches & Hubs', query: 'smart' },
        { name: 'WiFi Access Points', query: 'WiFi' },
      ],
    },
  ],
  '4263': [
    {
      name: 'Plugs, Sockets & Isolators',
      slug: 'industrial-plugs-and-sockets.html',
      id: '4300',
      items: [
        { name: '3-Phase Plugs & Sockets', id: '4300', slug: 'industrial-plugs-and-sockets.html' },
        { name: 'Industrial Switchgear', id: '4301', slug: 'industrial-switchgear.html' },
        { name: 'Weatherproof Isolators', query: 'isolator' },
      ],
    },
    {
      name: 'Switching & Safety',
      slug: 'switching-and-control.html',
      id: '4303',
      items: [
        { name: 'Emergency Stop Buttons', id: '4304', slug: 'lights-bells-and-beacons.html', query: 'emergency stop' },
        { name: 'Pushbuttons & Selectors', id: '4303', slug: 'switching-and-control.html' },
        { name: 'Beacons & Pilot Lights', id: '4304', slug: 'lights-bells-and-beacons.html' },
      ],
    },
    {
      name: 'Motors & PLC Control',
      slug: 'motors-and-motor-control.html',
      id: '4302',
      items: [
        { name: 'Contactors & Starters', id: '4302', slug: 'motors-and-motor-control.html' },
        { name: 'PLCs & Automation', id: '4305', slug: 'automation-and-control.html' },
        { name: 'Industrial Power Supplies', query: 'power supply' },
      ],
    },
    {
      name: 'Enclosures & Climate',
      slug: 'industrial-accessories.html',
      id: '4306',
      items: [
        { name: 'IP66 Mounting Enclosures', id: '4306', slug: 'industrial-accessories.html' },
        { name: 'Enclosure Climate Control', id: '4307', slug: 'climate-control.html' },
      ],
    },
  ],
  '4264': [
    {
      name: '1000V Hand Tools',
      slug: 'tools-hand-tools.html',
      id: '4472',
      items: [
        { name: 'Insulated Pliers & Cutters', id: '4473', slug: 'hand-tools-pliers.html' },
        { name: '1000V VDE Screwdrivers', query: 'screwdriver' },
        { name: 'Multigrips & Strippers', query: 'pliers' },
      ],
    },
    {
      name: 'Meters & Test Gear',
      slug: 'meters-and-testers.html',
      id: '4474',
      items: [
        { name: 'Multimeters & Clamp Meters', id: '4474', slug: 'meters-and-testers.html' },
        { name: 'Insulation & RCD Testers', query: 'tester' },
      ],
    },
    {
      name: 'Drilling & Site Lighting',
      slug: 'power-tool-accessories.html',
      id: '4475',
      items: [
        { name: 'Drill Bits & Hole Saws', id: '4475', slug: 'power-tool-accessories.html' },
        { name: 'Heat & Soldering', id: '4476', slug: 'heat-and-soldering.html' },
        { name: 'Work Lights & Storage', id: '4477', slug: 'work-and-safety-lights.html' },
      ],
    },
    {
      name: 'Fixings & Consumables',
      slug: 'fixings-and-hardware.html',
      id: '4479',
      items: [
        { name: 'Silicone, Sealants & Adhesives', id: '4479', slug: 'fixings-and-hardware.html', query: 'silicone' },
        { name: 'Electrical Tape & Fasteners', query: 'tape' },
      ],
    },
  ],
};

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
}

function buildItemHref(item, pillarId) {
  if (item.query) {
    return `search.html?q=${encodeURIComponent(item.query)}&cat=${encodeURIComponent(pillarId)}`;
  }
  return `category.html?category_id=${encodeURIComponent(item.id || pillarId)}&slug=${encodeURIComponent(item.slug || '')}&parent=${encodeURIComponent(pillarId)}`;
}

function renderHeaderMarkup(activePillar) {
  const { STORE_FACTS, PILLARS } = CONFIG;
  const isHome = activePillar === 'home';

  const pillarsHtml = PILLARS.map((pillar) => {
    const isActive =
      activePillar === pillar.id ||
      activePillar.toLowerCase() === pillar.name.toLowerCase() ||
      activePillar === pillar.slug;

    const groups = pillar.groups || PILLAR_GROUPS_MAP[pillar.id] || [];

    const treeHtml = groups
      .map((group) => {
        const groupUrl = buildItemHref(group, pillar.id);
        const leavesHtml = (group.items || [])
          .map(
            (leaf) => `
              <li>
                <a href="${buildItemHref(leaf, pillar.id)}" class="mega-leaf-link">
                  <span>${escapeHtml(leaf.name)}</span>
                </a>
              </li>
            `
          )
          .join('');

        return `
          <div class="mega-group">
            <a href="${groupUrl}" class="mega-group-title">
              <span>${escapeHtml(group.name)}</span>
              ${lucideIcon('chevron-right', { size: 13 })}
            </a>
            <ul class="mega-group-list">
              ${leavesHtml}
            </ul>
          </div>
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
          ${lucideIcon('chevron-down', { size: 13, strokeWidth: 2 })}
        </a>
        <div class="mega-panel" role="region" aria-label="${escapeHtml(pillar.name)} menu">
          <div class="container mega-panel-inner">
            <div class="mega-panel-intro">
              <div>
                <span class="badge badge-amber" style="margin-bottom:8px">${escapeHtml(pillar.badge)}</span>
                <h3>${escapeHtml(pillar.name)}</h3>
                <p>${escapeHtml(pillar.tagline)}</p>
              </div>
              <a
                href="category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}"
                class="btn btn-primary btn-sm"
              >
                <span>View All ${escapeHtml(pillar.name)}</span>
                ${lucideIcon('arrow-right', { size: 14 })}
              </a>
            </div>
            <div class="mega-tree-grid">
              ${treeHtml}
            </div>
          </div>
        </div>
      </li>
    `;
  }).join('');

  return `
    <!-- Top Utility Bar -->
    <div class="trade-utility-bar">
      <div class="container trade-utility-inner">
        <div class="trade-utility-facts">
          <a href="${STORE_FACTS.phoneHref}" class="trade-fact">
            ${lucideIcon('phone', { size: 13, strokeWidth: 2 })}
            <strong>${escapeHtml(STORE_FACTS.phone)}</strong>
          </a>
          <span class="trade-utility-divider"></span>
          <span class="trade-fact">
            ${lucideIcon('map-pin', { size: 13, strokeWidth: 2 })}
            <span>Kingsgrove NSW — <strong>Open 7 Days</strong></span>
          </span>
          <span class="trade-utility-divider"></span>
          <span class="trade-fact">
            ${lucideIcon('truck', { size: 13, strokeWidth: 2 })}
            <span>Free Delivery on Orders <strong>$150+</strong></span>
          </span>
        </div>

        <div class="trade-utility-actions">
          <button type="button" class="utility-action-btn" data-open-drawer="photo">
            ${lucideIcon('camera', { size: 13, strokeWidth: 2 })}
            <span>Photo ID</span>
          </button>

          <button type="button" class="utility-action-btn" data-open-drawer="quote">
            ${lucideIcon('file-text', { size: 13, strokeWidth: 2 })}
            <span>Bulk Quote</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Sticky Header & Navigation Bar -->
    <header class="site-header ${isHome ? 'site-header--home' : ''}">
      <nav class="mega-nav-bar" aria-label="Primary Navigation">
        <div class="container mega-nav-inner">
          <div class="mega-nav-left">
            <a href="index.html" class="brand-logo-link" aria-label="SCHNAP Electric Products Home">
              <div class="brand-logo-wrap">
                <img
                  src="${escapeHtml(STORE_FACTS.logoUrl)}"
                  alt="SCHNAP Electric Products"
                  width="132"
                  height="30"
                />
              </div>
            </a>

            <ul class="mega-nav-list">
              ${pillarsHtml}
              <li>
                <a href="brands.html" class="mega-nav-link ${activePillar === 'brands' ? 'is-active' : ''}">
                  <span>Brands</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="mega-nav-right">
            ${
              isHome
                ? ''
                : `
            <!-- Search Bar -->
            <div class="header-search-wrap" id="header-search-container">
              <form class="header-search-form" action="search.html" method="GET" id="header-search-form">
                <span class="header-search-icon" aria-hidden="true">
                  ${lucideIcon('search', { size: 16, strokeWidth: 2 })}
                </span>
                <input
                  type="search"
                  name="q"
                  id="header-search-input"
                  class="header-search-input"
                  placeholder="Search products, part numbers, or brands..."
                  autocomplete="off"
                  aria-label="Search products"
                />
                <button type="submit" class="header-search-submit sr-only">Search</button>
              </form>

              <div class="search-dropdown" id="header-search-dropdown" role="listbox" aria-label="Search suggestions"></div>
            </div>
            `
            }

            <button
              type="button"
              class="header-action-btn header-cart-btn"
              data-open-drawer="cart"
              aria-label="Open Cart Drawer"
            >
              ${lucideIcon('shopping-cart', { size: 16, strokeWidth: 2 })}
              <span class="cart-badge-count" id="header-cart-count">0</span>
              <span class="cart-badge-subtotal" id="header-cart-subtotal">$0.00</span>
            </button>
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
            <img src="${escapeHtml(STORE_FACTS.logoUrl)}" alt="SCHNAP Electric Products" width="132" height="32" />
          </div>
          <p style="font-size:13px;line-height:1.65;color:var(--text-on-dark-muted);max-width:36ch">
            Sydney-based electrical wholesaler supplying licensed electricians, contractors, and commercial projects across Australia since 2008.
          </p>
        </div>

        <div class="footer-col">
          <h4>Departments</h4>
          <ul class="footer-links">
            ${PILLARS.map(
              (p) =>
                `<li><a href="category.html?category_id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}"><span>${escapeHtml(p.name)}</span></a></li>`
            ).join('')}
            <li><a href="brands.html"><span>All Brands (A–Z)</span></a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Trade Services</h4>
          <ul class="footer-links">
            <li><a href="cart.html"><span>Order Cart &amp; Quick SKU Entry</span></a></li>
            <li><a href="checkout.html"><span>Trade Checkout</span></a></li>
            <li><a href="#quote" data-open-drawer="quote"><span>Request Bulk Quote</span></a></li>
            <li><a href="#photo" data-open-drawer="photo"><span>Photo Part Identification</span></a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Kingsgrove Branch</h4>
          <div style="font-size:13px;line-height:1.65;color:var(--text-on-dark-muted);display:flex;flex-direction:column;gap:0.4rem">
            <div>3/192A Kingsgrove Rd, Kingsgrove NSW 2208</div>
            <div>Mon–Fri 6:30am–5pm • Sat–Sun 8am–2pm</div>
            <div><a href="${STORE_FACTS.phoneHref}" style="color:var(--color-gold-400);font-weight:600">${escapeHtml(STORE_FACTS.phone)}</a></div>
            <div>${escapeHtml(STORE_FACTS.email)}</div>
          </div>
        </div>
      </div>

      <div class="container footer-bottom">
        <div>© 2008 – ${new Date().getFullYear()} SCHNAP Electric Products Pty Ltd. All prices in AUD inc. GST.</div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          ${lucideStars(5, { size: 12 })}
          <span>4.8 Rating from 1,100+ Google Reviews</span>
        </div>
      </div>
    </footer>
  `;
}

function ensureDrawersMounted() {
  if (document.getElementById('global-drawers-root')) return;
  const { STORE_FACTS } = CONFIG;
  const root = document.createElement('div');
  root.id = 'global-drawers-root';
  root.innerHTML = `
    <div class="drawer-backdrop" id="global-drawer-backdrop"></div>

    <!-- 1. Slide-Over Mini-Cart Drawer -->
    <aside class="slide-drawer" id="drawer-cart" aria-label="Trade Cart">
      <div class="drawer-header">
        <div class="drawer-title">
          ${lucideIcon('shopping-cart', { size: 18, strokeWidth: 2 })}
          <span>Your Cart</span>
          <span class="badge badge-amber mono" id="drawer-cart-badge">0</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Cart">
          ${lucideIcon('x', { size: 17 })}
        </button>
      </div>

      <div class="delivery-threshold-box" id="drawer-delivery-box">
        <div class="delivery-threshold-text" id="drawer-delivery-text"></div>
        <div class="delivery-progress-track">
          <div class="delivery-progress-fill" id="drawer-delivery-bar" style="width:0%"></div>
        </div>
      </div>

      <div class="drawer-body" id="drawer-cart-items"></div>

      <div class="drawer-footer">
        <div class="mini-cart-summary-row">
          <span style="color:var(--text-muted)">Trade Savings</span>
          <span class="mono" style="color:var(--color-emerald-600);font-weight:600" id="drawer-cart-savings">-$0.00</span>
        </div>
        <div class="mini-cart-summary-row is-total">
          <span>Subtotal (Inc. GST)</span>
          <span class="mono" id="drawer-cart-subtotal">$0.00</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem">
          <a href="cart.html" class="btn btn-outline">View Cart</a>
          <a href="checkout.html" class="btn btn-primary">
            <span>Checkout</span>
            ${lucideIcon('arrow-right', { size: 15 })}
          </a>
        </div>
      </div>
    </aside>

    <!-- 2. Request Bulk Quote Drawer -->
    <aside class="slide-drawer" id="drawer-quote" aria-label="Request Bulk Quote">
      <div class="drawer-header">
        <div class="drawer-title">
          ${lucideIcon('file-text', { size: 18 })}
          <span>Request Bulk Quote</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Quote Drawer">
          ${lucideIcon('x', { size: 17 })}
        </button>
      </div>
      <div class="drawer-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:1.25rem">
          Send your project list for quantity pricing. Our team will respond quickly via WhatsApp or phone.
        </p>
        <form id="bulk-quote-form" style="display:flex;flex-direction:column;gap:0.9rem">
          <div class="form-field">
            <label class="form-label">Name or Company *</label>
            <input type="text" class="form-input" id="quote-name" placeholder="Apex Electrical" required />
          </div>
          <div class="form-field">
            <label class="form-label">Mobile Number *</label>
            <input type="tel" class="form-input mono" id="quote-phone" placeholder="0400 000 000" required />
          </div>
          <div class="form-field">
            <label class="form-label">Part Numbers &amp; Quantities *</label>
            <textarea
              class="form-input mono"
              id="quote-items"
              rows="5"
              placeholder="50x LX620G2&#10;10x F3015BLACK"
              required
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            <span>Send Quote Request</span>
            ${lucideIcon('arrow-right', { size: 16 })}
          </button>
        </form>
      </div>
    </aside>

    <!-- 3. Send Us a Photo Drawer -->
    <aside class="slide-drawer" id="drawer-photo" aria-label="Photo Identification">
      <div class="drawer-header">
        <div class="drawer-title">
          ${lucideIcon('camera', { size: 18 })}
          <span>Photo Part Identification</span>
        </div>
        <button type="button" class="drawer-close-btn" data-close-drawer aria-label="Close Photo Drawer">
          ${lucideIcon('x', { size: 17 })}
        </button>
      </div>
      <div class="drawer-body" style="display:flex;flex-direction:column;gap:1.1rem">
        <p style="font-size:13px;color:var(--text-secondary)">
          Not sure what a part is? Upload a clear photo of the product, label, or model number and our trade counter will identify it for you.
        </p>

        <label
          for="photo-upload-input"
          style="border:1.5px dashed var(--color-slate-300);border-radius:var(--radius-lg);padding:2rem 1rem;text-align:center;cursor:pointer;background:var(--color-slate-50)"
        >
          <div style="font-weight:600;color:#5C0632;margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px">
            ${lucideIcon('camera', { size: 18 })}
            <span>Select Product Photo</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted)" id="photo-file-label">JPG, PNG or HEIC</div>
          <input type="file" id="photo-upload-input" accept="image/*" style="display:none" />
        </label>

        <div class="form-field">
          <label class="form-label">Notes (Optional)</label>
          <input type="text" class="form-input" id="photo-notes" placeholder="Visible markings or ratings..." />
        </div>

        <a
          href="${escapeHtml(STORE_FACTS.whatsappHref)}"
          target="_blank"
          rel="noopener"
          class="btn btn-primary btn-lg"
          id="photo-whatsapp-link"
        >
          ${lucideIcon('message-circle', { size: 17 })}
          <span>Send Photo on WhatsApp</span>
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

  const searchInput = document.getElementById('header-search-input');
  const searchDropdown = document.getElementById('header-search-dropdown');

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      const targetInput = searchInput || document.getElementById('home-search-bridge-input');
      targetInput?.focus();
    } else if (e.key === 'Escape') {
      searchDropdown?.classList.remove('is-open');
      closeAllDrawers();
    }
  });

  // Seamless Mega-Menu Hover Intent (eliminates accidental dismissal when moving mouse to subnav)
  document.querySelectorAll('.mega-nav-item').forEach((item) => {
    let closeTimer = null;
    const openMenu = () => {
      clearTimeout(closeTimer);
      document.querySelectorAll('.mega-nav-item').forEach((other) => {
        if (other !== item) other.classList.remove('is-open');
      });
      item.classList.add('is-open');
    };
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        item.classList.remove('is-open');
      }, 240); // 240ms grace period for smooth cursor transit to subnav
    };

    item.addEventListener('mouseenter', openMenu);
    item.addEventListener('mouseleave', scheduleClose);

    const panel = item.querySelector('.mega-panel');
    if (panel) {
      panel.addEventListener('mouseenter', openMenu);
      panel.addEventListener('mouseleave', scheduleClose);
    }
  });

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

        renderSearchDropdown(searchDropdown, q, localHits);

        try {
          const remote = await fetchSearchCatalog({ query: q, page: 1 });
          const combined = remote.products?.length ? remote.products.slice(0, 6) : localHits;
          renderSearchDropdown(searchDropdown, q, combined, {
            totalCount: remote.totalCount || combined.length,
          });
        } catch {
          renderSearchDropdown(searchDropdown, q, localHits, { totalCount: localHits.length });
        }
      }, 220);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#header-search-container')) {
        searchDropdown.classList.remove('is-open');
      }
    });

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
              title: `Added ${prod.sku}`,
              message: prod.title,
              type: 'success',
            });
          } catch {
            // ignore
          }
        }
      }
    });
  }

  const quoteForm = document.getElementById('bulk-quote-form');
  quoteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('quote-name')?.value || '';
    const phone = document.getElementById('quote-phone')?.value || '';
    const items = document.getElementById('quote-items')?.value || '';
    const msg = `Hi SCHNAP Trade Desk, Bulk Quote Request from ${name} (${phone}):\n${items}`;
    window.open(`${CONFIG.STORE_FACTS.whatsappHref}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    closeAllDrawers();
  });

  const photoInput = document.getElementById('photo-upload-input');
  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    const label = document.getElementById('photo-file-label');
    if (file && label) {
      label.textContent = `${file.name} selected`;
      label.style.color = 'var(--color-emerald-600)';
      label.style.fontWeight = '600';
    }
  });
}

function renderSearchDropdown(dropdownEl, query, products, { totalCount = 0 } = {}) {
  if (!products || products.length === 0) {
    dropdownEl.innerHTML = `
      <div style="padding:1.25rem;text-align:center;color:var(--text-muted);font-size:13px">
        Press Enter to search all products for "${escapeHtml(query)}".
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
      <span>Matches for "${escapeHtml(query)}"</span>
      <span class="mono">${totalCount || products.length} results</span>
    </div>
    <div>${rows}</div>
    <div class="search-dropdown-footer">
      <a href="search.html?q=${encodeURIComponent(query)}" class="btn btn-outline btn-sm" style="width:100%">
        <span>View All Results</span>
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

  subscribeCart((state) => {
    const countEl = document.getElementById('header-cart-count');
    const subEl = document.getElementById('header-cart-subtotal');
    const drawerBadge = document.getElementById('drawer-cart-badge');

    if (countEl) countEl.textContent = String(state.itemCount);
    if (subEl) subEl.textContent = formatAud(state.subtotal);
    if (drawerBadge) drawerBadge.textContent = `${state.itemCount}`;

    const delivBox = document.getElementById('drawer-delivery-box');
    const delivText = document.getElementById('drawer-delivery-text');
    const delivBar = document.getElementById('drawer-delivery-bar');

    if (delivBox && delivText && delivBar) {
      delivBox.classList.toggle('is-unlocked', state.isDeliveryUnlocked);
      delivBar.style.width = `${state.progressPct}%`;
      delivText.innerHTML = state.isDeliveryUnlocked
        ? `<span style="display:inline-flex;align-items:center;gap:4px">${lucideIcon('check-circle-2', { size: 14 })}<strong>Australia-Wide Delivery Unlocked</strong></span><span class="mono">${formatAud(state.subtotal)}</span>`
        : `<span>Add <strong>${formatAud(state.remainingForDelivery)}</strong> for delivery, or collect free at Kingsgrove</span><span class="mono">${state.progressPct}%</span>`;
    }

    if (itemsContainer) {
      if (state.items.length === 0) {
        itemsContainer.innerHTML = `
          <div style="text-align:center;padding:3rem 1rem;color:var(--text-muted)">
            <div style="font-size:15px;font-weight:700;color:#5C0632;margin-bottom:6px">Your Cart is Empty</div>
            <p style="font-size:12px;margin-bottom:1.25rem">Explore our electrical range or search by part number above.</p>
            <a href="category.html?category_id=4257&slug=electrical.html" class="btn btn-primary btn-sm">Browse Catalog</a>
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
                  </button>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    const savEl = document.getElementById('drawer-cart-savings');
    const totEl = document.getElementById('drawer-cart-subtotal');

    if (savEl) savEl.textContent = `-${formatAud(state.tradeSavings)}`;
    if (totEl) totEl.textContent = formatAud(state.subtotal);
  });
}
