// /js/pages/contribute/dom.js
// Tiny DOM helpers used by the Contribute page modules.

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Show/hide by toggling the `hidden` class. */
export function show(el, on) {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

/** Set textContent on an element or selector. Returns the element. */
export function setText(target, text = '') {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.textContent = text ?? '';
  return el;
}

/** Set innerHTML on an element or selector. Returns the element. */
export function setHTML(target, html = '') {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.innerHTML = html ?? '';
  return el;
}

/** Back-compat alias for older code that used `put(selector, text)` */
export const put = (sel, text) => setText(sel, text);
