// /js/contribute/projection/index.js
import { fmtUSD } from '../utils/format.js';

export default function mountProjection({ store, bus }) {
  const els = {
    horizon: document.getElementById('projHorizon'),
    rate:    document.getElementById('projRate'),
    total:   document.getElementById('projTotal'),
  };

  // ---- helpers -------------------------------------------------------------
  const getMonths = () => Math.max(1, parseInt(els.horizon?.value || '6', 10) || 6);

  function getMonthly() {
    const s = store?.get?.() || {};
    // priority: live input from slider → pledge.currentMonthly → member.monthly_contribution_cents
    const live = Number(s.contribInput ?? NaN);
    if (!Number.isNaN(live)) return live;

    if (s.pledge && typeof s.pledge.currentMonthly === 'number') return s.pledge.currentMonthly;

    // cents → dollars fallback
    const cents = s.member?.monthly_contribution_cents ?? s.monthly_contribution_cents;
    if (typeof cents === 'number') return Math.round(cents / 100);

    return 0;
  }

  function getTotalContributedDollars() {
    const s = store?.get?.() || {};

    // Prefer explicit dollar fields if present
    const dollarsFields = [
      s.pledge?.totalContributed,         // dollars (from summary)
      s.totalContributed,                 // dollars (generic)
      s.totals?.totalContributedDollars,  // dollars (alt bucket)
    ].map(Number).find((v) => Number.isFinite(v) && v >= 0);

    if (Number.isFinite(dollarsFields)) return Math.round(dollarsFields);

    // Otherwise look for cents and convert
    const centsFields = [
      s.totals?.totalContributedCents,
      s.totalContributedCents,
      s.member?.total_contributed_cents,
      s.total_contributed_cents,
    ].map(Number).find((v) => Number.isFinite(v) && v >= 0);

    return centsFields ? Math.max(0, Math.round(centsFields / 100)) : 0;
  }

  function renderRate(dollars) {
    if (!els.rate) return;
    els.rate.innerHTML = dollars > 0
      ? `${fmtUSD(dollars)}<span class="text-[12px] font-medium opacity-70 align-top">/mo</span>`
      : '—';
  }

  function renderProjectedTotal(totalDollars) {
    if (!els.total) return;
    els.total.textContent = totalDollars > 0 ? fmtUSD(totalDollars) : '—';
  }

  // ---- main calc -----------------------------------------------------------
  function recalc() {
    const months      = getMonths();
    const monthly     = getMonthly();                     // dollars
    const contributed = getTotalContributedDollars();     // dollars

    renderRate(monthly);

    // contributed-so-far + monthly × horizon
    const projectedTotal = contributed + (monthly * months);
    renderProjectedTotal(projectedTotal);
  }

  // ---- wire events ---------------------------------------------------------
  els.horizon?.addEventListener('change', recalc);

  // From setcontribution/index.js → update when user moves slider
  bus?.on?.('contrib:input:change', () => recalc());

  // When pledge summary loads, mirror fresh numbers (cents or dollars) into the store
  bus?.on?.('pledge:summary:loaded', (payload = {}) => {
    const patch = {};
    if (typeof payload.currentMonthly === 'number') {
      patch.pledge = { ...(store.get()?.pledge || {}), currentMonthly: payload.currentMonthly };
    }

    // Accept either cents or dollars from the summary
    if (typeof payload.totalContributedCents === 'number') {
      patch.totalContributedCents = payload.totalContributedCents;
    } else if (typeof payload.totalContributed === 'number') {
      patch.totalContributedCents = Math.round(payload.totalContributed * 100);
      patch.totalContributed = payload.totalContributed;
    }

    if (Object.keys(patch).length) store?.patch?.((s) => ({ ...s, ...patch }));
    recalc();
  });

  // First paint
  recalc();

  return () => {};
}
