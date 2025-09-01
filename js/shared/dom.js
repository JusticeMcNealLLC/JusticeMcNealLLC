// /js/shared/dom.js
export const $ = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
export const ready = (fn) =>
document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);


export function on(el, event, handler, opts) {
el.addEventListener(event, handler, opts);
return () => el.removeEventListener(event, handler, opts);
}


// Event delegation
export function delegate(root, event, selector, handler) {
return on(root, event, (e) => {
const target = e.target.closest(selector);
if (target && root.contains(target)) handler(e, target);
});
}