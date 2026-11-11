// ==========================================================================
// SCHNAP Electric Products — Toast Notifications Component (notifications.js)
// All icons powered by Lucide (icons.js)
// ==========================================================================

import { lucideIcon } from './icons.js?v=afde963';

let containerEl = null;

function ensureContainer() {
  if (containerEl && document.body.contains(containerEl)) return containerEl;
  containerEl = document.createElement('div');
  containerEl.className = 'toast-container';
  containerEl.setAttribute('role', 'region');
  containerEl.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(containerEl);
  return containerEl;
}

export function showToast({ title = 'SCHNAP', message = '', type = 'info', duration = 3000 } = {}) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const iconSvg =
    type === 'success'
      ? `<span style="color:#10B981">${lucideIcon('check-circle-2', { size: 18, strokeWidth: 2.2 })}</span>`
      : type === 'error'
        ? `<span style="color:#EBC06D">${lucideIcon('circle-alert', { size: 18, strokeWidth: 2.2 })}</span>`
        : `<span style="color:#EBC06D">${lucideIcon('info', { size: 18, strokeWidth: 2.2 })}</span>`;

  toast.innerHTML = `
    <div style="margin-top:2px;flex-shrink:0">${iconSvg}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

export function renderCsCartNotifications(notifications = []) {
  if (!Array.isArray(notifications)) return;
  for (const n of notifications) {
    if (String(n.message || '').includes('Possible CSRF attack')) continue;
    showToast({
      title: n.title || 'Notice',
      message: n.message || '',
      type: n.type || 'info',
    });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
