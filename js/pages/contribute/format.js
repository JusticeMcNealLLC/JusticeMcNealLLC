// /js/pages/contribute/format.js
// Small formatting utilities for the Contribute page.

/** Currency formatters (cached for common cases). */
const USD2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const USD0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number (dollars) as $X,XXX.XX */
export function fmtUSD(value, opts) {
  const n = Number.isFinite(value) ? value : 0;
  if (opts && typeof opts === 'object') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...opts }).format(n);
  }
  return USD2.format(n);
}

/** Format a number (dollars) as $X,XXX (no decimals). */
export function fmtUSD0(value, opts) {
  const n = Number.isFinite(value) ? value : 0;
  if (opts && typeof opts === 'object') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...opts,
    }).format(n);
  }
  return USD0.format(n);
}

/** Format cents as dollars with 2 decimals (e.g., 678000 -> $6,780.00). */
export function fmtCents(cents, opts) {
  const n = Number.isFinite(cents) ? cents : 0;
  return fmtUSD(n / 100, opts);
}

/** Short local date like "Oct 11, 2025". Accepts UNIX seconds or Date/string. */
export function formatLocalDate(input, locale = 'en-US') {
  let d;
  if (Number.isFinite(input)) d = new Date(input * 1000);
  else if (input instanceof Date) d = input;
  else if (typeof input === 'string') d = new Date(input);
  else return '—';
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Parse a currency-ish string to dollars (number). " $1,250.50 " -> 1250.5 */
export function parseUSD(str) {
  if (typeof str !== 'string') return 0;
  const n = Number(str.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Convenience: convert cents <-> dollars. */
export const centsToDollars = (cents) => (Number(cents) || 0) / 100;
export const dollarsToCents = (dollars) => Math.round((Number(dollars) || 0) * 100);
