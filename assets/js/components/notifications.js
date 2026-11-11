// ==========================================================================
// SCHNAP Electric Products — Toast Notifications Component (notifications.js)
// Maps CS-Cart's notifications envelope & optimistic trade actions into toasts.
// ==========================================================================

let containerEl = null;

function ensureContainer() {
  if (containerEl && document.body.contains(containerEl)) return containerEl;
  containerEl = document.createElement('div');
  containerEl.className = 'toast-container';
  containerEl.setAttribute('role', 'region');
  containerEl.setAttribute('aria-label', 'Trade notifications');
  document.body.appendChild(containerEl);
  return containerEl;
}

export function showToast({ title = 'SCHNAP Trade', message = '', type = 'info', duration = 3400 } = {}) {
  const container = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const iconSvg =
    type === 'success'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`
      : type === 'error'
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;

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
      title: n.title || 'CS-Cart Notice',
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
