// /js/shared/storage.js

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[store.get] Failed to parse key "${key}"`, err);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[store.set] Failed to set key "${key}"`, err);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`[store.remove] Failed to remove key "${key}"`, err);
    }
  },

  /** Remove everything */
  clear() {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('[store.clear] Failed to clear localStorage', err);
    }
  },

  /** Namespaced store: returns a wrapper with key prefix */
  namespace(prefix) {
    return {
      get: (k, fb) => store.get(`${prefix}:${k}`, fb),
      set: (k, v) => store.set(`${prefix}:${k}`, v),
      remove: (k) => store.remove(`${prefix}:${k}`),
    };
  },
};
