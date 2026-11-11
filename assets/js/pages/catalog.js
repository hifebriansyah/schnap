// ==========================================================================
// SCHNAP Electric Products — Catalog & Search Page Controller (catalog.js)
// Clean, readable catalog & search experience
// ==========================================================================

import { CONFIG } from '../core/config.js';
import { initGlobalShell } from '../components/header.js';
import {
  renderProductCard,
  renderTradeTable,
  renderSkeletonGrid,
  bindProductCatalogEvents,
  escapeHtml,
} from '../components/productCard.js';
import { openQuickView } from '../components/quickView.js';
import { hydrateLucideIcons, lucideIcon } from '../components/icons.js';
import { fetchCategoryCatalog, fetchSearchCatalog } from '../core/dispatch.js';
import { buildCatalogFacets } from '../core/parser.js';
import { SEED_PRODUCTS } from '../data/pitchSeeds.js';

const state = {
  isSearchPage: window.location.pathname.endsWith('search.html'),
  categoryId: '',
  slug: '',
  parentId: '',
  query: '',
  tag: '',
  page: 1,
  sort: 'position_asc',
  viewMode: 'grid',
  selectedBrands: new Set(),
  selectedSpecs: new Set(),
  selectedPrices: new Set(),
  allProducts: [],
  filteredProducts: [],
  subcategories: [],
  facets: [],
  totalCount: 0,
  title: '',
};

export async function initCatalogPage() {
  readUrlParams();

  const activePillar = state.parentId || state.categoryId || (state.isSearchPage ? 'search' : '4257');
  initGlobalShell({ activePillar });
  hydrateLucideIcons(document);

  const searchInput = document.getElementById('header-search-input');
  if (searchInput && state.query) {
    searchInput.value = state.query;
  }

  bindToolbarAndFilterEvents();
  await loadCatalogData();
}

function readUrlParams() {
  const params = new URLSearchParams(window.location.search);
  state.categoryId = params.get('category_id') || (state.isSearchPage ? '' : '4257');
  state.slug = params.get('slug') || '';
  state.parentId = params.get('parent') || '';
  state.query = params.get('q') || '';
  state.tag = params.get('tag') || '';
  state.page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  state.sort = params.get('sort') || 'position_asc';
  state.viewMode = params.get('view') === 'table' ? 'table' : 'grid';

  state.selectedBrands = new Set((params.get('brand') || '').split(',').filter(Boolean));
  state.selectedSpecs = new Set((params.get('spec') || '').split(',').filter(Boolean));
  state.selectedPrices = new Set((params.get('price') || '').split(',').filter(Boolean));
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (state.categoryId) params.set('category_id', state.categoryId);
  if (state.slug) params.set('slug', state.slug);
  if (state.parentId) params.set('parent', state.parentId);
  if (state.query) params.set('q', state.query);
  if (state.tag) params.set('tag', state.tag);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.sort !== 'position_asc') params.set('sort', state.sort);
  if (state.viewMode !== 'grid') params.set('view', state.viewMode);
  if (state.selectedBrands.size) params.set('brand', [...state.selectedBrands].join(','));
  if (state.selectedSpecs.size) params.set('spec', [...state.selectedSpecs].join(','));
  if (state.selectedPrices.size) params.set('price', [...state.selectedPrices].join(','));

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

async function loadCatalogData() {
  const productsMount = document.getElementById('catalog-products-mount');
  if (productsMount) {
    productsMount.className = 'product-grid';
    productsMount.innerHTML = renderSkeletonGrid(8);
  }

  const pillar =
    CONFIG.PILLARS.find((p) => p.id === state.categoryId || p.slug === state.slug || p.id === state.parentId) ||
    CONFIG.PILLARS[1];

  updateHeaderBanner(pillar);

  const [sortBy, sortOrder] = state.sort.split('_');

  let result;
  if (state.isSearchPage || state.query || state.tag) {
    result = await fetchSearchCatalog({
      query: state.query,
      tag: state.tag,
      page: state.page,
      sortBy: sortBy || 'position',
      sortOrder: sortOrder || 'asc',
    });
  } else {
    result = await fetchCategoryCatalog({
      categoryId: state.categoryId,
      slug: state.slug,
      page: state.page,
      sortBy: sortBy || 'position',
      sortOrder: sortOrder || 'asc',
      onRevalidate: (fresh) => {
        if (fresh?.products?.length) {
          applyCatalogResult(fresh, pillar);
        }
      },
    });
  }

  applyCatalogResult(result, pillar);
}

