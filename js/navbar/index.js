// /js/navbar/index.js
import { setActiveLinks } from './dom.js';
import { initMenusAndDrawer } from './events.js';
import { hydrateFromSupabase, setupSignOut, watchAuth } from './state.js';

// Read brand from #navMount[data-brand] or <html data-brand="...">
function readBrand() {
  const m = document.getElementById('navMount');
  return (m?.dataset?.brand || document.documentElement.dataset.brand || 'Justice McNeal LLC');
}

// Full markup used if the page did NOT include /page_inserts/navbar.html
function renderMarkup({ brand = readBrand() } = {}) {
  return `
  <nav id="nav-root" role="navigation" aria-label="Main" class="sticky z-40"
       style="top: calc(env(safe-area-inset-top, 0px) + 0px);">
    <div class="w-full bg-gradient-to-r from-[#0b1a2a] via-[#102a45] to-[#0b1a2a]
                text-white rounded-b-2xl rounded-t-none md:rounded-2xl
                ring-1 ring-white/10 shadow-xl shadow-black/5
                supports-[backdrop-filter]:backdrop-blur-sm">
      <div class="max-w-6xl mx-auto px-4">
        <div class="h-14 flex items-center justify-between">
          <div class="flex items-center gap-3 sm:gap-4 min-w-0">
            <a href="/index.html" class="flex items-center gap-3 shrink-0">
              <div class="h-8 w-8 rounded-b-2xl rounded-t-sm bg-white/10
                          grid place-items-center font-semibold">JM</div>
              <span class="text-[17px] font-semibold tracking-tight truncate">${brand}</span>
            </a>

            <button id="nav-back" class="hidden md:inline-flex items-center justify-center h-8 w-8
                   rounded-full hover:bg-white/10 active:bg-white/15 transition"
                   title="Back" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <!-- Desktop links -->
            <div class="hidden md:flex items-center gap-1 sm:gap-2">
              <a href="/pages/account.html"    class="nav-link">Account</a>
              <a href="/pages/contribute.html" class="nav-link">Contribute</a>
              <a href="/index.html#events"     class="nav-link">Events</a>
              <a href="/index.html#photos"     class="nav-link">Photos</a>
              <a href="/index.html#goals"      class="nav-link">Goals</a>

              <!-- Admin (desktop) -->
              <div id="nav-admin-desktop" class="relative hidden">
                <button id="nav-admin-btn" class="nav-link inline-flex items-center gap-1"
                        aria-haspopup="menu" aria-expanded="false">
                  Admin
                  <svg class="inline-block" width="16" height="16" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                <div id="nav-admin-menu"
                     class="absolute left-0 mt-1 w-44 overflow-hidden rounded-xl
                            bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                  <a href="/pages/admin.html"     class="block px-3 py-2 text-sm hover:bg-slate-100">Members</a>
                  <a href="/pages/dashboard.html" class="block px-3 py-2 text-sm hover:bg-slate-100">Dashboard</a>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <div class="hidden sm:block text-right select-none">
              <div class="text-[11px] opacity-80 leading-tight">Hello</div>
              <div class="text-sm font-medium" id="nav-hello">—</div>
            </div>

            <!-- Avatar / profile -->
            <div class="relative">
              <button id="nav-avatar"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full
                       bg-white/90 text-[#0b1a2a] font-semibold shadow ring-1 ring-black/5
                       hover:shadow-md active:shadow transition"
                aria-haspopup="menu" aria-expanded="false" title="Account"></button>

              <div id="nav-profile"
                   class="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl
                          bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                <div class="px-3 py-2 border-b border-slate-200">
                  <div id="nav-name"  class="text-sm font-medium truncate">—</div>
                  <div id="nav-email" class="text-xs text-slate-600 truncate">—</div>
                </div>
                <div class="p-2">
                  <a href="/pages/account.html"
                     class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Account</a>
                  <button id="nav-signout"
                          class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm
                                 hover:bg-rose-50 hover:text-rose-700">Sign out</button>
                </div>
              </div>
            </div>

            <!-- Mobile hamburger -->
            <button id="nav-mobile-toggle"
              class="md:hidden inline-flex items-center justify-center h-10 w-10 -mr-1
                     rounded-xl hover:bg-white/10 active:bg-white/15 transition"
              aria-expanded="false" aria-controls="nav-drawer" aria-label="Open menu">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Backdrop + Drawer (mobile) -->
  <div id="nav-backdrop"
       class="fixed inset-0 z-40 md:hidden bg-black/40 opacity-0 pointer-events-none transition-opacity"></div>

  <aside id="nav-drawer"
         class="fixed inset-y-0 right-0 z-50 md:hidden w-[88%] max-w-xs translate-x-full
                transition-transform will-change-transform
                bg-white text-slate-900 shadow-2xl ring-1 ring-black/5 flex flex-col
                pt-[max(env(safe-area-inset-top),16px)]
                pb-[max(env(safe-area-inset-bottom),16px)]
                pr-[max(env(safe-area-inset-right),12px)] pl-4">
    <div class="flex items-center justify-between pr-2">
      <div class="text-sm text-slate-600">Menu</div>
      <button id="nav-drawer-close"
              class="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 active:bg-slate-200"
              aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <nav id="nav-mobile-menu" class="mt-2 overflow-y-auto overscroll-contain">
      <a href="/pages/account.html"    class="mnav-link">Account</a>
      <a href="/pages/contribute.html" class="mnav-link">Contribute</a>
      <a href="/index.html#events"     class="mnav-link">Events</a>
      <a href="/index.html#photos"     class="mnav-link">Photos</a>
      <a href="/index.html#goals"      class="mnav-link">Goals</a>

      <!-- Admin (mobile) -->
      <div id="nav-admin-mobile" class="hidden mt-1">
        <button id="nav-admin-mobile-toggle"
                class="mnav-link w-full text-left inline-flex items-center justify-between"
                aria-controls="nav-admin-mobile-menu" aria-expanded="false">
          <span>Admin</span>
          <svg class="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div id="nav-admin-mobile-menu" class="pl-3 mt-1 hidden">
          <a href="/pages/admin.html"     class="mnav-link">Members</a>
          <a href="/pages/dashboard.html" class="mnav-link">Dashboard</a>
        </div>
      </div>

      <hr class="my-3 border-slate-200">
      <button id="nav-signout-drawer" class="mnav-link text-rose-700">Sign out</button>
    </nav>
  </aside>

  <style>
    .nav-link{
      position:relative;padding:.375rem .625rem;border-radius:.5rem;
      color:rgba(255,255,255,.9);transition:background-color .12s ease,color .12s ease
    }
    .nav-link:hover{color:#fff;background:rgba(255,255,255,.12)}
    .nav-link.active{color:#fff;background:rgba(255,255,255,.2)}
    .mnav-link{display:block;padding:.875rem .5rem;border-radius:.625rem;
      font-size:1.0625rem;line-height:1.25rem}
    .mnav-link:hover{background:#f1f5f9}
    @media (prefers-reduced-motion: reduce){
      #nav-backdrop, #nav-drawer{transition:none !important}
    }
  </style>
  `;
}

function ensureMarkupPresent() {
  // A: partial already present
  if (document.getElementById('nav-root')) return;

  // B: render into #navMount if present
  const mount = document.getElementById('navMount');
  if (mount) { mount.innerHTML = renderMarkup({ brand: readBrand() }); return; }

  // C: create a mount at top of <body>
  const fallback = document.createElement('div');
  fallback.id = 'navMount';
  document.body.insertBefore(fallback, document.body.firstChild);
  fallback.innerHTML = renderMarkup({ brand: readBrand() });
}

function boot() {
  if (window.__navBooted) return;           // idempotent guard
  window.__navBooted = true;

  ensureMarkupPresent();

  // Wire behaviors
  initMenusAndDrawer();

  // Active link state on load + navigation events
  const refreshActive = () => setActiveLinks();
  refreshActive();
  window.addEventListener('hashchange', refreshActive);
  window.addEventListener('popstate',   refreshActive);

  // Also refresh right after any in-nav click (lets SPA-ish pages look snappy)
  const nav = document.getElementById('nav-root');
  nav?.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) setTimeout(refreshActive, 0);
  });

  // Auth/profile hydration (non-blocking)
  hydrateFromSupabase();
  setupSignOut();
  watchAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
