// /js/pages/admin/api.js
import { FUNCTIONS } from '/js/shared/config.js';
import { getSb, authedFetch } from '/js/shared/api.js';

export async function whoami() {
  const sb = getSb();
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

export async function myMember() {
  const user = await whoami();
  const sb = getSb();
  const { data, error } = await sb
    .from('members')
    .select('id, is_admin, email')
    .eq('auth_user_id', user?.id || '')
    .maybeSingle();
  if (error) throw new Error('Could not load your member record (RLS).');
  return data;
}

export async function fetchMembers({ q = '', status = 'all' } = {}) {
  const u = new URL(FUNCTIONS.adminListMembers);
  if (q) u.searchParams.set('q', q);
  if (status !== 'all') u.searchParams.set('status', status);
  const r = await authedFetch(u.toString());
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Failed to load members.');
  return j; // array
}

export async function openPortal(memberId) {
  const r = await authedFetch(FUNCTIONS.adminOpenPortal, {
    method: 'POST',
    body: JSON.stringify({ memberId })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Portal open failed');
  return j; // { url }
}

export async function cancelSubscription(memberId) {
  const r = await authedFetch(FUNCTIONS.adminCancelSubscription, {
    method: 'POST',
    body: JSON.stringify({ memberId })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Cancel failed');
  return j;
}

export async function resendInvoice(memberId) {
  const r = await authedFetch(FUNCTIONS.adminResendInvoice, {
    method: 'POST',
    body: JSON.stringify({ memberId })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'Resend failed');
  return j; // { sent, message? }
}
