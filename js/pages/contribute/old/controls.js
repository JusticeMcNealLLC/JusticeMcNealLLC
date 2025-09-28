// /js/pages/contribute/controls.js
import { $, $$ } from './dom.js';
import { renderProjection } from './projection.js';

/** Toggle a global "busy" state (used by actions.js). */
export function setBusy(on) {
  const root = document.querySelector('#contributeRoot') || document.body;
  if (on) root.setAttribute('aria-busy', 'true');
  else root.removeAttribute('aria-busy');

  // Disable primary CTAs while busy
  ['#btnOpenConfirm', '#btnBillingPortal'].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    if (on) {
      el.dataset.prevDisabled = String(el.disabled);
      el.disabled = true;
      el.setAttribute('aria-disabled', 'true');
      el.classList.add('opacity-60', 'pointer-events-none');
    } else {
      if (el.dataset.prevDisabled === 'false') {
        el.disabled = false;
        el.setAttribute('aria-disabled', 'false');
      }
      el.classList.remove('opacity-60', 'pointer-events-none');
      delete el.dataset.prevDisabled;
    }
  });
}

/** Wire up amount input + slider + presets with validation + projection updates. */
export function bindAmountValidation() {
  const input  = $('#pledgeInput');
  const err    = $('#amtError');
  const cta    = $('#btnOpenConfirm');
  const slider = $('#pledgeSlider') || $('#pledgeRange') || document.querySelector('[data-role="pledge-slider"]');

  if (!input || !cta) return;

  const minAttr  = Number(input.min || 50);
  const stepAttr = Number(input.step || 10);

  const min  = Number.isFinite(minAttr) && minAttr > 0 ? minAttr : 50;
  const step = Number.isFinite(stepAttr) && stepAttr > 0 ? stepAttr : 10;

  const setDisabled = (disabled, msg = '') => {
    cta.disabled = !!disabled;
    cta.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (err) {
      err.textContent = msg || '';
      err.classList.toggle('hidden', !msg);
      err.setAttribute('aria-live', 'polite');
    }
  };

  const toNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return 0;
    const n = Number(val.replace?.(/[^\d.-]/g, '') ?? val);
    return Number.isFinite(n) ? n : 0;
  };

  const clampToStep = (val) => {
    let v = Math.max(0, Math.round(toNumber(val)));
    if (v === 0) return 0;
    // Snap to step (down)
    v = Math.floor(v / step) * step;
    // Enforce minimum if non-zero
    if (v > 0 && v < min) v = min;
    return v;
  };

  const validate = () => {
    const raw = toNumber(input.value);
    const hasValue = raw > 0;
    const aligned = (raw % step) === 0;
    const meetsMin = raw >= min;

    // Update projection live as they type
    renderProjection();

    // Visual validity
    input.setAttribute('aria-invalid', (!aligned || !meetsMin) ? 'true' : 'false');

    if (!hasValue)             return setDisabled(true, '');
    if (!meetsMin)             return setDisabled(true, `Minimum is $${min}.`);
    if (!aligned)              return setDisabled(true, `Use increments of $${step}.`);
    return setDisabled(false,  '');
  };

  const applyClamp = () => {
    const v = clampToStep(input.value);
    input.value = String(v || '');
    if (slider) slider.value = String(v || 0);
    renderProjection();
    validate();
  };

  // Input events
  input.addEventListener('input',  validate);
  input.addEventListener('change', applyClamp);
  input.addEventListener('blur',   applyClamp);

  // Initialize state
  validate();

  // Slider → input
  if (slider) {
    slider.addEventListener('input', () => {
      const v = clampToStep(slider.value);
      input.value = String(v || '');
      renderProjection();
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // Presets (.preset, [data-preset], [data-amt])
  $$('.preset, [data-preset], [data-amt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.preset ?? btn.dataset.amt ?? '';
      const v = clampToStep(raw);
      if (!v) return;
      input.value = String(v);
      if (slider) slider.value = String(v);
      renderProjection();
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}
