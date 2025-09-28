// /js/pages/contribute/metrics.js
import { $, setText } from './dom.js';

const usd0 = v =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

export function renderMetrics({ pledgeCents = 0, totalCents = 0, nextBillingUnix = null }) {
  // Save a little snapshot so actions.js can do optimistic UI
  window.__contribLast = {
    ...(window.__contribLast || {}),
    pledgeCents,
    totalCents,
    nextBillingUnix,
  };

  setText($('#currentPledge'), usd0(pledgeCents / 100));
  setText($('#totalContributed'), usd0(totalCents / 100));

  const nextText = nextBillingUnix
    ? new Date(nextBillingUnix * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  setText($('#nextBillingDate'), nextText);
}

// NEW: allow optimistic “Current Pledge” update
export function setCurrentPledge(cents) {
  window.__contribLast = { ...(window.__contribLast || {}), pledgeCents: cents };
  setText($('#currentPledge'), usd0(cents / 100));
}
