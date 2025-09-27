// /js/page_inserts/navbar.js — mobile-drawer refactor (2025-09-14)
// Drop-in replacement for your current navbar builder. It keeps all your
// Supabase/admin logic, but swaps the mobile dropdown for a slide‑in drawer
// with backdrop, scroll‑lock, ESC/overlay close, and bigger tap targets.

import { supabase } from '/js/shared/supabaseClient.js';

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ---------- Layout knobs ---------- */
const NAV_TOP_OFFSET_PX = 0;            // 0 = flush to top
const FLUSH_TOP_ON_MOBILE = true;       // rounded only on md+; flush top on mobile

/* ---------- Markup ---------- */
function renderNav() {
  const shellRadius = FLUSH_TOP_ON_MOBILE
    ? 'rounded-b-2xl rounded-t-none md:rounded-2xl'
    : 'rounded-2xl';

  return `
  <nav id="appNav" class="sticky z-40"
       style="top: calc(env(safe-area-inset-top, 0px) + ${NAV_TOP_OFFSET_PX}px);">
    <div class="w-full bg-gradient-to-r from-[#0b1a2a] via-[#0f2742] to-[#0b1a2a] text-white ${shellRadius} ring-1 ring-white/10">
      <div class="max-w-6xl mx-auto px-4">
        <div class="h-14 flex items-center justify-between">
          <!-- Left: Brand + Back + Desktop links -->
          <div class="flex items-center gap-3 sm:gap-4 min-w-0">
            <!-- Brand -->
            <a href="/index.html" class="flex items-center gap-3 shrink-0">
              <div class="h-8 w-8 rounded-b-2xl rounded-t-sm bg-white/10 grid place-items-center font-semibold">JM</div>
              <span class="text-[17px] font-semibold tracking-tight truncate">Justice McNeal LLC</span>
            </a>

            <!-- Back chevron (hidden on home) -->
            <button id="navBack"
              class="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition"
              title="Back" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>

            <!-- Desktop links -->
            <div class="hidden md:flex items-center gap-1 sm:gap-2">
              <a href="/pages/account.html"     class="nav-link">Account</a>
              <a href="/pages/contribute.html"  class="nav-link">Contribute</a>
              <a href="/index.html#events"      class="nav-link">Events</a>
              <a href="/index.html#photos"      class="nav-link">Photos</a>
              <a href="/index.html#goals"       class="nav-link">Goals</a>

              <!-- Admin dropdown (admin-only) -->
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

          <!-- Right: Hello {Name} + Avatar + Mobile toggle -->
          <div class="flex items-center gap-2 sm:gap-3">
            <div class="hidden sm:block text-right select-none">
              <div class="text-[11px] opacity-80 leading-tight">Hello</div>
              <div class="text-sm font-medium" id="navHelloName">—</div>
            </div>

            <!-- Avatar / dropdown -->
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
                  <button id="btnSignOut" class="mt-1 w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-rose-50 hover:text-rose-700">Sign out</button>
                </div>
              </div>
            </div>

            <!-- Mobile menu toggle -->
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
      <a href="/pages/account.html"     class="mnav-link">Account</a>
      <a href="/pages/contribute.html"  class="mnav-link">Contribute</a>
      <a href="/index.html#events"      class="mnav-link">Events</a>
      <a href="/index.html#photos"      class="mnav-link">Photos</a>
      <a href="/index.html#goals"       class="mnav-link">Goals</a>

      <!-- Admin (mobile) -->
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
    /* link aesthetics (desktop + mobile) */
    .nav-link{position:relative;padding:.375rem .625rem;border-radius:.5rem;color:rgba(255,255,255,.85);transition:background-color .12s ease,color .12s ease}
    .nav-link:hover{color:#fff;background:rgba(255,255,255,.10)}
    .nav-link.active{color:#fff;background:rgba(255,255,255,.18)}
    .mnav-link{display:block;padding:.875rem .5rem;border-radius:.625rem;font-size:1.0625rem;line-height:1.25rem}
    .mnav-link:hover{background:#f1f5f9}
  </style>
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

/* ---------- Mobile drawer ---------- */
function lockScroll(lock){ document.documentElement.classList.toggle('overflow-hidden', lock); }

function setupMobileDrawer(){
  const btn = $('#mobileMenuBtn');
  const drawer = $('#mobileDrawer');
  const backdrop = $('#navBackdrop');
  const closeBtn = $('#drawerClose');
  const panel = $('#mobileMenu');
  if (!btn || !drawer || !backdrop) return;

  function open(){
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('pointer-events-none');
    requestAnimationFrame(()=>{ backdrop.classList.add('opacity-100'); });
    btn.setAttribute('aria-expanded','true');
    lockScroll(true);
    // focus first item
    const first = panel?.querySelector('a,button');
    first && first.focus({ preventScroll:true });
    document.addEventListener('keydown', onEsc);
  }
  function close(){
    drawer.classList.add('translate-x-full');
    backdrop.classList.remove('opacity-100');
    backdrop.addEventListener('transitionend', () => backdrop.classList.add('pointer-events-none'), { once:true });
    btn.setAttribute('aria-expanded','false');
    lockScroll(false);
    document.removeEventListener('keydown', onEsc);
  }
  function onEsc(e){ if (e.key === 'Escape') close(); }

  btn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  // Close when clicking any mobile link
  $$('.mnav-link', panel).forEach(a => a.addEventListener('click', close));

  // Simple swipe-to-close
  let startX=0, curX=0, dragging=false;
  drawer.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; startX=curX=t.clientX; dragging=true; drawer.style.transition='none'; });
  drawer.addEventListener('touchmove', (e)=>{
    if(!dragging) return; curX = e.touches[0].clientX; const dx = Math.max(0, curX - startX);
    drawer.style.transform = `translateX(${dx}px)`;
  });
  drawer.addEventListener('touchend', ()=>{
    drawer.style.transition=''; dragging=false; const dx = Math.max(0, curX - startX);
    if (dx > 50) close(); else drawer.style.transform='';
  });
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
  toggle.addEventListener('click', () => { panel.classList.toggle('hidden'); });
}

/* ---------- Mount ---------- */
async function mountNavbar() {
  const mount = document.getElementById('navMount');
  if (!mount) return;
  mount.innerHTML = renderNav();

  setActiveLinks();
  setupBackButton();
  setupAvatarMenu();
  setupMobileDrawer();
  setupAdminDropdown();
  setupAdminMobile();
  await showAdminAndProfile();
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  await mountNavbar();
  supabase.auth.onAuthStateChange(() => { mountNavbar(); });
});