function applyCatalogResult(result, pillar) {
  state.allProducts = result?.products?.length ? result.products : SEED_PRODUCTS;
  state.totalCount = result?.totalCount || state.allProducts.length;
  state.title =
    result?.title ||
    (state.query
      ? `Results for "${state.query}"`
      : state.tag
        ? state.tag
        : pillar?.name || 'Catalog');

  state.subcategories =
    result?.subcategories?.length > 0
      ? result.subcategories
      : (pillar?.subcategories || []).map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          query: s.query || '',
        }));

  state.facets =
    result?.facets?.length > 0 ? result.facets : buildCatalogFacets(null, state.allProducts);

  updateHeaderBanner(pillar);
  renderSubcategoryPills(pillar);
  renderFacetsSidebar();
  applyClientFiltersAndSort();
}

function updateHeaderBanner(pillar) {
  const titleEl = document.getElementById('catalog-page-title');
  const subtitleEl = document.getElementById('catalog-page-subtitle');
  const breadcrumbEl = document.getElementById('catalog-breadcrumb-current');

  const resolvedTitle =
    state.query
      ? `Search: "${state.query}"`
      : state.tag
        ? state.tag
        : state.title || pillar?.name || 'Catalog';

  if (titleEl) titleEl.textContent = resolvedTitle;
  if (breadcrumbEl) breadcrumbEl.textContent = resolvedTitle;
  if (subtitleEl) {
    subtitleEl.textContent = state.query
      ? `Showing matching products across our electrical range.`
      : pillar?.tagline || 'Trade electrical supplies with upfront pricing.';
  }
}

