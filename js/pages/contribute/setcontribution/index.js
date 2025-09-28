// /js/contribute/setcontribution/index.js
import { LIMITS, clampToStep } from './validate.js';
import { updatePledge, openBillingPortalSafe } from './service.js';
import { fmtUSD } from '../utils/format.js';

export default function mountSetContribution({ store, bus }) {
  const els = {
    input: document.getElementById('pledgeInput'),
    slider: document.getElementById('pledgeSlider'),
    presets: Array.from(document.querySelectorAll('[data-preset]')),
    amtError: document.getElementById('amtError'),
    openConfirm: document.getElementById('btnOpenConfirm'), // hero CTA
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmBody: document.getElementById('confirmBody'),
    confirmBtn: document.getElementById('btnConfirmUpdate'),
    cancelBtn: document.getElementById('btnCancelConfirm'),
    portalBtn: document.getElementById('btnBillingPortal'),
    saveMsg: document.getElementById('saveMsg'),
  };

  /* ───────────────── state & helpers ───────────────── */
  let hasActive = false; // true when user currently contributes (>0/mo)

  const clamp = (v) => clampToStep(v);

  function setCtaLabel() {
    if (!els.openConfirm) return;
    els.openConfirm.textContent = hasActive ? 'Update Contribution' : 'Start Contribution';
  }

  function highlightPreset(val) {
    const n = Number(val);
    els.presets.forEach((btn) => {
      btn.classList.toggle('is-selected', Number(btn.dataset.preset) === n);
    });
  }

  function setValue(v) {
    const value = clamp(v);
    if (els.input)  els.input.value  = String(value);
    if (els.slider) els.slider.value = String(value);
    highlightPreset(value);
    els.amtError?.classList.add('hidden');

    store.patch({ contribInput: value });
    bus.emit('contrib:input:change', { amount: value });
  }

  function showError() {
    els.amtError?.classList.remove('hidden');
  }

  /* ───────────────── event wiring ───────────────── */
  // Initialize from pledge summary
  const on = bus.on?.bind(bus);
  on && on('pledge:summary:loaded', (s) => {
    const m = Number(s?.currentMonthly || 0);
    hasActive = m >= LIMITS.MIN;
    setCtaLabel();
    if (m) setValue(m);
  });

  // Keep CTA text in sync after successful update
  on && on('pledge:update:success', ({ amount }) => {
    hasActive = Number(amount) >= LIMITS.MIN;
    setCtaLabel();
  });

  // Live sync controls
  els.input?.addEventListener('input', (e) => setValue(e.target.value));
  els.input?.addEventListener('blur',  (e) => setValue(e.target.value)); // snap to step
  els.slider?.addEventListener('input', (e) => setValue(e.target.value));
  els.presets.forEach((btn) =>
    btn.addEventListener('click', () => setValue(btn.dataset.preset))
  );

  // Stripe billing portal
  els.portalBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openBillingPortalSafe();
  });

  // Confirm modal flow
  function openConfirm() {
    const amount = Number(store.get().contribInput || els.input?.value || 0);
    if (amount < LIMITS.MIN || amount > LIMITS.MAX) {
      showError();
      return;
    }
    const verb = hasActive ? 'Update' : 'Start';
    if (els.confirmTitle)
      els.confirmTitle.textContent = `${verb} monthly contribution to ${fmtUSD(amount)}?`;
    if (els.confirmBody)
      els.confirmBody.textContent = hasActive
        ? 'This takes effect on your next billing date.'
        : 'This will start your monthly contribution.';
    els.confirmModal?.classList.remove('hidden');
  }
  function closeConfirm() { els.confirmModal?.classList.add('hidden'); }

  els.openConfirm?.addEventListener('click', openConfirm);
  els.cancelBtn?.addEventListener('click', closeConfirm);

  // Submit update
  els.confirmBtn?.addEventListener('click', async () => {
    const amount = Number(store.get().contribInput || els.input?.value || 0);
    if (amount < LIMITS.MIN || amount > LIMITS.MAX) {
      showError();
      return;
    }

    if (els.saveMsg) els.saveMsg.textContent = 'Saving…';
    els.confirmBtn?.setAttribute('disabled', 'true');

    try {
      const res = await updatePledge(amount); // your start/update endpoint handles both paths
      if (res?.ok) {
        bus.emit('pledge:update:success', { amount });
        // mirror into store (optional)
        store.set((s) => ({
          ...s,
          pledge: { ...(s.pledge || {}), currentMonthly: amount }
        }));
        if (els.saveMsg) els.saveMsg.textContent = 'Updated!';
      } else {
        if (els.saveMsg) els.saveMsg.textContent = 'Failed to update.';
      }
    } catch (e) {
      console.error('[setcontribution] update failed', e);
      if (els.saveMsg) els.saveMsg.textContent = 'Error—try again.';
    } finally {
      closeConfirm();
      els.confirmBtn?.removeAttribute('disabled');
      setTimeout(() => { if (els.saveMsg) els.saveMsg.textContent = ''; }, 1800);
    }
  });

  // Fallback init if summary hasn’t arrived yet
  setCtaLabel();
  if (els.input?.value || els.slider?.value) {
    setValue(els.input?.value || els.slider?.value);
  } else {
    setValue(LIMITS.MIN);
  }

  return () => {};
}
