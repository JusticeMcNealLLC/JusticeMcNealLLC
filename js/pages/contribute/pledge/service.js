// /js/contribute/pledge/service.js
// Wired to your shared API wrappers + Edge functions:
// - loadContributionStatus -> GET get-contribution-status
// - listPaymentMethods -> GET list-payment-methods (fallback summary)
import { loadContributionStatus, listPaymentMethods } from '/js/shared/api.js';


function centsToDollars(c) { return Number.isFinite(+c) ? Math.round(+c) / 100 : 0; }


export async function fetchPledgeSummary() {
const s = await loadContributionStatus();
const m = s?.member || {};


const currentMonthly = centsToDollars(m.monthly_contribution_cents || 0);
const totalContributed = centsToDollars(s?.total_contributed_cents || 0);
const nextBillingDate = s?.next_billing_iso || null;


// Prefer server-provided default PM; fallback to list-payment-methods
let hasDefaultCard = !!s?.has_default_pm;
let cardSummary = '';
if (s?.default_payment_method) {
const pm = s.default_payment_method;
const brand = (pm.brand || 'CARD').toUpperCase();
cardSummary = `${brand} •••• ${pm.last4} exp ${pm.exp_month}/${String(pm.exp_year).slice(-2)}`;
} else if (!hasDefaultCard) {
const pmPayload = await listPaymentMethods().catch(() => ({ data: [] }));
const def = pmPayload?.data?.find(p => p.default);
if (def) {
hasDefaultCard = true;
const brand = (def.brand || 'CARD').toUpperCase();
cardSummary = `${brand} •••• ${def.last4} exp ${def.exp_month}/${String(def.exp_year).slice(-2)}`;
}
}


// return member so header can show name/email
return { member: m, currentMonthly, totalContributed, nextBillingDate, hasDefaultCard, cardSummary };
}
