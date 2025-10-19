// /js/navbar/index.js — orchestrator (uses new UI)
import { renderNav, mountInto } from './ui.js';
import { setActiveLinks } from './dom.js';
import { initMenusAndDrawer } from './events.js';
import { hydrateFromSupabase, setupSignOut, watchAuth } from './state.js';

function readBrand() {
  const m = document.getElementById('navMount');
  return (m?.dataset?.brand || document.documentElement.dataset.brand || 'Justice McNeal LLC');
}

function ensureMarkupPresent() {
  if (document.getElementById('nav-root')) return;
  const mount = document.getElementById('navMount') || (() => {
    const node = document.createElement('div');
    node.id = 'navMount';
    document.body.insertBefore(node, document.body.firstChild);
    return node;
  })();

  mountInto(mount, renderNav({ brand: readBrand() }));
}

function boot() {
  if (window.__navBooted) return;
  window.__navBooted = true;

  ensureMarkupPresent();
  initMenusAndDrawer();

  const refreshActive = () => setActiveLinks();
  refreshActive();
  window.addEventListener('hashchange', refreshActive);
  window.addEventListener('popstate',   refreshActive);

  const nav = document.getElementById('nav-root');
  nav?.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) setTimeout(refreshActive, 0);
  });

  hydrateFromSupabase();
  setupSignOut();
  watchAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
