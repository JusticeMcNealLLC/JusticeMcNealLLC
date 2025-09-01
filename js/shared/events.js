// /js/shared/events.js
const listeners = new Map();


export function onEvent(type, fn) {
if (!listeners.has(type)) listeners.set(type, new Set());
listeners.get(type).add(fn);
return () => listeners.get(type)?.delete(fn);
}


export function emit(type, payload) {
const set = listeners.get(type);
if (set) for (const fn of set) fn(payload);
}