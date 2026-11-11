// ==========================================================================
// SCHNAP Electric Products — Stale-While-Revalidate Session Cache & Hover Prefetch
// Mitigates slow CS-Cart controller response times (plan.md Section 7)
// ==========================================================================

import { CONFIG } from './config.js?v=afde963';

const STORAGE_PREFIX = 'schnap_swr_v1:';
const memoryCache = new Map();
const inflightPrefetches = new Set();

/**
 * Reads an entry from in-memory or sessionStorage cache.
 * Returns { data, isStale, timestamp } or null if expired / missing.
 */
export function getCached(key) {
  const fullKey = STORAGE_PREFIX + key;
  const now = Date.now();

  let entry = memoryCache.get(fullKey);
  if (!entry) {
    try {
      const raw = sessionStorage.getItem(fullKey);
      if (raw) {
        entry = JSON.parse(raw);
        memoryCache.set(fullKey, entry);
      }
    } catch {
      return null;
    }
  }

  if (!entry || !entry.timestamp) return null;

  const age = now - entry.timestamp;
  if (age > CONFIG.CACHE_HARD_TTL_MS) {
    memoryCache.delete(fullKey);
    try {
      sessionStorage.removeItem(fullKey);
    } catch {
      // ignore storage quota errors
    }
    return null;
  }

  return {
    data: entry.data,
    timestamp: entry.timestamp,
    ageMs: age,
    isStale: age > CONFIG.CACHE_SOFT_TTL_MS,
  };
}

/**
 * Writes structured data to both in-memory and sessionStorage cache.
 */
export function setCached(key, data) {
  const fullKey = STORAGE_PREFIX + key;
  const entry = {
    timestamp: Date.now(),
    data,
  };
  memoryCache.set(fullKey, entry);
  try {
    sessionStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // If sessionStorage is full, prune oldest keys
    pruneSessionStorage();
  }
}

function pruneSessionStorage() {
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keys.push(k);
      }
    }
    keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * Stale-While-Revalidate helper:
 * - If fresh cache exists, returns immediately (`source: 'cache'`).
 * - If stale cache exists, returns immediately AND invokes `fetcher()` in background (`onRevalidate`).
 * - If no cache exists, awaits `fetcher()` and caches the result.
 */
export async function swrFetch(key, fetcher, { onRevalidate, forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCached(key);
    if (cached) {
      if (cached.isStale) {
        fetcher()
          .then((freshData) => {
            if (freshData) {
              setCached(key, freshData);
              if (typeof onRevalidate === 'function') {
                onRevalidate(freshData);
              }
            }
          })
          .catch(() => {});
      }
      return { data: cached.data, source: 'session-cache', ageMs: cached.ageMs };
    }
  }

  const freshData = await fetcher();
  if (freshData) {
    setCached(key, freshData);
  }
  return { data: freshData, source: 'network', ageMs: 0 };
}

/**
 * Attaches hover-intent prefetching (> 150ms) to container links matching [data-prefetch-product] or [data-prefetch-category]
 */
export function bindHoverPrefetch(rootEl, prefetchCallback) {
  if (!rootEl || typeof prefetchCallback !== 'function') return;

  let hoverTimer = null;

  rootEl.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-prefetch-key]');
    if (!target) return;
    const key = target.getAttribute('data-prefetch-key');
    if (!key || getCached(key) || inflightPrefetches.has(key)) return;

    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (getCached(key) || inflightPrefetches.has(key)) return;
      inflightPrefetches.add(key);
      Promise.resolve(prefetchCallback(key, target))
        .catch(() => {})
        .finally(() => {
          inflightPrefetches.delete(key);
        });
    }, CONFIG.HOVER_PREFETCH_MS);
  });

  rootEl.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-prefetch-key]');
    if (target && hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });
}
