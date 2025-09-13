// /js/page_inserts/navbar.js
import { supabase } from '/js/shared/supabaseClient.js';

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Layout knobs ---------- */
const NAV_TOP_OFFSET_PX = 0;            // 0 = flush to top (like index)
const FLUSH_TOP_ON_MOBILE = false;      // rounded on all sizes by default

/* ---------- Markup ---------- */
function renderNav() {
  const shellRadius = FLUSH_TOP_ON_MOBILE
    ? 'rounded-b-2xl rounded-t-none md:rounded-2xl'
    : 'rounded-2xl';

  return `
  <nav id="appNav" class="sticky z-40"
       style="top: calc(env(safe-area-inset-top, 0px) + ${NAV_TOP_OFFSET_PX}px);">
    <div class="w-full bg-gradient-to-r from-[#0b1a2a] via-[#0f2742] to-[#0b1a2a] text-white">
      <div class="max-w-6xl mx-auto px-4">
        <div class="h-14 flex items-center justify-between">
          <!-- Left: Brand + Back + Desktop links -->
          <div class="flex items-center gap-3 sm:gap-4">
            <!-- Brand -->
            <a href="/index.html" class="flex items-center gap-3">
              <div class="h-8 w-8 rounded-b-2xl rounded-t-sm bg-white/10 grid place-items-center font-semibold">
                JM
              </div>
              <span class="text-[17px] font-semibold tracking-tight">Justice McNeal LLC</span>
            </a>

            <!-- Back chevron (hidden on home) -->
            <button id="navBack"
              class="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition"
              title="Back" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <!-- Desktop links -->
            <div class="hidden md:flex items-center gap-1 sm:gap-2">
              <a href="/pages/account.html"     class="nav-link">Account</a>
              <a href="/pages/contribute.html"  class="nav-link">Contribute</a>
              <!-- <a href="/pages/history.html"     class="nav-link">History</a> -->
              <!-- Future sections on Home -->
              <a href="/index.html#events"      class="nav-link">Events</a>
              <a href="/index.html#photos"      class="nav-link">Photos</a>
              <a href="/index.html#goals"       class="nav-link">Goals</a>

              <!-- Admin dropdown (admin-only) -->
              <div id="adminGroup" class="relative hidden">
                <button id="adminMenuBtn"
                        class="nav-link inline-flex items-center gap-1"
                        aria-haspopup="menu" aria-expanded="false">
                  Admin
                  <svg class="inline-block" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div id="adminMenu"
                     class="absolute left-0 mt-1 w-44 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                  <a href="/pages/admin.html"      class="block px-3 py-2 text-sm hover:bg-slate-100">Members</a>
                  <a id="dashboardNav" href="/pages/dashboard.html" class="block px-3 py-2 text-sm hover:bg-slate-100">Dashboard</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Hello {Name} + Avatar + Mobile toggle -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:block text-right">
              <div class="text-[11px] opacity-80 leading-tight">Hello</div>
              <div class="text-sm font-medium" id="navHelloName">—</div>
            </div>

            <!-- Avatar / dropdown -->
            <div class="relative">
              <button id="avatarBtn"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0b1a2a] font-semibold shadow ring-1 ring-black/5 hover:shadow-md transition"
                      aria-haspopup="menu" aria-expanded="false" title="Account">
              </button>

              <div id="profileMenu"
                   class="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
                <div class="px-3 py-2 border-b border-slate-200">
                  <div id="pmName"  class="text-sm font-medium truncate">—</div>
                  <div id="pmEmail" class="text-xs text-slate-600 truncate">—</div>
                </div>
                <div class="p-2">
                  <a href="/pages/account.html"
                     class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Account</a>
                  <button id="btnSignOut"
                          class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-rose-50 hover:text-rose-700">
                    Sign out
                  </button>
                </div>
              </div>
            </div>

            <!-- Mobile menu toggle -->
            <button id="mobileMenuBtn"
                    class="md:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-white/10 transition"
                    aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu">
              <svg id="mobileMenuIcon" class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile panel -->
        <div id="mobileMenu" class="md:hidden hidden pb-3">
          <a href="/pages/account.html"     class="mnav-link">Account</a>
          <a href="/pages/contribute.html"  class="mnav-link">Contribute</a>
          <!-- <a href="/pages/history.html"     class="mnav-link">History</a> -->
          <a href="/index.html#events"      class="mnav-link">Events</a>
          <a href="/index.html#photos"      class="mnav-link">Photos</a>
          <a href="/index.html#goals"       class="mnav-link">Goals</a>

          <!-- Mobile Admin (admin-only) -->
          <div id="adminGroupMobile" class="hidden mt-1">
            <button id="adminMobileToggle"
                    class="mnav-link w-full text-left inline-flex items-center justify-between">
              <span>Admin</span>
              <svg class="ml-2" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div id="adminMobileMenu" class="pl-3 mt-1 hidden">
              <a href="/pages/admin.html"            class="mnav-link">Members</a>
              <a id="dashboardNavMobile" href="/pages/dashboard.html" class="mnav-link">Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .nav-link {
        position: relative; padding:.375rem .625rem; border-radius:.5rem;
        color: rgba(255,255,255,.85);
        transition: background-color .12s ease, color .12s ease;
      }
      .nav-link:hover { color:#fff; background:rgba(255,255,255,.10); }
      .nav-link.active { color:#fff; background:rgba(255,255,255,.18); }
      .mnav-link {
        display:block; padding:.625rem .5rem; margin-top:.25rem;
        border-radius:.5rem; color:rgba(255,255,255,.95);
      }
      .mnav-link:hover { background:rgba(255,255,255,.10); }
    </style>
  </nav>
  `;
}

