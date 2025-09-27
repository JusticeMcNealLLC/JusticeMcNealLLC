// /js/navbar/ui.js
// (no imports needed)

const NAV_TOP_OFFSET_PX = 0;
const FLUSH_TOP_ON_MOBILE = true;

export function renderNav({ brand = 'Justice McNeal LLC' } = {}) {
  const shellRadius = FLUSH_TOP_ON_MOBILE
    ? 'rounded-b-2xl rounded-t-none md:rounded-2xl'
    : 'rounded-2xl';

  return `
  <nav id="appNav" class="sticky z-40" style="top: calc(env(safe-area-inset-top, 0px) + ${NAV_TOP_OFFSET_PX}px);">
    <div class="w-full bg-gradient-to-r from-[#0b1a2a] via-[#0f2742] to-[#0b1a2a] text-white ${shellRadius} ring-1 ring-white/10">
      <div class="max-w-6xl mx-auto px-4">
        <div class="h-14 flex items-center justify-between">
          <div class="flex items-center gap-3 sm:gap-4 min-w-0">
            <a href="/index.html" class="flex items-center gap-3 shrink-0">
              <div class="h-8 w-8 rounded-b-2xl rounded-t-sm bg-white/10 grid place-items-center font-semibold">JM</div>
              <span class="text-[17px] font-semibold tracking-tight truncate">${brand}</span>
            </a>
            <button id="navBack" class="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition" title="Back" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div class="hidden md:flex items-center gap-1 sm:gap-2">
              <a href="/pages/account.html" class="nav-link">Account</a>
              <a href="/pages/contribute.html" class="nav-link">Contribute</a>
              <a href="/index.html#events" class="nav-link">Events</a>
              <a href="/index.html#photos" class="nav-link">Photos</a>
              <a href="/index.html#goals" class="nav-link">Goals</a>

              <div id="adminGroup" class="relative hidden">
                <button id="adminMenuBtn" class="nav-link inline-flex items-center gap-1" aria-haspopup="menu" aria-expanded="false">
                  Admin
                  <svg class="inline-block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div id="adminMenu" class="absolute left-0 mt-1 w-44 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                  <a href="/pages/admin.html" class="block px-3 py-2 text-sm hover:bg-slate-100">Members</a>
                  <a id="dashboardNav" href="/pages/dashboard.html" class="block px-3 py-2 text-sm hover:bg-slate-100">Dashboard</a>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <div class="hidden sm:block text-right select-none">
              <div class="text-[11px] opacity-80 leading-tight">Hello</div>
              <div class="text-sm font-medium" id="navHelloName">—</div>
            </div>

            <div class="relative">
              <button id="avatarBtn"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0b1a2a] font-semibold shadow ring-1 ring-black/5 hover:shadow-md transition"
                aria-haspopup="menu" aria-expanded="false" title="Account"></button>

              <div id="profileMenu" class="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                <div class="px-3 py-2 border-b border-slate-200">
                  <div id="pmName"  class="text-sm font-medium truncate">—</div>
                  <div id="pmEmail" class="text-xs text-slate-600 truncate">—</div>
                </div>
                <div class="p-2">
                  <a href="/pages/account.html" class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Account</a>
                  <!-- NOTE: renamed from btnSignOut to avoid ID collision with pages -->
                  <button id="btnSignOutNav" class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-rose-50 hover:text-rose-700">Sign out</button>
                </div>
              </div>
            </div>

            <button id="mobileMenuBtn" class="md:hidden inline-flex items-center justify-center h-10 w-10 -mr-1 rounded-xl hover:bg-white/10 active:bg-white/15 transition" aria-expanded="false" aria-controls="mobileDrawer" aria-label="Open menu">
              <svg id="mobileMenuIcon" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Backdrop + Drawer (mobile-only) -->
  <div id="navBackdrop" class="fixed inset-0 z-40 md:hidden bg-black/40 opacity-0 pointer-events-none transition-opacity"></div>
  <aside id="mobileDrawer" class="fixed inset-y-0 right-0 z-50 md:hidden w-[88%] max-w-xs translate-x-full transition-transform will-change-transform
         bg-white text-slate-900 shadow-2xl ring-1 ring-black/5 flex flex-col
         pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] pr-[max(env(safe-area-inset-right),12px)] pl-4">
    <div class="flex items-center justify-between pr-2">
      <div class="text-sm text-slate-600">Menu</div>
      <button id="drawerClose" class="h-9 w-9 grid place-items-center rounded-lg hover:bg-slate-100 active:bg-slate-200" aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <nav id="mobileMenu" class="mt-2 overflow-y-auto overscroll-contain">
      <a href="/pages/account.html" class="mnav-link">Account</a>
      <a href="/pages/contribute.html" class="mnav-link">Contribute</a>
      <a href="/index.html#events" class="mnav-link">Events</a>
      <a href="/index.html#photos" class="mnav-link">Photos</a>
      <a href="/index.html#goals" class="mnav-link">Goals</a>

      <div id="adminGroupMobile" class="hidden mt-1">
        <button id="adminMobileToggle" class="mnav-link w-full text-left inline-flex items-center justify-between">
          <span>Admin</span>
          <svg class="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div id="adminMobileMenu" class="pl-3 mt-1 hidden">
          <a href="/pages/admin.html" class="mnav-link">Members</a>
          <a id="dashboardNavMobile" href="/pages/dashboard.html" class="mnav-link">Dashboard</a>
        </div>
      </div>

      <hr class="my-3 border-slate-200">
      <button id="drawerSignOut" class="mnav-link text-rose-700">Sign out</button>
    </nav>
  </aside>

  <style>
    .nav-link{position:relative;padding:.375rem .625rem;border-radius:.5rem;color:rgba(255,255,255,.85);transition:background-color .12s ease,color .12s ease}
    .nav-link:hover{color:#fff;background:rgba(255,255,255,.10)}
    .nav-link.active{color:#fff;background:rgba(255,255,255,.18)}
    .mnav-link{display:block;padding:.875rem .5rem;border-radius:.625rem;font-size:1.0625rem;line-height:1.25rem}
    .mnav-link:hover{background:#f1f5f9}
  </style>
  `;
}

export function mountInto(mountNode, html) {
  mountNode.innerHTML = html;
}
