// /js/shared/api.js
// Single shared API layer used by all pages (Contribute, History, Admin).
// - One Supabase client for the whole app
// - Token helpers
// - Thin fetch wrappers for Edge Functions (authedFetch / xfetch)
// - Member-facing helpers (status, invoices, portal, contribution)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, FUNCTIONS, APP } from '/js/shared/config.js';

/* ───────────────── Supabase client ───────────────── */

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Get the active Supabase client (prefer one created by bootstrap if present). */
export function getSb() {
  return (window.supabase || window.supabaseClient || supabase);
}

/* ───────────────── Auth / fetch helpers ───────────────── */

export async function getToken() {
  const { data: { session }, error } = await getSb().auth.getSession();
  if (error) throw error;
  const token = session?.access_token;
  if (!token) throw new Error('Please sign in first');
  return token;
}

/** Build a URL with querystring params (skips null/empty). */
export function withQS(url, params = {}) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * Fetch with Supabase bearer token. Returns the raw Response.
 * Use this in admin/data.js when you want to handle parsing yourself.
 */
export async function authedFetch(url, { method = 'GET', headers = {}, body, signal } = {}) {
  const token = await getToken();
  const h = { Authorization: `Bearer ${token}`, ...headers };
  let b = body;
  if (b !== undefined && typeof b !== 'string') {
    h['Content-Type'] = 'application/json';
    b = JSON.stringify(b);
  }
  const res = await fetch(url, { method, headers: h, body: b, signal });
  if (APP?.debug) console.debug('[authedFetch]', method, url, res.status);
  return res;
}

/**
 * Fetch + JSON convenience: throws on !ok with {error|message|statusText}.
 * Use this in member flows where you want parsed JSON + unified errors.
 */
export async function xfetch(url, init = {}) {
  const res = await authedFetch(url, init);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  if (APP?.debug) console.debug('[xfetch]', init.method || 'GET', url, { res: data });
  return data ?? {};
}

/* ───────────────── Member-facing helpers ───────────────── */

export async function whoami() {
  const { data, error } = await getSb().auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

/**
 * Update monthly contribution (dollars).
 * Edge function expects { pledge_dollars }.
 * May return {updated:true} OR {checkout_url} OR {billing_portal_url}.
 */
export async function updateContribution({ new_monthly_dollars }) {
  const amt = Number(new_monthly_dollars);
  if (!Number.isFinite(amt) || amt < 0) throw new Error('Invalid amount');
  const url = FUNCTIONS?.startContribution || `${SUPABASE_URL}/functions/v1/start-contribution`;
  return xfetch(url, { method: 'POST', body: { pledge_dollars: amt } });
}

/**
 * Open Stripe Billing Portal for the signed-in member.
 * Tries a dedicated endpoint if configured, otherwise falls back to start-contribution with { portal_only: true }.
 * Returns { url }.
 */
export async function openBillingPortal() {
  // Try a dedicated portal function if present (optional, not required)
  const manageUrl =
    FUNCTIONS?.openBillingPortal ||
    FUNCTIONS?.manageContribution ||
    null;

  if (manageUrl) {
    try {
      const r = await xfetch(manageUrl, { method: 'POST', body: {} });
      const url = r?.url || r?.billing_portal_url || null;
      if (url) return { url };
    } catch (_) {/* fall through to fallback */}
  }

  // Fallback: ask start-contribution to return a portal session
  const startUrl = FUNCTIONS?.startContribution || `${SUPABASE_URL}/functions/v1/start-contribution`;
  const r2 = await xfetch(startUrl, { method: 'POST', body: { portal_only: true } });
  return { url: r2?.url || r2?.billing_portal_url || null };
}

/** Contribution status snapshot for the signed-in member. */
export async function loadContributionStatus() {
  const url = FUNCTIONS?.contributionStatus || `${SUPABASE_URL}/functions/v1/get-contribution-status`;
  return xfetch(url, { method: 'GET' });
}

/** Recent invoices (simple list). */
export async function getRecentInvoices(limit = 10) {
  const base = FUNCTIONS?.listInvoices || FUNCTIONS?.getInvoices || `${SUPABASE_URL}/functions/v1/list-invoices`;
  const url = withQS(base, { limit });
  return xfetch(url, { method: 'GET' }); // -> { invoices: [...] } or array, depending on your function
}

/** Paged invoices with cursor support. */
export async function getAllInvoices({ limit = 25, starting_after = '' } = {}) {
  const base = FUNCTIONS?.listInvoices || FUNCTIONS?.getInvoices || `${SUPABASE_URL}/functions/v1/list-invoices`;
  const url = withQS(base, { limit, starting_after });
  return xfetch(url, { method: 'GET' }); // -> { invoices, has_more, next_cursor }
}

/* ─────────────── debug handle (optional) ─────────────── */
if (APP?.debug && typeof window !== 'undefined') {
  window.__api = {
    // sb & auth utils
    supabase, getSb, getToken, authedFetch, xfetch, withQS,
    // member flows
    whoami, updateContribution, openBillingPortal,
    loadContributionStatus, getRecentInvoices, getAllInvoices,
  };
}
