import { togglePair, setBusy } from '/js/shared/skeletons.js';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const qs = (sel) => document.querySelector(sel);
const setHidden = (el, yes) => { if (el) el.classList.toggle('hidden', !!yes); };
const setText   = (el, t)   => { if (el) el.textContent = t ?? ''; };

export const els = {
  name:       qs('#whoami'),
  mainRow:    qs('#rowMainActions'),
  btnUpdate:  qs('#btnOpenConfirm'),
  btnBilling: qs('#btnBillingPortal'),
  cancelRow:  qs('#rowCancelActions'),
  cancelNote: qs('#cancelNote'),
  btnResume:  qs('#btnResume'),
  banner:     qs('#statusBanner'),
};

let bannerTimer = null;

export function init() {
  togglePair('hero', true);
  setBusy([els.btnUpdate, els.btnBilling, els.btnResume], true);
  if (els.btnResume && !els.btnResume.className.includes('inline-flex')) {
    els.btnResume.classList.add('inline-flex');
  }
}

export function reveal({ name, cta, cancelIso }) {
  setText(els.name, name);
  setText(els.btnUpdate, cta);
  renderCancel(cancelIso);
  togglePair('hero', false);
  setBusy([els.btnUpdate, els.btnBilling, els.btnResume], false);
}

function renderCancel(cancelIso) {
  const show = !!cancelIso;
  setHidden(els.cancelRow, !show);
  setHidden(els.cancelNote, !show);
  setHidden(els.btnResume, !show);
  if (show) setText(els.cancelNote, `Cancels on ${fmtDate(cancelIso)}`);
}

export function updateCancel(cancelIso) {
  renderCancel(cancelIso || null);
}

export function showBanner(msg, ms = 3000) {
  if (!els.banner) return;
  els.banner.textContent = msg;
  els.banner.classList.remove('hidden');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => els.banner.classList.add('hidden'), ms);
}

export function dispose() {
  clearTimeout(bannerTimer);
}
