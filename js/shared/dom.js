// /js/shared/dom.js

// Query helpers
export const $  = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

// Ready: callback OR Promise
export function ready(fn) {
  const run = () => { try { fn(); } catch (e) { console.error('[ready]', e); } };
  if (document.readyState === 'loading') {
    const handler = () => { document.removeEventListener('DOMContentLoaded', handler); run(); };
    document.addEventListener('DOMContentLoaded', handler, { once: true });
  } else {
    queueMicrotask(run);
  }
}
export const whenReady = () =>
  document.readyState === 'loading'
    ? new Promise(res => document.addEventListener('DOMContentLoaded', () => res(), { once: true }))
    : Promise.resolve();

// on(): supports single or multiple events + returns an unsubscribe
export function on(el, events, handler, opts) {
  if (!el) {
    // element missing → no-op unsubscribe
    return () => {};
  }
  const list = Array.isArray(events) ? events : String(events).split(/\s+/).filter(Boolean);
  list.forEach(evt => el.addEventListener(evt, handler, opts));
  return () => list.forEach(evt => el.removeEventListener(evt, handler, opts));
}

// Event delegation with Shadow DOM friendliness
export function delegate(root, event, selector, handler, opts) {
  if (!root) return () => {};
  const listener = (e) => {
    const path = e.composedPath ? e.composedPath() : null;
    if (path) {
      for (const node of path) {
        if (node && node.nodeType === 1 && node.matches && node.matches(selector)) {
          if (root.contains(node) || node === root) return handler(e, node);
        }
        if (node === root) break;
      }
      return;
    }
    let el = e.target && e.target.nodeType === 1 ? e.target : null;
    while (el && el !== root) {
      if (el.matches && el.matches(selector)) return handler(e, el);
      el = el.parentElement;
    }
    if (root.matches && root.matches(selector)) return handler(e, root);
  };
  return on(root, event, listener, opts);
}

// Small extras
export const toggle = (el, cls, force) => el && el.classList.toggle(cls, force);
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style' && v && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) el.append(c?.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
