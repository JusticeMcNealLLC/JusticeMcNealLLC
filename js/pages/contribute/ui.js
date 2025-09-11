// /js/pages/contribute/ui.js
import { clampPledge, fmtUSD0 } from './validate.js';
import * as skel from '/js/shared/skeletons.js';

const $ = (s) => document.querySelector(s);

/* ───────────────────────── Init ───────────────────────── */
export function init() {
  bindModalButtons();
  bindExplainerToggle();
}

/* ─────────────────── Skeleton toggles ─────────────────── */
export function showStatusSkeleton(show) {
  const sk = document.getElementById('skeletonStatus');
  const real = document.getElementById('statusContent');
  if (!sk || !real) return;
  if (show) { sk.classList.remove('hidden'); real.classList.add('hidden'); }
  else { sk.classList.add('hidden'); real.classList.remove('hidden'); }
}

export function showInvoicesSkeleton(show) {
  const sk = document.getElementById('skeletonInvoices');
  const real = document.getElementById('recentInvoices');
  if (!sk || !real) return;
  if (show) {
    sk.classList.remove('hidden');
    real.classList.add('hidden');
    skel.renderListSkeleton(sk, 3);
  } else {
    sk.classList.add('hidden');
    real.classList.remove('hidden');
    skel.clearListSkeleton(sk);
  }
}

/* ───────────────────────── Busy ───────────────────────── */
export function setBusy(isBusy) {
  skel.setBusy(['#btnOpenConfirm', '#btnConfirmUpdate', '#btnBillingPortal'], isBusy);
}

/* ───────────────────── Explainer toggle ───────────────── */
export function bindExplainerToggle() {
  const btn = $('#explainerToggle');
  const panel = $('#explainerPanel');
  const chev = $('#explainerChevron');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const isHidden = panel.classList.toggle('hidden');
    const open = !isHidden;
    btn.setAttribute('aria-expanded', String(open));
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    if (open) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

/* ─────────────── Inputs, presets & styling ────────────── */
function applyPresetStyles(activeValue) {
  document.querySelectorAll('.preset').forEach(btn => {
    const val = Number(btn.dataset.preset);
    const isActive = val === activeValue;
    btn.className =
      'preset px-3 py-1.5 rounded-md text-sm transition ' +
      (isActive
        ? 'bg-indigo-600 text-white shadow hover:bg-indigo-500'
        : 'bg-gray-100 text-gray-800 hover:bg-gray-200');
  });
}

/** Right pill in amber band (preview: 10% of pledge, e.g. $200 → $20) */
export function updatePledgeAlt(dollars) {
  const alt = document.getElementById('pledgeAlt');
  if (!alt) return;
  const n = Math.max(0, Math.round(Number(dollars || 0) / 10));
  alt.textContent = `$${n}/mo`;
}

export function bindInputs() {
  const slider = $('#pledgeSlider');
  const input  = $('#pledgeInput');

  const syncFromSlider = () => {
    if (input && slider) input.value = slider.value;
    updatePledgeAlt(Number(slider?.value || 0));      // ← keep right pill in sync
    recomputeProjection();
    applyPresetStyles(Number(slider?.value || 0));
  };

  const syncFromInput = () => {
    if (!input || !slider) return;
    const clamped = clampPledge(input.value);
    input.value = clamped || 50;
    slider.value = input.value;
    updatePledgeAlt(Number(input.value));             // ← keep right pill in sync
    recomputeProjection();
    applyPresetStyles(Number(input.value));
  };

  slider?.addEventListener('input', syncFromSlider);

  // live preview while typing; clamp on change
  input?.addEventListener('input', () => updatePledgeAlt(Number(input.value)));
  input?.addEventListener('change', syncFromInput);
}

export function bindPresets() {
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = Number(btn.dataset.preset);
      setPledge(v);            // setPledge will update the right pill
      recomputeProjection();
    });
  });
}

export function setPledge(v) {
  const s = $('#pledgeSlider');
  const i = $('#pledgeInput');
  if (s) s.value = String(v);
  if (i) i.value = String(v);
  updatePledgeAlt(Number(v));   // ← ensure amber right pill updates here too
  applyPresetStyles(Number(v));
}

export function getPledge() {
  return Number($('#pledgeInput')?.value || 0);
}

/* ─────────────────────── Confirm modal ─────────────────── */
let onConfirmCb = null;
let onOpenCb = null;

export function onOpenConfirm(cb) { onOpenCb = cb; }
export function onConfirm(cb)     { onConfirmCb = cb; }

export function showConfirm({ newAmount, currentAmount, nextBilling }) {
  const lines = [
    `<div><strong>New amount:</strong> ${fmtUSD0(newAmount)}/mo</div>`,
    Number.isFinite(currentAmount) && currentAmount > 0
      ? `<div><strong>Current amount:</strong> ${fmtUSD0(currentAmount)}/mo</div>` : '',
    `<div><strong>Effective date:</strong> Next billing date${nextBilling ? ` (${new Date(nextBilling * 1000).toLocaleDateString()})` : ''}.</div>`,
    `<div class="text-gray-600">Your default card on file will be used. No mid-cycle charges.</div>`
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

/* ─────────────────────── Projection ────────────────────── */
export function bindProjection() {
  $('#horizon')?.addEventListener('change', recomputeProjection);
}

export function recomputeProjection() {
  const months = Number($('#horizon')?.value || 6);
  const dollars = clampPledge(getPledge()) || 0;
  const balance = dollars * months;
  const ltv = 0.60;
  const power = balance * ltv;

  const b = $('#projBalance'); if (b) b.textContent = fmtUSD0(balance);
  const p = $('#projPower');   if (p) p.textContent = fmtUSD0(power);
  const l = $('#projLTV');     if (l) l.textContent = `${Math.round(ltv * 100)}%`;
}

/* ─────────────────────── UX helpers ────────────────────── */
export function toast(msg) {
  const el = $('#saveMsg');
  if (!el) return alert(msg);
  el.textContent = msg;
  setTimeout(() => (el.textContent = ''), 5000);
}
