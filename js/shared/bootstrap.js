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
await import(`/js/pages/${entry}.js`);
} catch (err) {
console.error(`[bootstrap] Failed to load /js/pages/${entry}.js`, err);
}
}
});