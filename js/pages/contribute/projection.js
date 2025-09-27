import { $ } from './dom.js';
import { fmtUSD } from './format.js';

/** Recompute simple projection (amount × months). */
export function renderProjection() {
  const input    = $('#pledgeInput');
  const monthsEl = $('#projMonths');
  const rateEl   = $('#projRate');
  const totalEl  = $('#projTotal');
  if (!input || !monthsEl || !rateEl || !totalEl) return;

  const slider = $('#horizon');
  const months = Number((slider && slider.value) || monthsEl.textContent || 6);
  const amount = Number(input.value || 0);

  monthsEl.textContent = String(months);
  rateEl.textContent   = `${fmtUSD(amount)}/mo`;
  totalEl.textContent  = fmtUSD(amount * months);

  if (slider && !slider.__wired) {
    slider.__wired = true;
    slider.addEventListener('input', renderProjection);
  }
}
