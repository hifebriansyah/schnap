// ==========================================================================
// SCHNAP Electric Products — Home Page Controller (home.js)
// Clean, spacious layout without the "Browse by Electrical Trade Discipline" section
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
import { lucideIcon, lucideStars, hydrateLucideIcons } from '../components/icons.js';
import { fetchHomeCatalog } from '../core/dispatch.js';
import { SEED_PRODUCTS, SEED_REVIEWS, SEED_FAQS } from '../data/pitchSeeds.js';

let currentProducts = [...SEED_PRODUCTS];
let activePillarFilter = 'all';
let activeViewMode = 'grid';

export async function initHomePage() {
  initGlobalShell({ activePillar: 'home' });

  const heroImg = document.getElementById('home-hero-banner-img');
  if (heroImg && CONFIG.STORE_FACTS.heroBannerUrl) {
    heroImg.src = CONFIG.STORE_FACTS.heroBannerUrl;
  }

  renderTradeHighlights();
  renderBrandsRibbon();
  renderReviewsAndFaq();
  bindHomeInteractions();
  hydrateLucideIcons(document);

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
    // Seed catalog remains displayed
  }
}

function mergeLiveProducts(liveList = []) {
  if (!Array.isArray(liveList) || liveList.length === 0) return;
  const byId = new Map();
  for (const p of SEED_PRODUCTS) byId.set(String(p.id), p);
  for (const p of liveList) {
    if (!byId.has(String(p.id))) {
      byId.set(String(p.id), p);
    }
  }
  currentProducts = [...byId.values()];
  renderTradeHighlights();
}

function getFilteredHighlights() {
  if (activePillarFilter === 'all') {
    return currentProducts.slice(0, 8);
  }
  return currentProducts
    .filter((p) => String(p.categoryId) === activePillarFilter || (activePillarFilter === '4264' && p.categoryId === '4472'))
    .slice(0, 8);
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

  mount.innerHTML = CONFIG.BRANDS.filter((b) => b.featured)
    .slice(0, 8)
    .map((b) => {
      const initials = b.name
        .split(/[\s-]+/)
        .map((w) => w.charAt(0))
        .join('')
        .slice(0, 3)
        .toUpperCase();

      const mediaHtml = b.logo
        ? `<img src="${escapeHtml(b.logo)}" alt="${escapeHtml(b.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'" /><span class="brand-monogram" style="display:none">${escapeHtml(initials)}</span>`
        : `<span class="brand-monogram">${escapeHtml(initials)}</span>`;

      return `
        <a
          href="search.html?q=${encodeURIComponent(b.query)}&brand=${encodeURIComponent(b.name)}"
          class="brand-tile"
          title="${escapeHtml(b.name)}"
        >
          ${mediaHtml}
          <span>${escapeHtml(b.name)}</span>
        </a>
      `;
    })
    .join('');
}

function renderReviewsAndFaq() {
  const reviewsMount = document.getElementById('home-reviews-mount');
  if (reviewsMount) {
    reviewsMount.innerHTML = SEED_REVIEWS.map(
      (r) => `
        <article class="review-card">
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
              ${lucideStars(r.rating || 5, { size: 14 })}
              <span class="badge badge-amber">${escapeHtml(r.tag)}</span>
            </div>
            <p style="font-size:14px;color:var(--text-primary);line-height:1.6">"${escapeHtml(r.quote)}"</p>
          </div>
          <div style="padding-top:0.75rem;border-top:1px solid var(--color-slate-100);font-size:12px">
            <strong style="color:#5D1C25;display:block">${escapeHtml(r.author)}</strong>
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
            <span style="color:var(--color-gold-600)">${lucideIcon('chevron-down', { size: 16 })}</span>
          </button>
          <div class="faq-answer">${escapeHtml(item.a)}</div>
        </div>
      `
    ).join('');
  }
}

function bindHomeInteractions() {
  document.querySelectorAll('[data-highlight-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-highlight-filter]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activePillarFilter = btn.getAttribute('data-highlight-filter') || 'all';
      renderTradeHighlights();
    });
  });

  document.querySelectorAll('[data-home-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-home-view]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeViewMode = btn.getAttribute('data-home-view') || 'grid';
      renderTradeHighlights();
    });
  });

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
