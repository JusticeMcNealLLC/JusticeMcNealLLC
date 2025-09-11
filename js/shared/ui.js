let toastHost;

/** Ensure the toast container exists */
export function initToasts() {
  if (toastHost) return toastHost;
  toastHost = document.createElement('div');
  Object.assign(toastHost.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: '9999',
    pointerEvents: 'none', // so clicks pass through container
  });
  document.body.appendChild(toastHost);
  return toastHost;
}

/**
 * Show a toast message
 * @param {string|HTMLElement} message
 * @param {object} options
 * @param {'info'|'success'|'error'} [options.kind='info']
 * @param {number} [options.ms=3000] - duration before auto-remove
 */
export function toast(message, { kind = 'info', ms = 3000 } = {}) {
  const host = initToasts();
  const el = document.createElement('div');
  el.role = 'status';
  el.ariaLive = 'polite';
  el.textContent = '';
  if (message instanceof HTMLElement) el.append(message);
  else el.textContent = message;

  Object.assign(el.style, {
    padding: '10px 12px',
    borderRadius: '8px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
    fontSize: '14px',
    background:
      kind === 'error'
        ? '#fee2e2'
        : kind === 'success'
        ? '#dcfce7'
        : '#f1f5f9',
    border: '1px solid rgba(0,0,0,0.1)',
    color: '#111',
    pointerEvents: 'auto', // allow hover to pause removal
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: '0',
    transform: 'translateY(10px)',
  });

  host.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  // Auto-remove
  const timer = setTimeout(() => remove(), ms);

  // Hover pauses removal
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => setTimeout(() => remove(), 1000));

  function remove() {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }

  return el;
}
