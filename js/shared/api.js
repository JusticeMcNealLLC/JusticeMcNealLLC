// /js/shared/api.js
// Single shared API layer used by all pages (Contribute, History, Admin).
// - One Supabase client for the whole app
// - Token helpers
// - Thin fetch wrappers for Edge Functions (authedFetch / xfetch)
// - Member-facing helpers (status, invoices, portal, contribution, payment methods)
// - Activity events: recordPledgeChange, listActivityEvents, listPledgeChanges

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, FUNCTIONS, APP } from '/js/shared/config.js';

/* ───────────────── Supabase client ───────────────── */

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Prefer a bootstrap-created client if present (dev tooling). */
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


export async function whoami() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function loadContributionSummary() {
  // Use whatever view/RPC you already have; below is a simple members select
  const { data, error } = await supabase
    .from('members')
    .select('membership_status,membership_cancel_at,monthly_contribution_cents,last_paid_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

// /js/shared/api.js
export async function resumeContribution() {
  const url =
    FUNCTIONS?.resumeContribution ||
    `${SUPABASE_URL}/functions/v1/resume-contribution`;
  return xfetch(url, { method: 'POST', body: {} });
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

/**
 * Update monthly contribution.
 * Accepts either:
 *   - { new_monthly_dollars: number }  (preferred)
 *   - { new_monthly_cents: number }    (also supported; converted to dollars)
 * Also accepts legacy shape { pledge_dollars } for compatibility.
 * Edge function expects { pledge_dollars }.
 */
export async function updateContribution(args = {}) {
  let dollars = args.new_monthly_dollars;
  if (args.new_monthly_cents != null && Number.isFinite(args.new_monthly_cents)) {
    dollars = Math.max(0, Math.round(args.new_monthly_cents) / 100);
  }
  if (args.pledge_dollars != null && Number.isFinite(args.pledge_dollars)) {
    dollars = args.pledge_dollars;
  }

  const amt = Number(dollars);
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
  const manageUrl = FUNCTIONS?.openBillingPortal || FUNCTIONS?.manageContribution || null;

  if (manageUrl) {
    try {
      const r = await xfetch(manageUrl, { method: 'POST', body: {} });
      const url = r?.url || r?.billing_portal_url || null;
      if (url) return { url };
    } catch (_) { /* fall through */ }
  }

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
  return xfetch(url, { method: 'GET' }); // -> { invoices: [...] } or array depending on function
}

/** Paged invoices with cursor support. */
export async function getAllInvoices({ limit = 25, starting_after = '' } = {}) {
  const base = FUNCTIONS?.listInvoices || FUNCTIONS?.getInvoices || `${SUPABASE_URL}/functions/v1/list-invoices`;
  const url = withQS(base, { limit, starting_after });
  return xfetch(url, { method: 'GET' }); // -> { invoices, has_more, next_cursor }
}

/* ───────────────── Payment methods ───────────────── */

export async function listPaymentMethods() {
  const endpoint = FUNCTIONS?.listPaymentMethods || `${SUPABASE_URL}/functions/v1/list-payment-methods`;

  const normalize = (payload = {}) => {
    if (Array.isArray(payload)) return { data: payload, default_payment_method_id: null };

    const arr = Array.isArray(payload.data) ? payload.data
      : Array.isArray(payload.payment_methods) ? payload.payment_methods
      : Array.isArray(payload.saved_payment_methods) ? payload.saved_payment_methods
      : [];

    const def = payload.default_payment_method_id
      || payload.invoice_settings?.default_payment_method
      || payload.default_source
      || null;

    const data = arr.map(pm => ({
      id: pm.id || pm.payment_method_id,
      type: pm.type || 'card',
      brand: pm.brand || pm.card_brand || pm.card?.brand || 'card',
      last4: pm.last4 || pm.card_last4 || pm.card?.last4 || '',
      exp_month: pm.exp_month ?? pm.card?.exp_month ?? null,
      exp_year: pm.exp_year ?? pm.card?.exp_year ?? null,
      default: (pm.id || pm.payment_method_id) === def,
    }));

    return { data, default_payment_method_id: def };
  };

  try {
    const r = await xfetch(endpoint, { method: 'GET' });
    return normalize(r);
  } catch (e) {
    if (APP?.debug) console.warn('[listPaymentMethods] fallback to contribution status:', e?.message);
    try {
      const status = await loadContributionStatus();
      return normalize(status || {});
    } catch {
      return { data: [], default_payment_method_id: null };
    }
  }
}

export async function setDefaultPaymentMethod(paymentMethodId) {
  const endpoint = FUNCTIONS?.setDefaultPaymentMethod || `${SUPABASE_URL}/functions/v1/set-default-payment-method`;
  return xfetch(endpoint, { method: 'POST', body: { payment_method_id: paymentMethodId } });
}

export async function detachPaymentMethod(paymentMethodId) {
  const endpoint = FUNCTIONS?.detachPaymentMethod || `${SUPABASE_URL}/functions/v1/detach-payment-method`;
  return xfetch(endpoint, { method: 'POST', body: { payment_method_id: paymentMethodId } });
}

/* ───────────────── Activity / Pledge events ───────────────── */

/** Insert a pledge-change audit row. */
export async function recordPledgeChange({ oldCents, newCents, memberId = null, meta = {} }) {
  const { data: { user } = {} } = await getSb().auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await getSb().from('pledge_events').insert({
    user_id: user.id,
    member_id: memberId ?? null,
    type: 'pledge-change',
    old_cents: Number.isFinite(oldCents) ? Math.round(oldCents) : null,
    new_cents: Number.isFinite(newCents) ? Math.round(newCents) : null,
    meta: meta || {}
  });

  if (error) throw error;
}

/**
 * Fetch recent activity events for the current user (RLS should restrict by user_id = auth.uid()).
 * Default types include pledge changes, cancellations (scheduled/immediate), resume, and payment failures.
 */
export async function listActivityEvents(
  limit = 50,
  types = ['pledge-change','sub-cancelled','sub-cancel-scheduled','sub-resumed','payment-failed']
) {
  const token = await getToken();
  const u = new URL(`${SUPABASE_URL}/rest/v1/pledge_events`);
  u.searchParams.set('select', 'id,type,created_at,old_cents,new_cents,meta');
  u.searchParams.set('order', 'created_at.desc');
  u.searchParams.set('limit', String(limit));
  // PostgREST IN() filter
  u.searchParams.set('type', `in.("${types.join('","')}")`);

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(`events ${res.status} ${res.statusText}`);
  return res.json();
}

/** Back-compat helper that only returns pledge-change rows. */
export async function listPledgeChanges(limit = 20) {
  return listActivityEvents(limit, ['pledge-change']);
}

/* ─────────────── debug handle (optional) ─────────────── */
if (APP?.debug && typeof window !== 'undefined') {
  window.__api = {
    // sb & auth utils
    supabase, getSb, getToken, whoami, authedFetch, xfetch, withQS,
    // member flows
    updateContribution, openBillingPortal,
    loadContributionStatus, getRecentInvoices, getAllInvoices,
    // payment methods
    listPaymentMethods, setDefaultPaymentMethod, detachPaymentMethod,
    // activity events
    recordPledgeChange, listActivityEvents, listPledgeChanges,
  };
}
