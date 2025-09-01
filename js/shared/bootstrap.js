// /js/shared/bootstrap.js
import './config.js';
import { ensureAuthIfRequired } from './auth.js';
import { ready } from './dom.js';
import { initToasts } from './ui.js';

ready(async () => {
  initToasts();
  await ensureAuthIfRequired();

  const entry = document.documentElement.dataset.page; // e.g., "dashboard"
  if (entry) {
    try {
      // ✅ import page modules relative to this file, not site root
      await import(new URL(`../pages/${entry}.js`, import.meta.url));
    } catch (err) {
      console.error(`[bootstrap] Failed to load page module ${entry}`, err);
    }
  }
});