function renderSubcategoryPills(pillar) {
  const bar = document.getElementById('catalog-subcat-pills');
  if (!bar) return;

  if (!state.subcategories || state.subcategories.length === 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';

  const allUrl = `category.html?category_id=${encodeURIComponent(pillar.id)}&slug=${encodeURIComponent(pillar.slug)}`;
  const allActive = state.categoryId === pillar.id && !state.query;

  const pillsHtml = state.subcategories
    .slice(0, 10)
    .map((sub) => {
      const isSubActive =
        (sub.id && sub.id === state.categoryId) ||
        (sub.slug && sub.slug === state.slug) ||
        (sub.query && sub.query === state.query);
      const href = sub.query
        ? `search.html?q=${encodeURIComponent(sub.query)}&cat=${encodeURIComponent(pillar.id)}`
        : `category.html?category_id=${encodeURIComponent(sub.id || pillar.id)}&slug=${encodeURIComponent(sub.slug || '')}&parent=${encodeURIComponent(pillar.id)}`;

      return `
        <a href="${href}" class="subcat-pill ${isSubActive ? 'is-active' : ''}">
          <span>${escapeHtml(sub.name)}</span>
        </a>
      `;
    })
    .join('');

  bar.innerHTML = `
    <a href="${allUrl}" class="subcat-pill ${allActive ? 'is-active' : ''}">
      <span>All ${escapeHtml(pillar.name)}</span>
    </a>
    ${pillsHtml}
  `;
}

function renderFacetsSidebar() {
  const mount = document.getElementById('catalog-facets-mount');
  if (!mount) return;

  mount.innerHTML = state.facets
    .map((group) => {
      const selectedSet =
        group.id === 'brand'
          ? state.selectedBrands
          : group.id === 'spec'
            ? state.selectedSpecs
            : state.selectedPrices;

      const optionsHtml = group.options
        .map((opt) => {
          const checked = selectedSet.has(opt.value) ? 'checked' : '';
          return `
            <label class="filter-checkbox-label">
              <span class="filter-checkbox-left">
                <input
                  type="checkbox"
                  data-facet-group="${escapeHtml(group.id)}"
                  value="${escapeHtml(opt.value)}"
                  ${checked}
                />
                <span>${escapeHtml(opt.label)}</span>
              </span>
              <span class="filter-count">${opt.count}</span>
            </label>
          `;
        })
        .join('');

      return `
        <div class="filter-group">
          <div class="filter-group-title">
            <span>${escapeHtml(group.name)}</span>
          </div>
          <div class="filter-options">
            ${optionsHtml}
          </div>
        </div>
      `;
    })
    .join('');
}

function applyClientFiltersAndSort() {
  let list = [...state.allProducts];

  if (state.selectedBrands.size > 0) {
    list = list.filter((p) =>
      [...state.selectedBrands].some(
        (b) =>
          (p.brand || '').toLowerCase() === b.toLowerCase() ||
          (p.brand || '').toLowerCase().includes(b.toLowerCase()) ||
          b.toLowerCase().includes((p.brand || '').toLowerCase())
      )
    );
  }

  if (state.selectedSpecs.size > 0) {
    list = list.filter((p) =>
      [...state.selectedSpecs].some((s) =>
        (p.specs || []).some((ps) => ps.toLowerCase() === s.toLowerCase()) ||
        p.title.toLowerCase().includes(s.toLowerCase())
      )
    );
  }

  if (state.selectedPrices.size > 0) {
    list = list.filter((p) => {
      return [...state.selectedPrices].some((range) => {
        if (range === '0-25') return p.price < 25;
        if (range === '25-100') return p.price >= 25 && p.price <= 100;
        if (range === '100-250') return p.price > 100 && p.price <= 250;
        if (range === '250+') return p.price > 250;
        return true;
      });
    });
  }

  if (state.sort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sort === 'discount_desc') {
    list.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
  } else if (state.sort === 'product_asc') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  state.filteredProducts = list;
  renderProductsAndPagination();
}

function renderProductsAndPagination() {
  const productsMount = document.getElementById('catalog-products-mount');
  const countEl = document.getElementById('catalog-results-count');
  const paginationMount = document.getElementById('catalog-pagination-mount');

  document.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-view-mode') === state.viewMode);
  });

  const hasActiveFacet =
    state.selectedBrands.size > 0 || state.selectedSpecs.size > 0 || state.selectedPrices.size > 0;
  const displayedTotal = hasActiveFacet
    ? state.filteredProducts.length
    : Math.max(state.totalCount, state.filteredProducts.length);

  if (countEl) {
    countEl.innerHTML = `Showing <strong>${state.filteredProducts.length}</strong> of <strong class="mono">${displayedTotal.toLocaleString('en-AU')}</strong> products`;
  }

  if (!productsMount) return;

  if (state.filteredProducts.length === 0) {
    productsMount.className = '';
    productsMount.innerHTML = `
      <div style="background:#fff;border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:3rem 1.5rem;text-align:center">
        <h3 style="font-size:1.1rem;font-weight:700;color:#5D1C25;margin-bottom:0.5rem">No products match your selected filters</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.25rem">Reset your filters to view all available items.</p>
        <button type="button" class="btn btn-primary btn-sm" id="empty-reset-filters-btn">
          ${lucideIcon('rotate-ccw', { size: 14 })}
          <span>Clear Filters</span>
        </button>
      </div>
    `;
    document.getElementById('empty-reset-filters-btn')?.addEventListener('click', clearAllFacets);
    return;
  }

  if (state.viewMode === 'table') {
    productsMount.className = '';
    productsMount.innerHTML = renderTradeTable(state.filteredProducts);
  } else {
    productsMount.className = 'product-grid';
    productsMount.innerHTML = state.filteredProducts.map((p) => renderProductCard(p)).join('');
  }

  bindProductCatalogEvents(productsMount, {
    getProducts: () => state.allProducts,
    onQuickView: (id, prod) => openQuickView(id, prod),
  });

  if (paginationMount) {
    const totalPages = Math.min(8, Math.max(1, Math.ceil(displayedTotal / 35)));
    if (totalPages <= 1) {
      paginationMount.innerHTML = '';
      return;
    }

    const pagesHtml = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(
        (p) =>
          `<button type="button" class="page-btn ${p === state.page ? 'is-active' : ''}" data-page-num="${p}">${p}</button>`
      )
      .join('');

    paginationMount.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted)">
        Page <strong class="mono">${state.page}</strong> of <strong class="mono">${totalPages}</strong>
      </div>
      <div class="pagination-pages">
        ${pagesHtml}
      </div>
    `;
  }
}

function clearAllFacets() {
  state.selectedBrands.clear();
  state.selectedSpecs.clear();
  state.selectedPrices.clear();
  renderFacetsSidebar();
  syncUrlState();
  applyClientFiltersAndSort();
}

function bindToolbarAndFilterEvents() {
  document.getElementById('catalog-facets-mount')?.addEventListener('change', (e) => {
    const cb = e.target.closest('input[data-facet-group]');
    if (!cb) return;
    const group = cb.getAttribute('data-facet-group');
    const val = cb.value;
    const set =
      group === 'brand'
        ? state.selectedBrands
        : group === 'spec'
          ? state.selectedSpecs
          : state.selectedPrices;

    if (cb.checked) set.add(val);
    else set.delete(val);

    syncUrlState();
    applyClientFiltersAndSort();
  });

  document.getElementById('clear-filters-btn')?.addEventListener('click', clearAllFacets);

  const sortSelect = document.getElementById('catalog-sort-select');
  if (sortSelect) {
    sortSelect.value = state.sort;
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      syncUrlState();
      applyClientFiltersAndSort();
    });
  }

  document.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.viewMode = btn.getAttribute('data-view-mode') || 'grid';
      syncUrlState();
      renderProductsAndPagination();
    });
  });

  document.getElementById('catalog-pagination-mount')?.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page-num]');
    if (!pageBtn) return;
    const nextPage = parseInt(pageBtn.getAttribute('data-page-num'), 10) || 1;
    if (nextPage === state.page) return;
    state.page = nextPage;
    syncUrlState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadCatalogData();
  });

  document.querySelectorAll('[data-spec-tag]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.query = btn.getAttribute('data-spec-tag') || '';
      state.tag = '';
      state.page = 1;
      const searchInput = document.getElementById('header-search-input');
      if (searchInput) searchInput.value = state.query;
      syncUrlState();
      loadCatalogData();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalogPage);
} else {
  initCatalogPage();
}
