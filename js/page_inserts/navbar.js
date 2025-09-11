// /js/page_inserts/navbar.js
import { supabase } from '/js/shared/supabaseClient.js';

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Layout knobs (tweak these) ---------- */
const NAV_TOP_OFFSET_PX = 24;           // move nav down; try 16–24 if you want more space
const FLUSH_TOP_ON_MOBILE = false;      // true = square top corners on small screens

/* ---------- Markup ---------- */
function renderNav() {
  const shellRadius = FLUSH_TOP_ON_MOBILE
    ? 'rounded-b-2xl rounded-t-none md:rounded-2xl' // square top on mobile, rounded on md+
    : 'rounded-2xl';                                 // rounded on all sizes

  return `
  <nav id="appNav" class="sticky z-40 px-2"
       style="top: calc(env(safe-area-inset-top, 0px) + ${NAV_TOP_OFFSET_PX}px);">
    <div class="mx-auto max-w-7xl rounded-b-2xl rounded-t-none bg-gradient-to-br from-[#0b1f35] to-[#132b4a] text-white
                shadow-[0_10px_24px_rgba(2,6,23,0.25)] ring-1 ring-white/10">
      <div class="flex h-14 items-center justify-between px-3 sm:px-5">
        <!-- Left -->
        <div class="flex items-center gap-3 sm:gap-4">
          <a href="/index.html" class="text-[17px] font-semibold tracking-tight">Justice McNeal LLC</a>

          <!-- Back (hidden on home) -->
          <button id="navBack"
            class="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition"
            title="Back" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <!-- Desktop links -->
          <div class="hidden md:flex items-center gap-1 sm:gap-2">
            <a href="/pages/account.html"    class="nav-link">Account</a>
            <a href="/pages/contribute.html" class="nav-link">Contribute</a>
            <a href="/pages/history.html"    class="nav-link">History</a>
            <a id="navAdmin" href="/pages/admin.html" class="nav-link hidden">Admin</a>
          </div>
        </div>

        <!-- Right -->
        <div class="flex items-center gap-2">
          <!-- Avatar dropdown -->
          <div class="relative">
            <button id="avatarBtn"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0b1f35] font-semibold shadow ring-1 ring-black/5 hover:shadow-md transition"
              aria-haspopup="menu" aria-expanded="false" title="Account">
            </button>

            <div id="profileMenu"
              class="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-900/10 hidden">
              <div class="px-3 py-2 border-b border-slate-200">
                <div id="pmName"  class="text-sm font-medium truncate">—</div>
                <div id="pmEmail" class="text-xs text-slate-600 truncate">—</div>
              </div>
              <div class="p-2">
                <a href="/pages/account.html" class="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Account</a>
                <button id="btnSignOut"
                  class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-rose-50 hover:text-rose-700">
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <!-- Mobile toggle -->
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
      <div id="mobileMenu" class="md:hidden hidden px-3 pb-3">
        <a href="/pages/account.html"    class="mnav-link">Account</a>
        <a href="/pages/contribute.html" class="mnav-link">Contribute</a>
        <a href="/pages/history.html"    class="mnav-link">History</a>
        <a id="navAdminMobile" href="/pages/admin.html" class="mnav-link hidden">Admin</a>
      </div>
    </div>

    <style>
      .nav-link {
        position: relative; padding:.375rem .625rem; border-radius:.5rem;
        color: rgba(255,255,255,.8);
        transition: background-color .12s ease, color .12s ease;
      }
      .nav-link:hover { color:#fff; background:rgba(255,255,255,.08); }
      .nav-link.active { color:#fff; background:rgba(255,255,255,.14); }
      .mnav-link {
        display:block; padding:.625rem .5rem; margin-top:.25rem;
        border-radius:.5rem; color:rgba(255,255,255,.9);
        transition: background-color .12s ease;
      }
      .mnav-link:hover { background:rgba(255,255,255,.08); }
    </style>
  </nav>
  `;
}

/* ---------- Logic ---------- */
function isHome() {
  const p = location.pathname.replace(/\/+$/, '');
  return p === '' || p === '/' || p.endsWith('/index.html');
}

function setActiveLinks() {
  const path = location.pathname.replace(/\/+$/, '');
  $$('.nav-link, .mnav-link').forEach(a => {
    const href = a.getAttribute('href') || '';
    const on = path.endsWith(href);
    a.classList.toggle('active', !!on);
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

  // Prefer members.is_admin
  let isAdmin = false;
  try {
    const { data: me } = await supabase
      .from('members')
      .select('is_admin, full_name, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    isAdmin = !!me?.is_admin;

    $('#pmName')  && ($('#pmName').textContent  = me?.full_name || user.user_metadata?.full_name || '—');
    $('#pmEmail') && ($('#pmEmail').textContent = me?.email || user.email || '—');
  } catch { /* ignore */ }

  $('#navAdmin')?.classList.toggle('hidden', !isAdmin);
  $('#navAdminMobile')?.classList.toggle('hidden', !isAdmin);

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
    try { await supabase.auth.signOut(); } finally { location.assign('/index.html'); }
  });
}

function setupMobileMenu() {
  const btn = $('#mobileMenuBtn');
  const panel = $('#mobileMenu');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(open));
  });
  $$('.mnav-link', panel).forEach(a => a.addEventListener('click', () => panel.classList.add('hidden')));
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
  await showAdminAndProfile();
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await mountNavbar();
  supabase.auth.onAuthStateChange(() => { mountNavbar(); });
});
