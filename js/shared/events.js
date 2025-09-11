// /js/shared/events.js

const listeners = new Map();

/**
 * Subscribe to an event.
 * @param {string} type - event name (or '*' for all events)
 * @param {Function} fn - handler
 * @returns {Function} unsubscribe
 */
export function onEvent(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => offEvent(type, fn);
}

/** Subscribe to an event once. */
export function onceEvent(type, fn) {
  const off = onEvent(type, (payload) => {
    off();
    fn(payload);
  });
  return off;
}

/** Remove a specific listener. */
export function offEvent(type, fn) {
  listeners.get(type)?.delete(fn);
}

/** Emit an event with optional payload. */
export function emit(type, payload) {
  const fns = [
    ...(listeners.get(type) || []),
    ...(listeners.get('*') || []), // wildcard listeners
  ];
  for (const fn of fns) {
    try {
      fn(payload, type);
    } catch (err) {
      console.error(`[events] error in ${type} handler:`, err);
    }
  }
}

/** Clear all listeners (useful in tests). */
export function clearAllEvents() {
  listeners.clear();
}
