// /js/navbar/ui.js  — JM GOLD/ONYX THEME
// Exports: renderNav({brand}), mountInto(mount, html)

export function renderNav({ brand = 'Justice McNeal LLC' } = {}) {
  return `
  <nav id="nav-root" role="navigation" aria-label="Main" class="sticky z-40"
       style="top: calc(env(safe-area-inset-top, 0px));">
    <div class="w-full rounded-b-2xl rounded-t-none md:rounded-2xl ring-1 ring-white/10 shadow-xl shadow-black/30
                supports-[backdrop-filter]:backdrop-blur-sm
                bg-[radial-gradient(1000px_600px_at_10%_-10%,rgba(212,175,55,.08),transparent_60%),linear-gradient(90deg,#0b0b0c,#121214,#0b0b0c)]">
      <div class="max-w-6xl mx-auto px-4">
        <div class="h-16 flex items-center justify-between text-white">
          <!-- Brand + desktop links -->
          <div class="flex items-center gap-3 sm:gap-4 min-w-0">
<a href="/index.html" class="flex items-center gap-3 shrink-0 group">
  <span class="brand-title truncate">${brand}</span>
  <span class="brand-tag whitespace-nowrap  xs:inline">| est. 2025</span>
</a>




            <!-- Desktop links -->
            <div class="hidden md:flex items-center gap-1 sm:gap-2">
              <a href="/pages/contribute.html" class="nav-link">Contribute</a>

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
                     class="menu-panel absolute left-0 mt-1 w-44 hidden">
                  <a href="/pages/admin.html"     class="menu-item">Members</a>
                  <a href="/pages/dashboard.html" class="menu-item">Dashboard</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Right cluster -->
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="hidden sm:block text-right select-none">
              <div class="text-[11px] opacity-80 leading-tight">Hello</div>
              <div class="text-sm font-medium" id="nav-hello">—</div>
            </div>

            <!-- Avatar / profile -->
            <div class="relative">
              <button id="nav-avatar"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full
                       bg-white text-[#0b0b0c] font-semibold shadow ring-1 ring-black/10
                       hover:shadow-md active:shadow transition"
                aria-haspopup="menu" aria-expanded="false" title="Account"></button>

              <div id="nav-profile" class="menu-panel absolute right-0 mt-2 w-56 hidden">
                <div class="px-3 py-2 border-b border-white/10">
                  <div id="nav-name"  class="text-sm font-medium truncate">—</div>
                  <div id="nav-email" class="text-xs text-white/60 truncate">—</div>
                </div>
                <div class="p-2">
                  <a href="/pages/account.html" class="menu-item">Account</a>
                  <button id="nav-signout"
                          class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm
                                 hover:bg-rose-600/15 hover:text-rose-300">Sign out</button>
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
       class="fixed inset-0 z-40 md:hidden bg-black/60 opacity-0 pointer-events-none transition-opacity"></div>

  <aside id="nav-drawer"
         class="fixed inset-y-0 right-0 z-50 md:hidden w-[88%] max-w-xs translate-x-full
                transition-transform will-change-transform
                bg-[#121214] text-white shadow-2xl ring-1 ring-white/10 flex flex-col
                pt-[max(env(safe-area-inset-top),16px)]
                pb-[max(env(safe-area-inset-bottom),16px)]
                pr-[max(env(safe-area-inset-right),12px)] pl-4">
    <div class="flex items-center justify-between pr-2">
      <div class="text-sm text-white/60">Menu</div>
      <button id="nav-drawer-close"
              class="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10 active:bg-white/15"
              aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <nav id="nav-mobile-menu" class="mt-2 overflow-y-auto overscroll-contain">
      <a href="/pages/contribute.html" class="mnav-link">Contribute</a>

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

      <hr class="my-3 border-white/10">
      <button id="nav-signout-drawer" class="mnav-link text-rose-300">Sign out</button>
    </nav>
  </aside>

  <!-- theme styles specific to navbar -->
  <style>
    /* Fonts: brand= Cinzel; body= Inter (loaded on your pages) */
    .brand-title{
      font-family: "Cinzel", serif;
      font-size: 20px;
      letter-spacing: .02em;
      font-weight: 700;
      color: #EED488; /* soft gold to match header in your screenshot */
      text-shadow: 0 0 12px rgba(212,175,55,.25);
    }

    :root { --gold:#D4AF37; --gold-soft:#E0C463; }

    /* Desktop nav links */
    .nav-link{
      position:relative; padding:.425rem .65rem; border-radius:.6rem;
      color:rgba(255,255,255,.9);
      transition:background-color .12s ease,color .12s ease, box-shadow .12s ease;
    }
    .nav-link:hover{ color:#fff; background:rgba(255,255,255,.10) }
    .nav-link.active{
      color:#0b0b0c;
      background: linear-gradient(90deg,var(--gold),var(--gold-soft));
      box-shadow: 0 0 0 1px rgba(212,175,55,.25) inset;
    }

    /* Dropdown / profile panels */
    .menu-panel{
      overflow:hidden; border-radius: .85rem;
      background: rgba(18,18,20,.95);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 24px 60px rgba(0,0,0,.45);
    }
    .menu-item{
      display:block; padding:.55rem .75rem; font-size:.905rem; border-radius:.55rem;
      color:#fff;
    }
    .menu-item:hover{ background: rgba(255,255,255,.08); }

    /* Mobile links */
    .mnav-link{
      display:block; padding:.9rem .5rem; border-radius:.7rem;
      font-size:1.06rem; line-height:1.25rem; color:#fff;
    }
    .mnav-link:hover{ background: rgba(255,255,255,.08); }

    .brand-tag{
  font-family: "Cinzel", serif;        /* matches the title */
  font-size: 12px;
  letter-spacing: .04em;
  color: #E0C463;                      /* soft gold */
  text-shadow: 0 0 10px rgba(212,175,55,.18);
  margin-left: .25rem;                 /* space after the title */
  opacity: .95;
}

  </style>
  `;
}

export function mountInto(mountNode, html) {
  if (!mountNode) return;
  mountNode.innerHTML = html;
}
