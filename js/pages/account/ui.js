import { APP } from '/js/shared/config.js';

const dlog = (...args) => { if (APP?.debug) console.log('[account][ui]', ...args); };

export function init() {
  dlog('init');
}

export function setBusy(isBusy) {
  const b1 = document.getElementById('btnBillingPortal');
  const b2 = document.getElementById('btnRefresh');
  const b3 = document.getElementById('btnSignOut');

  [b1, b2, b3].forEach(btn => {
    if (!btn) return;
    btn.disabled = !!isBusy;
    if (isBusy) btn.classList.add('opacity-60', 'pointer-events-none');
    else btn.classList.remove('opacity-60', 'pointer-events-none');
  });
}