/* ---------- Helpers & logic ---------- */
function isHome() {
  const p = location.pathname.replace(/\/+$/, '');
  return p === '' || p === '/' || p.endsWith('/index.html');
}

function setActiveLinks() {
  const path = location.pathname.replace(/\/+$/, '');
  const hash = location.hash || '';
  $$('.nav-link, .mnav-link, #adminMenu a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (!href) return;
    const onSamePath = href.includes('#')
      ? path.endsWith('/index.html') || path === '' || path === '/'
      : path.endsWith(href.replace(/\/+$/,''));
    const onSameHash = href.includes('#') ? (hash && href.endsWith(hash)) : true;
    a.classList.toggle('active', !!(onSamePath && onSameHash));
  });
}

function initialsFrom(user, fallback='?') {
  const name  = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const email = user?.email || '';
  const base = (name || email.split('@')[0] || fallback).trim();
  const parts = base.split(/\s+/);
  const ii = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (ii || base[0] || fallback).toUpperCase();
}

async function showAdminAndProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let isAdmin = false, first = (user.email || '').split('@')[0] || 'Member', full = '';
  try {
    const { data: me } = await supabase
      .from('members')
      .select('is_admin, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    isAdmin = !!me?.is_admin;
    full = me?.full_name || user.user_metadata?.full_name || '';
    if (full) first = full.split(' ')[0] || first;

    $('#pmName')  && ($('#pmName').textContent  = full || first || '—');
    $('#pmEmail') && ($('#pmEmail').textContent = me?.email || user.email || '—');
  } catch { /* ignore */ }

  // Toggle admin-only groups
  $('#adminGroup')?.classList.toggle('hidden', !isAdmin);
  $('#adminGroupMobile')?.classList.toggle('hidden', !isAdmin);
  $('#dashboardNav')?.classList.toggle('hidden', !isAdmin);
  $('#dashboardNavMobile')?.classList.toggle('hidden', !isAdmin);

  // Hello, {First}
  const hello = $('#navHelloName');
  if (hello) hello.textContent = first || 'there';

  // Avatar initials
  const avatarBtn = $('#avatarBtn');
  if (avatarBtn && avatarBtn.textContent.trim() === '') {
    avatarBtn.textContent = initialsFrom(user, 'U');
  }
}

function setupBackButton() {
  const back = $('#navBack');
  if (!back) return;
  back.classList.toggle('hidden', isHome());
  back.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.assign('/index.html');
  });
}

function setupAvatarMenu() {
  const btn = $('#avatarBtn');
  const menu = $('#profileMenu');
  if (!btn || !menu) return;

  function close() {
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDoc);
    document.removeEventListener('keydown', onEsc);
  }
  function onDoc(e) { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); }
  function onEsc(e)  { if (e.key === 'Escape') close(); }

  btn.addEventListener('click', () => {
    const willHide = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!willHide));
    if (!willHide) { document.addEventListener('click', onDoc); document.addEventListener('keydown', onEsc); }
  });

  $('#btnSignOut')?.addEventListener('click', async () => {
    try { await supabase.auth.signOut(); } finally { location.assign('/pages/login.html'); }
  });
}

function setupMobileMenu() {
  const btn = $('#mobileMenuBtn');
  const panel = $('#mobileMenu');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const hidden = panel.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!hidden));
  });
  $$('.mnav-link', panel).forEach(a => a.addEventListener('click', () => panel.classList.add('hidden')));
}

function setupAdminDropdown() {
  const btn = $('#adminMenuBtn');
  const menu = $('#adminMenu');
  if (!btn || !menu) return;

  function close() {
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDoc);
    document.removeEventListener('keydown', onEsc);
  }
  function onDoc(e) { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); }
  function onEsc(e)  { if (e.key === 'Escape') close(); }

  btn.addEventListener('click', () => {
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) { document.addEventListener('click', onDoc); document.addEventListener('keydown', onEsc); }
  });
}

function setupAdminMobile() {
  const toggle = $('#adminMobileToggle');
  const panel  = $('#adminMobileMenu');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    panel.classList.toggle('hidden');
  });
}

/* ---------- Mount ---------- */
async function mountNavbar() {
  const mount = document.getElementById('navMount');
  if (!mount) return;
  mount.innerHTML = renderNav();

  setActiveLinks();
  setupBackButton();
  setupAvatarMenu();
  setupMobileMenu();
  setupAdminDropdown();
  setupAdminMobile();
  await showAdminAndProfile();
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await mountNavbar();
  supabase.auth.onAuthStateChange(() => { mountNavbar(); });
});
