// ==========================================================================
// SCHNAP Electric Products — Brands Directory Page Controller (brands.js)
// Hydrates brands.html modeled on https://www.schnap.com.au/brands
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell } from '../components/header.js';
import { escapeHtml } from '../components/productCard.js';
import { lucideIcon, hydrateLucideIcons } from '../components/icons.js';
import { fetchBrandsCatalog } from '../core/dispatch.js';

const BRAND_VALUE_PROPS = [
  {
    icon: 'badge-dollar-sign',
    title: 'Transparent Pricing',
    description: 'Clear, upfront trade pricing on every product across 200+ electrical brands without lock-in account hurdles.',
  },
  {
    icon: 'package-check',
    title: 'Streamlined Ordering',
    description: "Find and order from Australia's largest electrical range in seconds by part number, brand, or technical rating.",
  },
  {
    icon: 'truck',
    title: 'Australia-Wide Delivery',
    description: 'Same-day dispatch from Sydney. Electrical supplies delivered Australia-wide on orders over $150, or free 7-day Kingsgrove pickup.',
  },
  {
    icon: 'handshake',
    title: 'End-to-End Support',
    description: 'Order tracking from checkout to doorstep, instant WhatsApp photo identification, plus a trade team on the phone 7 days.',
  },
];

const BRAND_INDUSTRIES = [
  { name: 'Residential', icon: 'home', query: 'downlight', subtitle: 'Iconic GPOs, IC-4 LEDs & Smoke Alarms' },
  { name: 'Trade', icon: 'hard-hat', query: 'rcbo', subtitle: '6kA Type A RCBOs, Drums & 1000V Tools' },
  { name: 'Commercial', icon: 'building-2', query: 'DALI', subtitle: 'DALI-2 Panels, Loadcentres & Cat6A' },
  { name: 'Government', icon: 'landmark', query: 'Hager', subtitle: 'AS/NZS Compliant Infrastructure Supply' },
  { name: 'Medical', icon: 'heart-pulse', query: 'Legrand', subtitle: 'Excel Life Medical & Antimicrobial Gear' },
  { name: 'Education', icon: 'graduation-cap', query: 'exit', subtitle: 'Emergency Lighting, Battens & Data' },
  { name: 'Aviation', icon: 'plane', query: 'AJAX', subtitle: 'NDAA Security, Enclosures & Controls' },
  { name: 'Mining', icon: 'pickaxe', query: 'industrial', subtitle: 'IP66 Isolators, E-Stops & Heavy Cable' },
];

const BRAND_PAGE_FAQS = [
  {
    q: 'Who is SCHNAP?',
    a: 'SCHNAP is a Sydney-based electrical wholesaler in Kingsgrove, supplying licensed electricians, contractors and engineers since 2008. We run a trade counter open seven days and an online store with Australia-wide delivery, with products from basic electrical components to industrial electrical equipment.',
  },
  {
    q: 'What does SCHNAP stock?',
    a: "We stock Australia's largest electrical range for licensed electricians. Key categories include LED lighting, designer switches, commercial switchboards, circuit protection, security systems and CCTV, and smart home automation.",
  },
  {
    q: 'How do ordering and delivery work?',
    a: "Order online or at our Kingsgrove trade counter, and your order is dispatched same-day from our Sydney warehouse. Same-day delivery is available across Sydney on eligible orders. Delivery Australia-wide is available on orders over $150; under $150, collect free from Kingsgrove, open 7 days. Returns are accepted within 100 days of purchase, and everything comes with the manufacturer's warranty. Our trade team helps you find the right product for residential, commercial and industrial jobs.",
  },
  {
    q: 'Which brands does SCHNAP carry?',
    a: 'We carry 200+ leading brands such as Hager, Clipsal, Legrand, ABB, AJAX, LANX, Haneco, Connected Switchgear, Domus Lighting, Matelec, Cabac, and NHP across lighting, switchgear, cables, CCTV, smoke alarms and data. Product pages show the part number, specifications, approvals and application details where available.',
  },
];

const state = {
  allBrands: [...CONFIG.BRANDS],
  searchQuery: '',
  selectedCategory: 'all',
  selectedLetter: 'ALL',
};

