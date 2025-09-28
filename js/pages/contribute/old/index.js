// /js/pages/contribute/index.js
// Orchestrates the Contribute page by composing small modules.

import { loadContributionStatus } from '/js/shared/api.js';

import { $, show } from './dom.js';
import { updateWhoamiFromStatus } from './identity.js';
import { renderMetrics, setCurrentPledge } from './metrics.js';
import { renderProjection } from './projection.js';
import { bindAmountValidation } from './controls.js';
import { bindCTAs } from './actions.js';
import { fetchActivity, renderActivity } from './activity.js';

/** Hide any lingering skeletons (catches common classes & data hooks). */
function hideAllSkeletons() {
  const sels =
    '#topSkeleton,#activitySkeleton,#recentSkeleton,' +
    '[data-skeleton],.skeleton,.skeleton-card,.animate-pulse';
  document.querySelectorAll(sels).forEach(el => el.classList.add('hidden'));
}

// add near top
function setCtaLabelFromStatus(status) {
  const btn = document.querySelector('#btnOpenConfirm');
  if (!btn) return;
  // active if there’s a live subscription; otherwise “start”
  const subId = status?.member?.stripe_subscription_id || null;
  const active = (status?.member?.membership_status === 'active') && !!subId;
  btn.textContent = active ? 'Update contribution' : 'Start contribution';
  btn.dataset.mode = active ? 'update' : 'start';
}

async function refresh() {
  // Skeletons on (support old IDs during transition)
  const skTop = $('#topSkeleton');
  const skAct = $('#activitySkeleton') || $('#recentSkeleton');
  const ctTop = $('#topContent');
  const ctAct = $('#activityContent') || $('#recentContent');

  show(skTop, true);
  show(skAct, true);
  show(ctTop, false);
  show(ctAct, false);

  try {
    // 1) Load status and identity banner
    const st = await loadContributionStatus();
    setCtaLabelFromStatus(st);
    await updateWhoamiFromStatus(st);

    const pledgeCents =
      st.current_cents ?? st.member?.monthly_contribution_cents ?? 0;

    const totalCents =
      st.total_cents ?? st.total_contributed_cents ?? 0;

    const nextUnix =
      st.next_billing_unix ??
      st.next_billing ??
      (st.next_billing_iso
        ? Math.floor(new Date(st.next_billing_iso).getTime() / 1000)
        : null);

    // Keep internal state + update top metrics
    setCurrentPledge(pledgeCents);
    renderMetrics({ pledgeCents, totalCents, nextBillingUnix: nextUnix });

    // 2) Seed amount input if empty, then recompute projection
    const input = $('#pledgeInput');
    if (input && (!input.value || Number(input.value) <= 0)) {
      input.value = String(Math.max(0, Math.round(pledgeCents / 100)));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    renderProjection();

    // 3) Unified activity feed
    const items = await fetchActivity();
    renderActivity(items);
  } catch (e) {
    console.error('[contribute] refresh failed', e);
    alert(e?.message || 'Could not load contribution info.');
  } finally {
    // Skeletons off (be extra-safe and nuke any loaders that slipped through)
    hideAllSkeletons();
    show(skTop, false);
    show(skAct, false);
    show(ctTop, true);
    show(ctAct, true);
  }
}

export async function boot(force = false) {
  if (window.__contribBooted && !force) return;
  window.__contribBooted = true;

  // Bind inputs & buttons first so validation/CTAs are live
  bindAmountValidation();
  bindCTAs(refresh);

  // First render
  await refresh();
}

// Auto-boot
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => boot());
} else {
  boot();
}
