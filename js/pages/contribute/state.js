// /js/pages/contribute/state.js

let _member = null;
let _pendingDollars = null;   // pending amount (UI) in dollars
let _currentCents = 0;        // committed pledge in cents
let _nextBilling = null;      // unix seconds (or null)
let _defaultCard = null;      // { brand, last4, exp_month, exp_year } | null
let _totalContribCents = 0;   // lifetime contributed in cents

/** ── setters ───────────────────────────────────────────── */
export const setMember = (m) => { _member = m || null; };
export const setPendingPledgeDollars = (n) => { _pendingDollars = n == null ? null : Number(n); };
export const setCurrentPledgeCents = (c) => { _currentCents = Number(c || 0); };
export const setNextBilling = (unixSecOrNull) => { _nextBilling = unixSecOrNull ?? null; };
export const setDefaultCard = (pm) => { _defaultCard = pm || null; };
export const setTotalContributedCents = (c) => { _totalContribCents = Number(c || 0); };

/** ── getters ───────────────────────────────────────────── */
export const member = () => _member;
export const pendingPledgeDollars = () => _pendingDollars;
export const currentPledgeCents = () => _currentCents;
export const currentPledgeDollars = () => Math.round(_currentCents / 100);
export const nextBilling = () => _nextBilling;
export const defaultCard = () => _defaultCard;
export const totalContributedCents = () => _totalContribCents;
export const totalContributedDollars = () => Math.round(_totalContribCents / 100);

/** Convenience: hydrate state from the status function payload */
export function hydrateFromStatus(s = {}) {
  setMember(s.member ?? null);
  setCurrentPledgeCents(s.member?.monthly_contribution_cents ?? 0);
  setTotalContributedCents(s.total_contributed_cents ?? 0);
  setNextBilling(s.next_billing_date ?? null);
  setDefaultCard(s.default_payment_method ?? null);
  return toJSON();
}

/** Reset everything (useful on sign-out) */
export function reset() {
  _member = null;
  _pendingDollars = null;
  _currentCents = 0;
  _nextBilling = null;
  _defaultCard = null;
  _totalContribCents = 0;
}

/** Debug helper */
export function toJSON() {
  return {
    member: _member,
    pendingPledgeDollars: _pendingDollars,
    currentPledgeCents: _currentCents,
    nextBilling: _nextBilling,
    defaultCard: _defaultCard,
    totalContributedCents: _totalContribCents,
  };
}