export async function initBrandsPage() {
  initGlobalShell({ activePillar: 'brands' });

  const params = new URLSearchParams(window.location.search);
  if (params.get('q')) {
    state.searchQuery = params.get('q').trim();
    const input = document.getElementById('brands-filter-input');
    if (input) input.value = state.searchQuery;
  }
  if (params.get('cat')) {
    state.selectedCategory = params.get('cat');
  }
  if (params.get('letter')) {
    state.selectedLetter = params.get('letter').toUpperCase();
  }

  renderStaticSections();
  renderAllBrandViews();
  bindBrandsEvents();
  hydrateLucideIcons(document);

  // Hydrate with live CS-Cart /cscart/brands endpoint
  try {
    const liveData = await fetchBrandsCatalog({
      onRevalidate: (fresh) => {
        if (fresh?.brands?.length) {
          state.allBrands = fresh.brands;
          renderAllBrandViews();
        }
      },
    });
    if (liveData?.brands?.length) {
      state.allBrands = liveData.brands;
      renderAllBrandViews();
    }
  } catch {
    // Seed brands remain displayed
  }
}

function getFilteredBrands() {
  const q = state.searchQuery.toLowerCase();
  return state.allBrands
    .filter((b) => {
      if (state.selectedCategory !== 'all' && b.category !== state.selectedCategory) {
        return false;
      }
      if (state.selectedLetter !== 'ALL') {
        const firstChar = (b.name || '').charAt(0).toUpperCase();
        if (firstChar !== state.selectedLetter) return false;
      }
      if (q) {
        const hay = `${b.name} ${b.specialty || ''} ${b.description || ''} ${b.category || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderBrandLogoOrMonogram(brand, boxClass = 'brand-logo-box') {
  const initials = brand.name
    .split(/[\s-]+/)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (brand.logo) {
    return `
      <div class="${boxClass}">
        <img
          src="${escapeHtml(brand.logo)}"
          alt="${escapeHtml(brand.name)} logo"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"
        />
        <span class="brand-monogram" style="display:none">${escapeHtml(initials)}</span>
      </div>
    `;
  }

  return `
    <div class="${boxClass}">
      <span class="brand-monogram">${escapeHtml(initials)}</span>
    </div>
  `;
}

function renderAllBrandViews() {
  renderAlphabetBar();
  renderFlagshipSpotlight();
  renderAzDirectory();
}

function renderAlphabetBar() {
  const bar = document.getElementById('brands-alphabet-bar');
  if (!bar) return;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(
    state.allBrands
      .filter((b) => state.selectedCategory === 'all' || b.category === state.selectedCategory)
      .map((b) => (b.name || '').charAt(0).toUpperCase())
  );

  const allBtn = `
    <button
      type="button"
      class="alpha-btn ${state.selectedLetter === 'ALL' ? 'is-active' : ''}"
      data-alpha="ALL"
    >
      All (${state.allBrands.length})
    </button>
  `;

  const letterBtns = letters
    .map((letter) => {
      const hasBrands = availableLetters.has(letter);
      const isActive = state.selectedLetter === letter;
      return `
        <button
          type="button"
          class="alpha-btn ${isActive ? 'is-active' : ''}"
          data-alpha="${letter}"
          ${!hasBrands ? 'disabled' : ''}
        >
          ${letter}
        </button>
      `;
    })
    .join('');

  bar.innerHTML = allBtn + letterBtns;
}

function renderFlagshipSpotlight() {
  const section = document.getElementById('brands-spotlight-section');
  const mount = document.getElementById('brands-spotlight-mount');
  if (!mount || !section) return;

  // Hide flagship spotlight when user is actively filtering by letter or typing a search query
  if (state.searchQuery || state.selectedLetter !== 'ALL' || state.selectedCategory !== 'all') {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const featured = state.allBrands.filter((b) => b.featured).slice(0, 12);

  mount.innerHTML = featured
    .map((brand) => {
      const searchUrl = `search.html?q=${encodeURIComponent(brand.query || brand.name)}&brand=${encodeURIComponent(brand.name)}`;
      const liveUrl = `${CONFIG.UPSTREAM_ORIGIN}/${(brand.slug || '').replace(/^\//, '')}`;

      return `
        <article class="brand-spotlight-card">
          <div>
            <div class="brand-spotlight-top">
              ${renderBrandLogoOrMonogram(brand, 'brand-logo-box')}
              <span class="badge badge-amber">${escapeHtml(brand.category || 'Trade')}</span>
            </div>
            <h3 style="font-family:var(--font-display);font-size:1.15rem;font-weight:800;color:#5D1C25;margin-top:0.85rem">
              <a href="${searchUrl}">${escapeHtml(brand.name)}</a>
            </h3>
            <div style="font-size:12px;font-weight:700;color:#C4121A;margin-top:2px">
              ${escapeHtml(brand.specialty)}
            </div>
            <p style="font-size:12.5px;color:var(--text-secondary);margin-top:0.5rem;line-height:1.5">
              ${escapeHtml(brand.description || '')}
            </p>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding-top:0.75rem;border-top:1px solid var(--color-slate-100)">
            <a href="${searchUrl}" class="btn btn-primary btn-sm">
              <span>Shop ${escapeHtml(brand.name)}</span>
              ${lucideIcon('arrow-right', { size: 13 })}
            </a>
            <a
              href="${escapeHtml(liveUrl)}"
              target="_blank"
              rel="noopener"
              class="btn btn-ghost btn-sm"
              title="Open ${escapeHtml(brand.name)} on www.schnap.com.au"
            >
              <span>SCHNAP Live</span>
              ${lucideIcon('arrow-up-right', { size: 13 })}
            </a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderAzDirectory() {
  const mount = document.getElementById('brands-az-directory-mount');
  const summaryEl = document.getElementById('brands-count-summary');
  const clearBtn = document.getElementById('brands-clear-btn');

  const filtered = getFilteredBrands();

  if (summaryEl) {
    summaryEl.textContent = `Showing ${filtered.length} of ${state.allBrands.length} indexed trade brands (200+ stocked warehouse-wide)`;
  }
  if (clearBtn) {
    clearBtn.style.display = state.searchQuery ? 'inline-flex' : 'none';
  }

  if (!mount) return;

  if (filtered.length === 0) {
    mount.innerHTML = `
      <div style="background:var(--color-slate-50);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:3rem 1.5rem;text-align:center">
        <div style="color:#EB1B24;margin-bottom:0.5rem">${lucideIcon('search', { size: 32 })}</div>
        <h3 style="font-size:1.15rem;font-weight:800;color:#5D1C25;margin-bottom:0.4rem">
          No brand matches "${escapeHtml(state.searchQuery || state.selectedLetter)}"
        </h3>
        <p style="font-size:13px;color:var(--text-secondary);max-width:52ch;margin:0 auto 1.25rem">
          SCHNAP stocks 200+ brands across 29,000+ SKUs. Search the live product catalog directly or reset your brand filter.
        </p>
        <div style="display:flex;justify-content:center;gap:0.75rem;flex-wrap:wrap">
          <button type="button" class="btn btn-primary btn-sm" id="empty-brands-reset-btn">
            ${lucideIcon('rotate-ccw', { size: 14 })}
            <span>Show All Brands</span>
          </button>
          <a href="search.html?q=${encodeURIComponent(state.searchQuery || 'Clipsal')}" class="btn btn-navy btn-sm">
            <span>Search "${escapeHtml(state.searchQuery || 'Catalog')}" in 29,000+ SKUs</span>
            ${lucideIcon('arrow-right', { size: 14 })}
          </a>
        </div>
      </div>
    `;
    document.getElementById('empty-brands-reset-btn')?.addEventListener('click', resetAllBrandFilters);
    return;
  }

  // Group alphabetically by first letter
  const groups = new Map();
  for (const b of filtered) {
    const letter = (b.name || '#').charAt(0).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(b);
  }

  mount.innerHTML = [...groups.entries()]
    .map(([letter, items]) => {
      const cardsHtml = items
        .map((brand) => {
          const searchUrl = `search.html?q=${encodeURIComponent(brand.query || brand.name)}&brand=${encodeURIComponent(brand.name)}`;
          const liveUrl = `${CONFIG.UPSTREAM_ORIGIN}/${(brand.slug || '').replace(/^\//, '')}`;
          return `
            <div class="brand-dir-card">
              <div>
                <div class="brand-dir-card__head">
                  ${renderBrandLogoOrMonogram(brand, 'brand-dir-card__logo')}
                  <div>
                    <a href="${searchUrl}" class="brand-dir-card__title">${escapeHtml(brand.name)}</a>
                    <div style="font-size:11px;color:var(--text-muted);font-weight:600">${escapeHtml(brand.category || 'Electrical')}</div>
                  </div>
                </div>
                <p style="font-size:12px;color:var(--text-secondary);margin-top:0.65rem;line-height:1.45">
                  ${escapeHtml(brand.specialty)}
                </p>
              </div>

              <div class="brand-dir-card__foot">
                <a href="${searchUrl}" style="color:#C4121A;display:inline-flex;align-items:center;gap:4px">
                  <span>View Catalog</span>
                  ${lucideIcon('arrow-right', { size: 13 })}
                </a>
                <a
                  href="${escapeHtml(liveUrl)}"
                  target="_blank"
                  rel="noopener"
                  style="color:var(--text-muted);display:inline-flex;align-items:center;gap:3px"
                  title="Official ${escapeHtml(brand.name)} page on www.schnap.com.au"
                >
                  <span>Live Page</span>
                  ${lucideIcon('arrow-up-right', { size: 12 })}
                </a>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="brand-alpha-section" id="brand-letter-${letter}">
          <div class="brand-alpha-header">
            <span class="brand-alpha-letter">${escapeHtml(letter)}</span>
            <div>
              <strong style="font-size:14px;color:#5D1C25">${items.length} ${items.length === 1 ? 'Brand' : 'Brands'} starting with "${escapeHtml(letter)}"</strong>
              <div style="font-size:11px;color:var(--text-muted)">Click any brand to filter SCHNAP's live trade catalog</div>
            </div>
          </div>
          <div class="brand-directory-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderStaticSections() {
  // 4-Pillar Value Props
  const vpMount = document.getElementById('brands-value-props-mount');
  if (vpMount) {
    vpMount.innerHTML = BRAND_VALUE_PROPS.map(
      (vp) => `
        <div class="value-prop-card">
          <div class="value-prop-icon">
            ${lucideIcon(vp.icon, { size: 22, strokeWidth: 2.2 })}
          </div>
          <h3 style="font-family:var(--font-display);font-size:1.05rem;font-weight:800;color:#5D1C25">
            ${escapeHtml(vp.title)}
          </h3>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.55">
            ${escapeHtml(vp.description)}
          </p>
        </div>
      `
    ).join('');
  }

  // 8 Industries Supported Grid
  const indMount = document.getElementById('brands-industries-mount');
  if (indMount) {
    indMount.innerHTML = BRAND_INDUSTRIES.map(
      (ind) => `
        <a href="search.html?q=${encodeURIComponent(ind.query)}" class="industry-card">
          <span class="industry-card__icon">
            ${lucideIcon(ind.icon, { size: 20, strokeWidth: 2.2 })}
          </span>
          <div>
            <div style="font-size:14px;font-weight:800">${escapeHtml(ind.name)}</div>
            <div style="font-size:11px;opacity:0.8;font-weight:500">${escapeHtml(ind.subtitle)}</div>
          </div>
        </a>
      `
    ).join('');
  }

  // Brand & Store FAQ Accordion
  const faqMount = document.getElementById('brands-faq-mount');
  if (faqMount) {
    faqMount.innerHTML = BRAND_PAGE_FAQS.map(
      (item, idx) => `
        <div class="faq-item ${idx === 0 || idx === 3 ? 'is-open' : ''}">
          <button type="button" class="faq-question" data-brand-faq-toggle>
            <span>${escapeHtml(item.q)}</span>
            <span style="color:#EB1B24">${lucideIcon('chevron-down', { size: 16 })}</span>
          </button>
          <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
      `
    ).join('');
  }
}

function resetAllBrandFilters() {
  state.searchQuery = '';
  state.selectedCategory = 'all';
  state.selectedLetter = 'ALL';
  const input = document.getElementById('brands-filter-input');
  if (input) input.value = '';
  document.querySelectorAll('[data-brand-cat]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-brand-cat') === 'all');
  });
  renderAllBrandViews();
}

function bindBrandsEvents() {
  const searchInput = document.getElementById('brands-filter-input');
  searchInput?.addEventListener('input', () => {
    state.searchQuery = searchInput.value.trim();
    renderAllBrandViews();
  });

  document.getElementById('brands-clear-btn')?.addEventListener('click', () => {
    state.searchQuery = '';
    if (searchInput) searchInput.value = '';
    renderAllBrandViews();
  });

  document.getElementById('brands-reset-all-btn')?.addEventListener('click', resetAllBrandFilters);

  // Category discipline filter pills
  document.getElementById('brands-category-pills')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-brand-cat]');
    if (!btn) return;
    state.selectedCategory = btn.getAttribute('data-brand-cat') || 'all';
    state.selectedLetter = 'ALL';
    document.querySelectorAll('[data-brand-cat]').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    renderAllBrandViews();
  });

  // Alphabetical A-Z filter bar
  document.getElementById('brands-alphabet-bar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-alpha]');
    if (!btn || btn.disabled) return;
    state.selectedLetter = btn.getAttribute('data-alpha') || 'ALL';
    renderAllBrandViews();
  });

  // FAQ Accordion
  document.getElementById('brands-faq-mount')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-brand-faq-toggle]');
    if (!btn) return;
    btn.closest('.faq-item')?.classList.toggle('is-open');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBrandsPage);
} else {
  initBrandsPage();
}
