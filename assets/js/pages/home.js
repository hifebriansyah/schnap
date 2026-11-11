// ==========================================================================
// SCHNAP Electric Products — Home Page Controller (home.js)
// Hydrates index.html via dispatch=index.index & dispatch=products.newest
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell } from '../components/header.js';
import {
  renderProductCard,
  renderTradeTable,
  bindProductCatalogEvents,
  escapeHtml,
} from '../components/productCard.js';
import { openQuickView } from '../components/quickView.js';
import { fetchHomeCatalog } from '../core/dispatch.js';
import { SEED_PRODUCTS, SEED_REVIEWS, SEED_FAQS } from '../data/pitchSeeds.js';

let currentProducts = [...SEED_PRODUCTS];
let activePillarFilter = 'all';
let activeViewMode = 'grid'; // 'grid' | 'table'

export async function initHomePage() {
  initGlobalShell({ activePillar: 'home' });

  renderBentoCategories();
  renderTradeHighlights();
  renderBrandsRibbon();
  renderReviewsAndFaq();
  bindHomeInteractions();

  // Hydrate with live CS-Cart products (dispatch=products.newest) while keeping featured homepage items
  try {
    const liveData = await fetchHomeCatalog({
      onRevalidate: (fresh) => {
        mergeLiveProducts(fresh?.products);
      },
    });
    if (liveData?.products?.length) {
      mergeLiveProducts(liveData.products);
    }
  } catch {
    // Seed catalog remains displayed seamlessly
  }
}

function mergeLiveProducts(liveList = []) {
  if (!Array.isArray(liveList) || liveList.length === 0) return;
  const byId = new Map();
  // Keep curated high-discount trade highlights first, then append live newest arrivals
  for (const p of SEED_PRODUCTS) byId.set(String(p.id), p);
  for (const p of liveList) {
    if (!byId.has(String(p.id))) {
      byId.set(String(p.id), p);
    }
  }
  currentProducts = [...byId.values()];
  renderTradeHighlights();
}

function renderBentoCategories() {
  const mount = document.getElementById('home-bento-grid');
  if (!mount) return;

  const icons = {
    '4255': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg>`,
    '4257': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    '4258': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>`,
    '4261': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>`,
    '4263': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.18V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00-1.18-2.82H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9"/></svg>`,
    '4264': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
  };

  mount.innerHTML = CONFIG.PILLARS.map((pillar) => {
    const pillarUrl = `category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}`;
    const subPills = pillar.subcategories
      .slice(0, 5)
      .map((sub) => {
        const subUrl = sub.query
          ? `search.html?q=${encodeURIComponent(sub.query)}&cat=${encodeURIComponent(pillar.id)}`
          : `category.html?category_id=${encodeURIComponent(sub.id)}&slug=${encodeURIComponent(sub.slug)}&parent=${encodeURIComponent(pillar.id)}`;
        return `<a href="${subUrl}" class="bento-subpill">${escapeHtml(sub.name)}</a>`;
      })
      .join('');

    return `
      <div class="bento-card" data-prefetch-key="catalog:cat_${pillar.id}">
        <div>
          <div class="bento-card-top">
            <div>
              <span class="badge badge-amber" style="margin-bottom:6px">${escapeHtml(pillar.badge)}</span>
              <h3><a href="${pillarUrl}">${escapeHtml(pillar.name)}</a></h3>
            </div>
            <div class="bento-icon-box">
              ${icons[pillar.id] || icons['4257']}
            </div>
          </div>
          <p style="margin-top:4px">${escapeHtml(pillar.tagline)}</p>
        </div>

        <div class="bento-subpills">
          ${subPills}
        </div>

        <a href="${pillarUrl}" class="bento-card-footer">
          <span>Open ${escapeHtml(pillar.name)} Catalog</span>
          <span>→</span>
        </a>
      </div>
    `;
  }).join('');
}

function getFilteredHighlights() {
  if (activePillarFilter === 'all') {
    return currentProducts.slice(0, 12);
  }
  return currentProducts
    .filter((p) => String(p.categoryId) === activePillarFilter || (activePillarFilter === '4264' && p.categoryId === '4472'))
    .slice(0, 12);
}

function renderTradeHighlights() {
  const mount = document.getElementById('home-highlights-mount');
  if (!mount) return;

  const list = getFilteredHighlights();
  if (activeViewMode === 'table') {
    mount.className = '';
    mount.innerHTML = renderTradeTable(list);
  } else {
    mount.className = 'product-grid';
    mount.innerHTML = list.map((p) => renderProductCard(p)).join('');
  }

  bindProductCatalogEvents(mount, {
    getProducts: () => currentProducts,
    onQuickView: (id, prod) => openQuickView(id, prod),
  });
}

function renderBrandsRibbon() {
  const mount = document.getElementById('home-brands-mount');
  if (!mount) return;

  mount.innerHTML = CONFIG.BRANDS.map(
    (b) => `
      <a
        href="search.html?q=${encodeURIComponent(b.query)}&brand=${encodeURIComponent(b.name)}"
        class="brand-tile"
        title="Shop ${escapeHtml(b.name)} — ${escapeHtml(b.specialty)}"
      >
        <img src="${escapeHtml(b.logo)}" alt="${escapeHtml(b.name)}" loading="lazy" />
        <span>${escapeHtml(b.name)}</span>
        <small style="font-size:10px;color:var(--text-muted);text-align:center">${escapeHtml(b.specialty)}</small>
      </a>
    `
  ).join('');
}

function renderReviewsAndFaq() {
  const reviewsMount = document.getElementById('home-reviews-mount');
  if (reviewsMount) {
    reviewsMount.innerHTML = SEED_REVIEWS.map(
      (r) => `
        <article class="review-card">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
              <span class="review-stars">★★★★★</span>
              <span class="badge badge-emerald">${escapeHtml(r.tag)}</span>
            </div>
            <p style="font-size:14px;color:var(--color-navy-800);line-height:1.6">"${escapeHtml(r.quote)}"</p>
          </div>
          <div style="padding-top:0.75rem;border-top:1px solid var(--color-slate-100);font-size:12px">
            <strong style="color:var(--color-navy-900);display:block">${escapeHtml(r.author)}</strong>
            <span style="color:var(--text-muted)">${escapeHtml(r.date)}</span>
          </div>
        </article>
      `
    ).join('');
  }

  const faqMount = document.getElementById('home-faq-mount');
  if (faqMount) {
    faqMount.innerHTML = SEED_FAQS.map(
      (item, idx) => `
        <div class="faq-item ${idx === 0 ? 'is-open' : ''}">
          <button type="button" class="faq-question" data-faq-toggle>
            <span>${escapeHtml(item.q)}</span>
            <span class="mono" style="color:var(--color-amber-600)">+</span>
          </button>
          <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
      `
    ).join('');
  }
}

function bindHomeInteractions() {
  // Pillar filter tabs on Trade Highlights
  document.querySelectorAll('[data-highlight-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-highlight-filter]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activePillarFilter = btn.getAttribute('data-highlight-filter') || 'all';
      renderTradeHighlights();
    });
  });

  // Grid vs. Compact Trade Table View Toggle
  document.querySelectorAll('[data-home-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-home-view]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeViewMode = btn.getAttribute('data-home-view') || 'grid';
      renderTradeHighlights();
    });
  });

  // FAQ Accordion
  document.getElementById('home-faq-mount')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-faq-toggle]');
    if (!btn) return;
    const item = btn.closest('.faq-item');
    item?.classList.toggle('is-open');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomePage);
} else {
  initHomePage();
}
