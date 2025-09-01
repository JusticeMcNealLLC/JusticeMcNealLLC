// /js/shared/format.js
import { APP } from './config.js';


export function formatCents(cents) {
const dollars = (Number(cents) || 0) / 100;
return dollars.toLocaleString(APP.locale, { style: 'currency', currency: APP.currency });
}


export function parseDollarsToCents(input) {
const n = typeof input === 'string' ? Number(input.replace(/[^0-9.\-]/g, '')) : Number(input);
return Math.round((Number.isFinite(n) ? n : 0) * 100);
}


export function formatDate(iso) {
const d = new Date(iso);
return isNaN(d) ? '' : d.toLocaleDateString(APP.locale, { year: 'numeric', month: 'short', day: 'numeric' });
}