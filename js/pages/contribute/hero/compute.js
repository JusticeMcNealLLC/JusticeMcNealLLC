// Helpers that compute name, CTA label, and cancel state.

/** Choose the best available human name, then fall back to email or "Member". */
export function computeDisplayName(storeState, summary) {
  const s = storeState || {};
  const meta = (s.user && s.user.user_metadata) || {};

  const metaName =
    meta.full_name ||
    meta.name ||
    [meta.given_name, meta.family_name].filter(Boolean).join(' ') ||
    null;

  const best =
    summary?.member?.full_name ||
    s?.member?.full_name ||
    metaName ||
    s?.user?.email ||
    s?.member?.email ||
    'Member';

  return best;
}

/** Do we effectively have a subscription? */
export function hasSubLike(summary, s) {
  const sub = summary?.subscription || summary?.stripe_sub || null;
  const activeish = ['active', 'trialing', 'past_due', 'unpaid'].includes(sub?.status ?? '');
  const hasId = summary?.member?.stripe_subscription_id || s?.member?.stripe_subscription_id || null;
  return !!(activeish || sub || hasId);
}

export function computeMainCta(summary, s) {
  return hasSubLike(summary, s) ? 'Update Contribution' : 'Start Contribution';
}

/** Detect a scheduled cancellation across several shapes (Stripe + DB mirror). */
export function getCancelState(summary, s) {
  const sub = summary?.subscription || summary?.stripe_sub || s?.member?.stripe_subscription || null;

  const dbIso =
    summary?.membership_cancel_at ??
    s?.member?.membership_cancel_at ??
    null;

  const cancelAtSec = sub?.cancel_at ?? null;
  const subIso = cancelAtSec ? new Date(cancelAtSec * 1000).toISOString() : null;

  const willCancel = sub?.cancel_at_period_end === true;
  const ended = sub?.status === 'canceled' || sub?.status === 'incomplete_expired';

  const scheduledIso = dbIso || subIso || null;
  const show = !ended && (willCancel || !!scheduledIso);

  return { show, iso: scheduledIso };
}
