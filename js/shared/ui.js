// /js/shared/ui.js
let toastHost;


export function initToasts() {
if (toastHost) return;
toastHost = document.createElement('div');
toastHost.style.position = 'fixed';
toastHost.style.right = '16px';
toastHost.style.bottom = '16px';
toastHost.style.display = 'flex';
toastHost.style.flexDirection = 'column';
toastHost.style.gap = '8px';
toastHost.style.zIndex = '9999';
document.body.appendChild(toastHost);
}


export function toast(message, { kind = 'info', ms = 3000 } = {}) {
initToasts();
const el = document.createElement('div');
el.textContent = message;
el.style.padding = '10px 12px';
el.style.borderRadius = '8px';
el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
el.style.fontSize = '14px';
el.style.background = kind === 'error' ? '#fee2e2' : kind === 'success' ? '#dcfce7' : '#f1f5f9';
el.style.border = '1px solid rgba(0,0,0,0.1)';
toastHost.appendChild(el);
setTimeout(() => el.remove(), ms);
}