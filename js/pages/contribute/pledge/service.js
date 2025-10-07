// /js/contribute/pledge/service.js
import { xfetch } from '/js/shared/api.js';
import { SUPABASE_URL, FUNCTIONS } from '/js/shared/config.js';

const GET_STATUS_URL =
  FUNCTIONS?.getContributionStatus ||
  `${SUPABASE_URL}/functions/v1/get-contribution-status`;

const START_URL =
  FUNCTIONS?.startContribution ||
  `${SUPABASE_URL}/functions/v1/start-contribution`;

export async function fetchPledgeSummary() {
  // xfetch returns JSON already in your project
  const s = await xfetch(GET_STATUS_URL);

  const cents = (n) => (Number.isFinite(+n) ? +n : 0);
  const toUsd = (c) => Math.round(cents(c) / 100);

  const member = s?.member ?? null;

  // Card summary text
  let cardSummary = null;
  if (s?.default_payment_method?.brand && s?.default_payment_method?.last4) {
    const b = s.default_payment_method.brand;
    const last4 = s.default_payment_method.last4;
    const m = s.default_payment_method;
    const exp = (m.exp_month && m.exp_year) ? ` · exp ${String(m.exp_month).padStart(2,'0')}/${String(m.exp_year).slice(-2)}` : '';
    cardSummary = `${b} •••• ${last4}${exp}`;
  }

  return {
    // keep the raw member for other components
    member,

    // what the page expects (in DOLLARS)
    currentMonthly: toUsd(member?.monthly_contribution_cents),
    totalContributed: toUsd(s?.total_contributed_cents),
    nextBillingDate: s?.next_billing_iso ?? null,

    hasDefaultCard: !!s?.has_default_pm,
    cardSummary,

    // cancel block used by the banner
    cancel: s?.cancel ?? {
      scheduled: false,
      cancel_at_iso: null,
      cancel_at_unix: null,
      cancel_at_period_end: false,
    },
  };
}

/**
 * Update pledge amount or open portal (unchanged behavior).
 * payload: { pledge_dollars, effect_now?, portal_only? }
 * Returns JSON from the edge function.
 */
export async function updatePledge(payload) {
  if (!payload || typeof payload !== 'object') payload = {};
  return xfetch(START_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
