// ==========================================================================
// SCHNAP Electric Products — Home Page Controller (home.js)
// Clean, spacious layout without the "Browse by Electrical Trade Discipline" section
// ==========================================================================

import { CONFIG } from '../core/config.js?v=afde963';
import { initGlobalShell } from '../components/header.js?v=afde963';
import {
  renderProductCard,
  renderTradeTable,
  bindProductCatalogEvents,
  escapeHtml,
} from '../components/productCard.js?v=afde963';
import { openQuickView } from '../components/quickView.js?v=afde963';
import { lucideIcon, lucideStars, hydrateLucideIcons } from '../components/icons.js?v=afde963';
import { fetchHomeCatalog } from '../core/dispatch.js?v=afde963';
import {
  SEED_PRODUCTS,
  SEED_REVIEWS,
  SEED_FAQS,
  STORE_VALUE_PROPS,
  STORE_INDUSTRIES,
} from '../data/pitchSeeds.js?v=afde963';

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
  renderValuePropsAndIndustries();
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

  const brands = CONFIG.BRANDS.filter((b) => b.featured || b.logo || b.tier === 'flagship');
  const displayBrands = brands.length >= 12 ? brands : CONFIG.BRANDS.slice(0, 18);

  mount.innerHTML = displayBrands
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
          href="search.html?brand=${encodeURIComponent(b.name)}"
          class="brand-tile"
          title="${escapeHtml(b.name)}"
        >
          ${mediaHtml}
          <span>${escapeHtml(b.name)}</span>
        </a>
      `;
    })
    .join('');

  const prevBtn = document.getElementById('brands-prev-btn');
  const nextBtn = document.getElementById('brands-next-btn');
  if (prevBtn && mount) {
    prevBtn.addEventListener('click', () => {
      mount.scrollBy({ left: -360, behavior: 'smooth' });
    });
  }
  if (nextBtn && mount) {
    nextBtn.addEventListener('click', () => {
      mount.scrollBy({ left: 360, behavior: 'smooth' });
    });
  }
}

function renderValuePropsAndIndustries() {
  const vpMount = document.getElementById('home-value-props-mount');
  if (vpMount) {
    vpMount.innerHTML = STORE_VALUE_PROPS.map(
      (vp) => `
        <div class="value-prop-card">
          <div class="value-prop-icon">
            ${lucideIcon(vp.icon, { size: 20, strokeWidth: 2 })}
          </div>
          <h3 style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:#5C0632">
            ${escapeHtml(vp.title)}
          </h3>
          <p style="font-size:13px;color:var(--text-secondary);line-height:1.55">
            ${escapeHtml(vp.description)}
          </p>
        </div>
      `
    ).join('');
  }

  const indMount = document.getElementById('home-industries-mount');
  if (indMount) {
    indMount.innerHTML = STORE_INDUSTRIES.map(
      (ind) => `
        <a href="search.html?q=${encodeURIComponent(ind.query)}" class="industry-card">
          <span class="industry-card__icon">
            ${lucideIcon(ind.icon, { size: 18, strokeWidth: 2 })}
          </span>
          <span style="font-size:14px">${escapeHtml(ind.name)}</span>
        </a>
      `
    ).join('');
  }
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
            <strong style="color:#5C0632;display:block">${escapeHtml(r.author)}</strong>
            <span style="color:var(--text-muted)">${escapeHtml(r.date)}</span>
          </div>
        </article>
      `
    ).join('');
  }

  const faqMount = document.getElementById('home-faq-mount');
  if (faqMount) {
    faqMount.innerHTML = SEED_FAQS.map(
      (item) => `
        <div class="faq-item">
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
