// /js/pages/admin/data.js
import { FUNCTIONS } from '/js/shared/config.js';
import { getSb, authedFetch } from '/js/shared/api.js';

/** Who am I (Supabase user) */
export async function whoami() {
  const sb = getSb();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

/** The caller's member row (used for admin gate) */
export async function myMember() {
  const user = await whoami();
  if (!user?.id) return null;
  const sb = getSb();
  const { data, error } = await sb
    .from('members')
    .select('id, is_admin, full_name, email')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** List members with optional filters */
export async function listMembers({ q = '', status = 'all' } = {}) {
  const url = new URL(FUNCTIONS.adminListMembers);
  if (q) url.searchParams.set('q', q);
  if (status && status !== 'all') url.searchParams.set('status', status);

  let r = await authedFetch(url.toString(), { method: 'GET' });
  if (r.status === 405 || r.status === 400) {
    r = await authedFetch(FUNCTIONS.adminListMembers, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, status }),
    });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Failed to list members');
  return { members: Array.isArray(j?.members) ? j.members : j };
}

/** Member details for drawer */
export async function getMemberDetails(memberId) {
  if (!memberId) throw new Error('memberId required');
  // Prefer GET with query param
  const url = new URL(FUNCTIONS.adminGetMember);
  url.searchParams.set('memberId', memberId);
  let r = await authedFetch(url.toString(), { method: 'GET' });
  if (r.status === 405 || r.status === 400) {
    r = await authedFetch(FUNCTIONS.adminGetMember, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Failed to load member');
  return j; // { member, totals, billing, default_payment_method, invoices }
}

/** Open Stripe Billing Portal */
export async function openPortal(memberId) {
  const r = await authedFetch(FUNCTIONS.adminOpenPortal, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Failed to open portal');
  if (j?.url) window.location.href = j.url;
  return j;
}

/** Cancel subscription (mode ∈ 'period_end' | 'now') */
export async function cancelSubscription(memberId, mode = 'period_end') {
  const r = await authedFetch(FUNCTIONS.adminCancelSubscription, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, mode }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Cancel failed');
  return j;
}

/** Resend latest invoice email */
export async function resendInvoice(memberId) {
  const r = await authedFetch(FUNCTIONS.adminResendInvoice, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Resend failed');
  return j;
}
