// ==========================================================================
// SCHNAP Electric Products — Media & CloudFront Image Resolution Normalizer
// ==========================================================================

import { CONFIG } from './config.js?v=afde963';

export function normalizeImageUrl(rawUrl, { upgradeRetina = true, sku = '', brand = '' } = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return buildSchematicPlaceholder(sku, brand);
  }

  let url = rawUrl.trim();
  if (!url || url.startsWith('data:image/')) {
    return url || buildSchematicPlaceholder(sku, brand);
  }

  if (url.startsWith('//')) {
    url = 'https:' + url;
  } else if (url.startsWith('../')) {
    url = `${CONFIG.UPSTREAM_ORIGIN}/${url.replace(/^(\.\.\/)+/, '')}`;
  } else if (url.startsWith('/')) {
    if (url.startsWith('/images/')) {
      url = `${CONFIG.CDN_ORIGIN}${url}`;
    } else {
      url = `${CONFIG.UPSTREAM_ORIGIN}${url}`;
    }
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `${CONFIG.UPSTREAM_ORIGIN}/${url}`;
  }

  if (upgradeRetina && url.includes('/images/thumbnails/200/200/')) {
    // Keep 200/200 as primary src and provide 400/400 via getRetinaSrcset
  }

  return url;
}

export function getRetinaSrcset(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (rawUrl.includes('/images/thumbnails/200/200/')) {
    const hiRes = rawUrl.replace('/images/thumbnails/200/200/', '/images/thumbnails/400/400/');
    return `${rawUrl} 1x, ${hiRes} 2x`;
  }
  return '';
}

/**
 * Generates a clean SVG technical schematic placeholder with the brand name and SKU
 * using the #5C0632 / #FFFFFF / #C58B2A (Burnished Brass) palette.
 */
export function buildSchematicPlaceholder(sku = 'SCHNAP-SKU', brand = 'SCHNAP ELECTRIC') {
  const safeSku = String(sku || 'SCHNAP-PART').replace(/[<>&"']/g, '').slice(0, 24);
  const safeBrand = String(brand || 'SCHNAP TRADE').replace(/[<>&"']/g, '').toUpperCase().slice(0, 22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F3EFEA" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="300" height="300" fill="#FAF8F6"/>
    <rect width="300" height="300" fill="url(#grid)"/>
    <rect x="28" y="28" width="244" height="244" rx="12" fill="none" stroke="#E6E0D8" stroke-width="1.5"/>
    <g transform="translate(150, 122)" stroke="#5C0632" stroke-width="2" fill="none">
      <rect x="-42" y="-36" width="84" height="72" rx="6" fill="#FFFFFF" stroke="#5C0632" stroke-width="2"/>
      <line x1="-22" y1="-52" x2="-22" y2="-36" stroke="#C58B2A" stroke-width="2.5"/>
      <line x1="22" y1="-52" x2="22" y2="-36" stroke="#C58B2A" stroke-width="2.5"/>
      <line x1="-22" y1="36" x2="-22" y2="52" stroke="#5C0632" stroke-width="2.5"/>
      <line x1="22" y1="36" x2="22" y2="52" stroke="#5C0632" stroke-width="2.5"/>
      <circle cx="-22" cy="-20" r="3.5" fill="#5C0632"/>
      <circle cx="22" cy="-20" r="3.5" fill="#5C0632"/>
      <circle cx="-22" cy="20" r="3.5" fill="#5C0632"/>
      <circle cx="22" cy="20" r="3.5" fill="#5C0632"/>
      <path d="M -22 16 L -8 -14" stroke="#C58B2A" stroke-width="2.2"/>
      <path d="M 22 16 L 8 -14" stroke="#C58B2A" stroke-width="2.2"/>
    </g>
    <text x="150" y="218" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#736265" letter-spacing="1.2">${safeBrand}</text>
    <rect x="65" y="230" width="170" height="26" rx="6" fill="#5C0632"/>
    <text x="150" y="247" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#FFFFFF">${safeSku}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function attachImageFallback(imgElement, sku = '', brand = '') {
  if (!imgElement) return;
  imgElement.addEventListener(
    'error',
    () => {
      imgElement.removeAttribute('srcset');
      imgElement.src = buildSchematicPlaceholder(sku, brand);
    },
    { once: true }
  );
}
