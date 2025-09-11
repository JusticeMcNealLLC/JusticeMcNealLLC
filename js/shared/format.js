// /js/shared/format.js
import { APP } from './config.js';

/** Format integer cents → localized currency string */
export function formatCents(cents) {
  const n = Number(cents);
  const dollars = Number.isFinite(n) ? n / 100 : 0;
  return dollars.toLocaleString(APP.locale, {
    style: 'currency',
    currency: APP.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse dollars (string or number) → integer cents */
export function parseDollarsToCents(input) {
  if (input == null) return 0;
  const n = typeof input === 'string'
    ? Number(input.replace(/[^0-9.\-]/g, ''))
    : Number(input);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Format an ISO date or Date → 'MMM d, yyyy' style */
export function formatDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(APP.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Optional extras: */

/** Format a datetime with time included */
export function formatDateTime(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(APP.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format a plain number with locale grouping */
export function formatNumber(n, opts = {}) {
  const num = Number(n);
  return Number.isFinite(num)
    ? num.toLocaleString(APP.locale, opts)
    : '';
}
