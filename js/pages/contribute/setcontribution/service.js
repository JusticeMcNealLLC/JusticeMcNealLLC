// /js/contribute/setcontribution/service.js
// Handles all paths from the start-contribution function:
// - New/fully-canceled -> returns { checkout_url } -> redirect to Stripe Checkout
// - Missing default PM -> returns { billing_portal_url } -> redirect to Portal
// - Active sub update -> returns { updated: true } -> stay on page, show "Updated!"
import {
  updateContribution as _update,
  openBillingPortal as _openPortal,
  recordPledgeChange,
} from '/js/shared/api.js';

/**
 * Update the pledge (monthly dollars).
 * Returns { ok: true, mode: 'updated'|'checkout'|'portal' } or { ok:false, error }
 */
export async function updatePledge(amount) {
  const dollars = +amount;
  try {
    // Best-effort audit log
    try { await recordPledgeChange({ newCents: Math.round(dollars * 100) }); } catch {}

    // Call your edge function via shared API
    const res = await _update({ new_monthly_dollars: dollars });

    // --- Normalize and act on server responses ---
    if (res?.checkout_url) {
      // Fresh (re)start via Checkout
      // allow the caller to show a "Redirecting…" message briefly if desired
      location.href = res.checkout_url;
      return { ok: true, mode: 'checkout' };
    }
    if (res?.billing_portal_url || res?.url) {
      // Missing default PM or portal-only path
      location.href = res.billing_portal_url || res.url;
      return { ok: true, mode: 'portal' };
    }
    if (res?.updated) {
      // Active subscription quantity updated in place
      return { ok: true, mode: 'updated' };
    }
    if (res?.error) {
      return { ok: false, error: res.error };
    }
    // Unknown/mismatched payload
    return { ok: false, error: 'Unexpected response from server.' };
  } catch (e) {
    console.error('[updatePledge] failed', e);
    return { ok: false, error: String(e?.message || e) };
  }
}

/**
 * Always try to open Portal. If the dedicated endpoint ever fails,
 * fall back to asking start-contribution for a portal-only session.
 */
export async function openBillingPortalSafe() {
  try {
    const r = await _openPortal();
    const url = r?.url || r?.billing_portal_url;
    if (url) { location.href = url; return; }
  } catch {}
  try {
    const r2 = await _update({ portal_only: true });
    const url2 = r2?.url || r2?.billing_portal_url;
    if (url2) { location.href = url2; return; }
  } catch (e) {
    console.error('[openBillingPortalSafe] failed', e);
  }
  alert('Unable to open billing portal right now. Please try again.');
}
