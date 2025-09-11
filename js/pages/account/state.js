let _member = null;
let _currentCents = 0;
let _totalContribCents = 0;
let _nextBilling = null;
let _defaultCard = null;

export function hydrateFromStatus(s = {}) {
  _member = s?.member ?? null;
  _currentCents = Number(s?.member?.monthly_contribution_cents || 0);
  _totalContribCents = Number(s?.total_contributed_cents || 0);
  _nextBilling = s?.next_billing_date ?? null;
  _defaultCard = s?.default_payment_method ?? null;
  return toJSON();
}

export const member = () => _member;
export const currentPledgeCents = () => _currentCents;
export const totalContributedCents = () => _totalContribCents;
export const nextBilling = () => _nextBilling;
export const defaultCard = () => _defaultCard;

export function toJSON() {
  return {
    member: _member,
    currentPledgeCents: _currentCents,
    totalContributedCents: _totalContribCents,
    nextBilling: _nextBilling,
    defaultCard: _defaultCard,
  };
}
