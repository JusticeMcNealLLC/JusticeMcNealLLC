// /js/shared/bootstrap.js
import './config.js';
import { ensureAuthIfRequired } from './auth.js';
import { ready } from './dom.js';
import { initToasts, toast } from './ui.js';

let __bootstrapped = false;

ready(async () => {
  if (__bootstrapped) return;
  __bootstrapped = true;

  initToasts();

  // 1) Enforce access first
  await ensureAuthIfRequired();

  // 2) Determine which page to boot
  const entry =
    document.body?.dataset?.page ||
    document.documentElement?.dataset?.page;
  if (!entry) return;

  // 3) Try both patterns (index.js first for foldered pages)
  const tryUrls = [
    new URL(`../pages/${entry}/index.js`, import.meta.url).href,
    new URL(`../pages/${entry}.js`, import.meta.url).href,
  ];

  let loaded = false;
  for (const href of tryUrls) {
    try {
      await import(href);
      loaded = true;
      break;
    } catch (err) {
      // keep trying quietly
    }
  }

  if (!loaded) {
    console.error(
      `[bootstrap] Failed to load page module "${entry}" from:`,
      tryUrls
    );
    toast?.(`Could not load page module: ${entry}`, { kind: 'error' });
  }
});

// Global unhandled-rejection catcher (nice for Supabase fetches)
window.addEventListener('unhandledrejection', (e) => {
  console.error('[bootstrap] Unhandled promise rejection', e.reason);
});
