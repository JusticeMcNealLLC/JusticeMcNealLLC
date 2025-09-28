// /js/contribute/state.js
export function createStore(initial = {}) {
let state = structuredClone(initial);
const subs = new Set();
return {
get() { return state; },
/** shallow patch + notify */
patch(p) { state = Object.assign({}, state, p); subs.forEach(fn => fn(state)); },
/** deep set via updater */
set(updater) { state = updater(structuredClone(state)); subs.forEach(fn => fn(state)); },
subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
};
}