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

  // 2) Which page?
  const bodyPage = document.body?.dataset?.page;
  const htmlPage = document.documentElement?.dataset?.page;
  const entry = bodyPage || htmlPage;
  if (!entry) return;

  // 3) Try flat and index patterns
  const tryUrls = [
    new URL(`../pages/${entry}.js`, import.meta.url).href,
    new URL(`../pages/${entry}/index.js`, import.meta.url).href,
  ];

  let loaded = false;
  for (const href of tryUrls) {
    try {
      await import(href);
      loaded = true;
      break;
    } catch {
      // keep trying
    }
  }

  if (!loaded) {
    console.error(`[bootstrap] Failed to load page module "${entry}" from:`, tryUrls);
    toast?.(`Could not load page module: ${entry}`, { type: 'error' });
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[bootstrap] Unhandled promise rejection', e.reason);
});
