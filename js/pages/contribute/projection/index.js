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
    // cents fields that may exist in your state
    const cents =
      s.totals?.totalContributedCents ??
      s.totalContributedCents ??
      s.member?.total_contributed_cents ??
      s.total_contributed_cents ??
      0;
    return Math.max(0, Math.round(Number(cents || 0) / 100));
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
    const months = getMonths();
    const monthly = getMonthly();                    // dollars
    const contributed = getTotalContributedDollars(); // dollars

    renderRate(monthly);

    const projectedTotal = contributed + (monthly * months);
    renderProjectedTotal(projectedTotal);
  }

  // ---- wire events ---------------------------------------------------------
  els.horizon?.addEventListener('change', recalc);

  // From setcontribution/index.js
  bus?.on?.('contrib:input:change', () => recalc());

  // When summary loads (initial values)
  bus?.on?.('pledge:summary:loaded', (payload = {}) => {
    // If the event provides fresh numbers, mirror them into store so our getters see them
    store?.patch?.((s) => ({
      ...s,
      pledge: {
        ...(s.pledge || {}),
        ...(typeof payload.currentMonthly === 'number'
          ? { currentMonthly: payload.currentMonthly }
          : {}),
      },
      ...(typeof payload.totalContributedCents === 'number'
        ? { totalContributedCents: payload.totalContributedCents }
        : {}),
    }));
    recalc();
  });

  // First paint
  recalc();

  return () => {};
}
