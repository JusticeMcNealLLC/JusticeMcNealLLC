// /js/contribute/bus.js
export const bus = (() => {
const m = new Map();
return {
on(evt, fn) { (m.get(evt) || m.set(evt, new Set()).get(evt)).add(fn); },
off(evt, fn) { m.get(evt)?.delete(fn); },
emit(evt, payload) { m.get(evt)?.forEach(fn => { try { fn(payload); } catch(e) { console.error(`[bus:${evt}]`, e); } }); }
};
})();