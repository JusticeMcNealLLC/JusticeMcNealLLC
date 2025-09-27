// /js/navbar/dom.js
// Tiny DOM utilities for the navbar — robust link activation & scroll locking.

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const on  = (el, type, fn, opts) => el && el.addEventListener(type, fn, opts);
export const off = (el, type, fn, opts) => el && el.removeEventListener(type, fn, opts);

// Add a one-time listener (auto-removes after first call)
export const once = (el, type, fn, opts) =>
  el && el.addEventListener(type, (e) => fn(e), { ...opts, once: true });

// Event delegation helper
export const delegate = (root, type, selector, handler, opts) =>
  on(root, type, (e) => {
    const target = e.target && e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  }, opts);

// ===== Scroll lock (with scrollbar compensation to avoid layout shift) =====
const html = document.documentElement;
let scrollLocked = false;
let prevOverflow = '';
let prevPaddingRight = '';

export function lockScroll(lock) {
  const wantLock = !!lock;
  if (wantLock === scrollLocked) return; // idempotent
  scrollLocked = wantLock;

  if (wantLock) {
    const scrollbarW = window.innerWidth - html.clientWidth;
    prevOverflow = html.style.overflow;
    prevPaddingRight = html.style.paddingRight;
    html.style.overflow = 'hidden';
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`;
    html.classList.add('overflow-hidden'); // keeps Tailwind-friendly hook if you use it
  } else {
    html.style.overflow = prevOverflow;
    html.style.paddingRight = prevPaddingRight;
    html.classList.remove('overflow-hidden');
  }
}

// ===== Path helpers =====
export const normalizePath = (pathname = '/') => {
  let p = String(pathname).replace(/\/+$/, '');
  if (p === '') p = '/';
  if (p.endsWith('/index.html')) p = p.slice(0, -'/index.html'.length) || '/';
  return p;
};

export const isHome = () => normalizePath(location.pathname) === '/';
export const isSamePath = (a, b) => normalizePath(a) === normalizePath(b);

// ===== Active link highlighting =====
export function setActiveLinks(opts = {}) {
  const {
    selectors = ['.nav-link', '.mnav-link', '#nav-admin-menu a'],
    activeClass = 'active',
  } = opts;

  const curURL  = new URL(location.href);
  const curPath = normalizePath(curURL.pathname);
  const curHash = curURL.hash;

  const nodes = selectors.flatMap((sel) => $$(sel));
  nodes.forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) { a.classList.remove(activeClass); return; }

    let url;
    try { url = new URL(href, location.href); }
    catch { a.classList.remove(activeClass); return; }

    const linkPath = normalizePath(url.pathname);
    const linkHash = url.hash;

    let active = false;
    if (linkHash) {
      // For hash-links, require same path (often home) AND matching hash
      active = isSamePath(linkPath, curPath) && curHash === linkHash;
    } else {
      active = isSamePath(linkPath, curPath);
    }

    a.classList.toggle(activeClass, active);
  });
}
