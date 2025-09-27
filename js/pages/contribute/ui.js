// /js/pages/contribute/ui.js
// UI helpers for Contribute page

import { clampPledge, fmtUSD0, wirePledgeValidation } from './validate.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* Skeleton toggles */
export function showStatusSkeleton(show) {
  const sk = $('#topSkeleton'), real = $('#topContent');
  if (!sk || !real) return;
  if (show) { sk.classList.remove('hidden'); real.classList.add('hidden'); }
  else      { sk.classList.add('hidden');    real.classList.remove('hidden'); }
}
export function showInvoicesSkeleton(show) {
  const sk = $('#recentSkeleton'), real = $('#recentContent');
  if (!sk || !real) return;
  if (show) { sk.classList.remove('hidden'); real.classList.add('hidden'); }
  else      { sk.classList.add('hidden');    real.classList.remove('hidden'); }
}

/* Busy state */
export function setBusy(isBusy) {
  ['#btnOpenConfirm','#btnConfirmUpdate','#btnBillingPortal'].forEach(sel => {
    const el=$(sel); if(!el) return;
    el.toggleAttribute('disabled', !!isBusy);
    el.classList.toggle('opacity-60', !!isBusy);
    el.classList.toggle('pointer-events-none', !!isBusy);
  });
}

/* Amount + presets + slider */
export function bindInputs() {
  const input  = $('#pledgeInput');
  // Support multiple possible ids/attributes for the amount slider
  const slider = $('#pledgeSlider') || $('#pledgeRange') || document.querySelector('[data-role="pledge-slider"]');
  const btn    = $('#btnOpenConfirm');

  try { wirePledgeValidation({ input, button: btn, min: 50, max: 2000 }); } catch {}

  const syncFromSlider = () => {
    if (!input || !slider) return;
    input.value = String(slider.value);
    recomputeProjection();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const syncFromInput = () => {
    if (!input) return;
    const v = clampPledge(input.value) || 50;
    input.value = String(v);
    if (slider) slider.value = String(v);
    recomputeProjection();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  slider?.addEventListener('input', syncFromSlider);
  input?.addEventListener('change', syncFromInput);
  input?.addEventListener('input', () => { /* keep live */ });

  // Presets: support .preset, [data-preset], and [data-amt]
  document.querySelectorAll('.preset, [data-preset], [data-amt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.preset ?? btn.dataset.amt;
      const v = clampPledge(raw) || 50;
      setPledge(v);
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

export function setPledge(v) {
  const i = $('#pledgeInput');
  const s = $('#pledgeSlider') || $('#pledgeRange') || document.querySelector('[data-role="pledge-slider"]');
  if (i) i.value = String(v);
  if (s) s.value = String(v);
  recomputeProjection();
}

export function getPledge() {
  return Number($('#pledgeInput')?.value || 0);
}

/* Projection (simple total only) */
export function bindProjection() {
  $('#horizon')?.addEventListener('change', recomputeProjection);
}
export function recomputeProjection() {
  const months  = Number($('#horizon')?.value || 6);
  const dollars = clampPledge(getPledge()) || 0;
  const mEl = $('#projMonths'); if (mEl) mEl.textContent = String(months);
  const rEl = $('#projRate');   if (rEl) rEl.textContent = fmtUSD0(dollars) + '/mo';
  const tEl = $('#projTotal');  if (tEl) tEl.textContent = fmtUSD0(dollars * months);
}

/* Modal plumbing */
let onOpenCb = null, onConfirmCb = null;
export function onOpenConfirm(cb){ onOpenCb = cb; }
export function onConfirm(cb){ onConfirmCb = cb; }

export function showConfirm({ newAmount, currentAmount, nextBilling }) {
  const lines = [
    `<div><strong>New amount:</strong> ${fmtUSD0(newAmount)}/mo</div>`,
    Number.isFinite(currentAmount) && currentAmount > 0 ? `<div><strong>Current amount:</strong> ${fmtUSD0(currentAmount)}/mo</div>` : '',
    `<div><strong>Effective date:</strong> ${nextBilling ? new Date(nextBilling*1000).toLocaleDateString() : 'Next billing date'}.</div>`,
    `<div class="text-gray-600">Your default card will be charged on that date.</div>`
  ].filter(Boolean).join('');
  const body = $('#confirmBody'); if (body) body.innerHTML = lines;
  $('#confirmModal')?.classList.remove('hidden');
}

export function bindModalButtons() {
  $('#btnOpenConfirm')?.addEventListener('click', () => onOpenCb && onOpenCb());
  $('#btnCancelConfirm')?.addEventListener('click', () => $('#confirmModal')?.classList.add('hidden'));
  $('#btnConfirmUpdate')?.addEventListener('click', async () => { 
    $('#confirmModal')?.classList.add('hidden'); 
    if (onConfirmCb) await onConfirmCb(); 
  });
}

/* UX helpers */
export function toast(msg) {
  const el = $('#saveMsg');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => (el.textContent = ''), 5000);
}
