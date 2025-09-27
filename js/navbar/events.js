// /js/navbar/events.js
import { $, on, off, lockScroll, isHome, delegate, once } from './dom.js';

const ESC = 'Escape';
const MD_BREAKPOINT = 768;

function safeFocus(el) { try { el && el.focus({ preventScroll: true }); } catch {} }

// Registry so only one floating menu is open at a time (avatar/admin desktop)
const closers = new Set();
function registerClosable(fn) { closers.add(fn); }
function closeAllMenusExcept(except) { closers.forEach((c) => { if (c !== except) c(); }); }

/**
 * Generic floating menu toggler (for avatar menu & desktop admin)
 */
function setupMenuToggle(btnSel, menuSel, { onOpen, onClose } = {}) {
  const btn = $(btnSel); const menu = $(menuSel);
  if (!btn || !menu) return () => {};

  let open = false;

  const close = () => {
    if (!open) return;
    open = false;
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
    off(document, 'click', onDoc);
    off(document, 'keydown', onEsc);
    onClose && onClose();
  };
  const onDoc = (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); };
  const onEsc = (e) => { if (e.key === ESC) close(); };

  const openMenu = () => {
    closeAllMenusExcept(close);
    open = true;
    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    on(document, 'click', onDoc);
    on(document, 'keydown', onEsc);
    onOpen && onOpen();
  };

  const toggle = () => (open ? close() : openMenu());

  on(btn, 'click', (e) => { e.preventDefault(); toggle(); });
  on(btn, 'keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  registerClosable(close);
  return close;
}

export function setupBackButton() {
  const back = $('#nav-back');
  if (!back) return;
  const sync = () => back.classList.toggle('hidden', isHome());
  sync();
  on(back, 'click', () => {
    if (history.length > 1) history.back();
    else location.assign('/index.html');
  });
  on(window, 'popstate', sync);
}

export function setupAvatarMenu() {
  setupMenuToggle('#nav-avatar', '#nav-profile', {
    onOpen() { safeFocus($('#nav-profile a, #nav-profile button')); }
  });
}

export function setupAdminDesktop() {
  setupMenuToggle('#nav-admin-btn', '#nav-admin-menu');
}

export function setupAdminMobile() {
  const toggle = $('#nav-admin-mobile-toggle');
  const panel  = $('#nav-admin-mobile-menu');
  if (!toggle || !panel) return;

  toggle.setAttribute('aria-controls', 'nav-admin-mobile-menu');
  toggle.setAttribute('aria-expanded', 'false');

  const doToggle = () => {
    const hidden = panel.classList.toggle('hidden');
    toggle.setAttribute('aria-expanded', String(!hidden));
    if (!hidden) safeFocus(panel.querySelector('a'));
  };

  on(toggle, 'click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    doToggle();
  });
  on(toggle, 'keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doToggle(); }
  });
}

export function setupDrawer() {
  const btn      = $('#nav-mobile-toggle');
  const drawer   = $('#nav-drawer');
  const backdrop = $('#nav-backdrop');
  const closeBtn = $('#nav-drawer-close');
  const panel    = $('#nav-mobile-menu');
  if (!btn || !drawer || !backdrop) return;

  const open = () => {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('pointer-events-none');
    requestAnimationFrame(() => backdrop.classList.add('opacity-100'));
    btn.setAttribute('aria-expanded', 'true');
    lockScroll(true);
    safeFocus(panel.querySelector('a,button'));
    on(document, 'keydown', onEsc);
  };
  const close = () => {
    drawer.classList.add('translate-x-full');
    backdrop.classList.remove('opacity-100');
    once(backdrop, 'transitionend', () => backdrop.classList.add('pointer-events-none'));
    btn.setAttribute('aria-expanded', 'false');
    lockScroll(false);
    off(document, 'keydown', onEsc);
    // collapse admin submenu inside drawer
    const t = $('#nav-admin-mobile-toggle');
    const m = $('#nav-admin-mobile-menu');
    if (m && t) { m.classList.add('hidden'); t.setAttribute('aria-expanded', 'false'); }
  };
  const onEsc = (e) => { if (e.key === ESC) close(); };

  on(btn, 'click', open);
  on(closeBtn, 'click', close);
  on(backdrop, 'click', close);

  // Close drawer only on real links (<a>), not on buttons (e.g., Admin toggle)
  delegate(panel, 'click', 'a[href]', () => close());

  // Swipe-to-close
  let startX = 0, curX = 0, dragging = false;
  on(drawer, 'touchstart', (e) => {
    const t = e.touches[0]; startX = curX = t.clientX; dragging = true; drawer.style.transition = 'none';
  });
  on(drawer, 'touchmove', (e) => {
    if (!dragging) return;
    curX = e.touches[0].clientX;
    const dx = Math.max(0, curX - startX);
    drawer.style.transform = `translateX(${dx}px)`;
  });
  on(drawer, 'touchend', () => {
    drawer.style.transition = ''; dragging = false;
    const dx = Math.max(0, curX - startX);
    if (dx > 50) close(); else drawer.style.transform = '';
  });

  // Auto-close drawer if viewport grows to desktop
  on(window, 'resize', () => { if (window.innerWidth >= MD_BREAKPOINT) close(); });
}

export function initMenusAndDrawer() {
  setupBackButton();
  setupAvatarMenu();
  setupAdminDesktop();
  setupAdminMobile();
  setupDrawer();
}
