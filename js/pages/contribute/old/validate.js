// Clamp to nearest $10 within 50..2000; return 0 if below min.
export function clampPledge(n) {
  const stepped = Math.round((Number(n) || 0) / 10) * 10;
  const v = Math.max(50, Math.min(2000, stepped));
  return v >= 50 ? v : 0;
}
export function fmtUSD0(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function validatePledgeRaw(value, { min = 50, max = 2000 } = {}) {
  const raw = String(value ?? '').trim();
  const num = Number.parseFloat(raw);
  if (!Number.isFinite(num)) return { ok: false, reason: 'Enter a number (e.g., 50)' };
  if (num <= 0)              return { ok: false, reason: 'Amount must be greater than $0' };
  if (num <  min)            return { ok: false, reason: `Minimum is $${min}/mo` };
  if (num >  max)            return { ok: false, reason: `Maximum is $${max}/mo` };
  const normalized = clampPledge(num);
  if (!normalized)           return { ok: false, reason: `Minimum is $${min}/mo` };
  return { ok: true, normalized };
}

export function wirePledgeValidation({ input, button, errorEl, min = 50, max = 2000 } = {}) {
  if (!input || !button) return;

  let err = errorEl || document.getElementById('amtError');
  if (!err) {
    err = document.createElement('p');
    err.id = 'amtError';
    err.className = 'mt-1 text-sm text-rose-600';
    input.insertAdjacentElement('afterend', err);
  }
  const setDisabled = (d) => {
    button.toggleAttribute('disabled', !!d);
    button.setAttribute('aria-disabled', String(!!d));
    button.classList.toggle('opacity-60', !!d);
    button.classList.toggle('pointer-events-none', !!d);
  };
  const showError = (msg='') => { err.textContent = msg; err.style.display = msg ? '' : 'none'; };
  const check = () => {
    const { ok, reason } = validatePledgeRaw(input.value, { min, max });
    setDisabled(!ok); showError(ok ? '' : reason);
    return ok;
  };

  input.addEventListener('input', check);
  const applyClamp = () => {
    const v = validatePledgeRaw(input.value, { min, max });
    if (v.ok) { input.value = String(v.normalized); check(); input.dispatchEvent(new Event('input', { bubbles: true })); }
    else { check(); }
  };
  input.addEventListener('change', applyClamp);
  input.addEventListener('blur', applyClamp);
  check();
}
