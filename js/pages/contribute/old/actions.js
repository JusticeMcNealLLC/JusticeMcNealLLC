// /js/pages/contribute/actions.js
// Handles CTA actions for the Contribute page.

import {
  updateContribution,
  openBillingPortal,
  recordPledgeChange,
} from '/js/shared/api.js';

import { $ } from './dom.js';
import { formatLocalDate, fmtUSD0 } from './format.js';
import { setBusy } from './controls.js';
import { setCurrentPledge } from './metrics.js';
import { prependActivityItem } from './activity.js';

function getAmountDollars() {
  const v = Number($('#pledgeInput')?.value || 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.round(v)); // whole dollars
}

export function bindCTAs(refreshFn) {
  // Update contribution
 // Update contribution / Start contribution
$('#btnOpenConfirm')?.addEventListener('click', async () => {
  const dollars = getAmountDollars();
  const oldCents = window.__contribLast?.pledgeCents ?? 0;
  const newCents = dollars * 100;
  const now = Math.floor(Date.now() / 1000);

  try {
    setBusy?.(true);

    // Call edge fn (works for both start + update)
    const res = await updateContribution({ new_monthly_cents: newCents });

    // If we got a URL back, this is a "start" (or requires portal) → redirect
    const url = res?.checkout_url || res?.billing_portal_url || res?.url || null;
    if (url) {
      window.location.assign(url);
      return; // don't do optimistic UI or event logging yet
    }

    // In-place update path (res.updated === true)
    setCurrentPledge(newCents);
    prependActivityItem({
      type: 'pledge-change',
      dateUnix: now,
      title: `${formatLocalDate(now)} · Pledge changed`,
      amount: `${fmtUSD0(oldCents / 100)} → ${fmtUSD0(newCents / 100)}`,
      right: `${fmtUSD0(newCents / 100)}/mo`,
      href: null,
    });

    // Persist audit row (non-blocking)
    recordPledgeChange({ oldCents, newCents })
      .catch(err => console.warn('recordPledgeChange failed:', err));

    // Refresh page data
    await refreshFn?.(true);
  } catch (e) {
    alert(e?.message || 'Could not update contribution.');
  } finally {
    setBusy?.(false);
  }
});


  // Optional: “Manage in Billing Portal”
  $('#btnBillingPortal')?.addEventListener('click', async () => {
    try {
      setBusy?.(true);
      const { url } = await openBillingPortal();
      if (url) window.location.assign(url);
    } catch (e) {
      alert(e?.message || 'Could not open billing portal.');
    } finally {
      setBusy?.(false);
    }
  });
}
