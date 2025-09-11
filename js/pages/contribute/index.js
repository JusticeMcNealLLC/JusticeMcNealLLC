// /js/pages/contribute/index.js
import { APP } from '/js/shared/config.js';
import * as api from '/js/shared/api.js';
import * as sk from '/js/shared/skeletons.js';
import * as ui from './ui.js';
import * as st from './state.js';

/* ───────────── Debug logger ───────────── */
const dlog = (...args) => { if (APP?.debug) console.log('[contribute]', ...args); };

/* (Optional) Patch fetch logging in dev only */
if (APP?.debug && typeof window !== 'undefined' && !window.__fetchPatched) {
  window.__fetchPatched = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      console.log('[fetch ►]', args[0], args[1]?.method || 'GET');
      const res = await origFetch(...args);
      console.log('[fetch ◄]', res.status, res.url);
      return res;
    } catch (err) {
      console.log('[fetch ✖]', args[0], err?.message || err);
      throw err;
    }
  };
}

const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
});
const usd0FromCents = (cents) => usd0.format((Number(cents) || 0) / 100);

function renderInvoices(invoices = []) {
  const wrap = $('recentInvoices');
  if (!wrap) return;
  if (!invoices.length) {
    wrap.innerHTML = '<div class="p-3 text-sm text-gray-600">No invoices yet.</div>';
    dlog('renderInvoices: empty');
    return;
  }
  wrap.innerHTML = invoices.map(inv => {
    const date = inv?.created ? new Date(inv.created * 1000).toLocaleDateString() : '—';
    const amt = usd0.format(((inv?.amount_paid ?? inv?.amount_due ?? 0) / 100));
    const url = inv?.hosted_invoice_url || inv?.invoice_pdf || '#';
    const num = inv?.number || inv?.id || '—';
    const status = inv?.status || '—';
    return `
      <a class="flex items-center justify-between p-3 hover:bg-gray-50" href="${url}" target="_blank" rel="noopener">
        <div class="flex flex-col">
          <span class="text-sm text-gray-700">${date} · ${num}</span>
          <span class="text-xs text-gray-500">Status: ${status}</span>
        </div>
        <span class="text-sm font-medium">${amt}</span>
      </a>`;
  }).join('');
  dlog('renderInvoices:', invoices.length);
}

async function refresh() {
  const t0 = performance.now();
  dlog('refresh:start');
  sk.togglePair('top', true);
  sk.togglePair('recent', true);

  try {
    // whoami
    const me = await api.whoami().catch(() => null);
    if (me?.email) {
      setText('whoami', me.email);
      dlog('whoami:', me.email);
    } else {
      dlog('whoami: not signed in?');
    }

    // status
    const status = await api.loadContributionStatus().catch((e) => {
      dlog('status: error', e?.message);
      return null;
    });

    const cents = status?.member?.monthly_contribution_cents ?? 0;
    st.setMember(status?.member ?? null);
    st.setCurrentPledgeCents(cents);
    st.setTotalContributedCents(status?.total_contributed_cents ?? 0);
    st.setNextBilling(status?.next_billing_date ?? null);
    st.setDefaultCard(status?.default_payment_method ?? null);

    setText('currentPledge', usd0FromCents(st.currentPledgeCents()));
    setText('totalContributed', usd0FromCents(st.totalContributedCents()));
    setText('nextBillingDate', st.nextBilling()
      ? new Date(st.nextBilling() * 1000).toLocaleDateString()
      : '—');

    dlog('status:', {
      current_cents: st.currentPledgeCents(),
      total_cents: st.totalContributedCents(),
      next_billing: st.nextBilling(),
      has_default_card: !!st.defaultCard(),
    });

    // card chip vs warning
    const warn = $('cardStatus');
    const ok = $('cardSummary');
    const txt = $('cardSummaryTxt');
    const pm = st.defaultCard();
    if (pm) {
      warn?.classList.add('hidden');
      ok?.classList.remove('hidden');
      const brand = pm.brand ? pm.brand[0].toUpperCase() + pm.brand.slice(1) : 'Card';
      const exp = (pm.exp_month && pm.exp_year)
        ? ` exp ${String(pm.exp_month).padStart(2, '0')}/${String(pm.exp_year).slice(-2)}`
        : '';
      if (txt) txt.textContent = `${brand} •••• ${pm.last4 || '••••'}${exp}`;
    } else {
      ok?.classList.add('hidden');
      warn?.classList.remove('hidden');
    }

    // prefill pledge UI (nearest $10, clamp 50..2000)
    const dollars = Math.max(50, Math.min(2000, Math.round((cents / 100) / 10) * 10)) || 50;
    ui.setPledge(dollars);
    ui.recomputeProjection();
    dlog('ui:setPledge', dollars);

    // recent invoices
    const { invoices = [] } = await api.getRecentInvoices().catch((e) => {
      dlog('recent invoices: error', e?.message);
      return {};
    });
    renderInvoices(invoices);
  } catch (e) {
    console.error('[contribute] refresh error', e);
    dlog('refresh:error', e?.message);
  } finally {
    sk.togglePair('top', false);
    sk.togglePair('recent', false);
    dlog('refresh:done in', Math.round(performance.now() - t0), 'ms');
  }
}

function bindActions() {
  // Ensure base UI hooks exist (modal, explainer, inputs, etc.)
  ui.init();
  ui.bindInputs?.();
  ui.bindPresets?.();
  ui.bindProjection?.();
  dlog('bindActions: ui initialized');

  const openBtn = $('btnOpenConfirm');
  const cancelBtn = $('btnCancelConfirm');
  const portalBtn = $('btnBillingPortal');

  dlog('bindActions: elements', {
    hasOpenBtn: !!openBtn,
    hasCancelBtn: !!cancelBtn,
    hasPortalBtn: !!portalBtn
  });

  // When user clicks Update → open confirm
  openBtn?.addEventListener('click', () => {
    const amt = ui.getPledge();
    dlog('update:clicked', {
      pledge_ui_dollars: amt,
      current_cents: st.currentPledgeCents(),
      has_default_card: !!st.defaultCard(),
      next_billing: st.nextBilling()
    });
    ui.showConfirm({
      newAmount: amt,
      currentAmount: Math.round(st.currentPledgeCents() / 100),
      nextBilling: st.nextBilling()
    });
  });

  // Optional: log cancel clicks on the modal
  cancelBtn?.addEventListener('click', () => dlog('update:confirm_cancel'));

  // Confirm modal → call edge function to update contribution
  ui.onConfirm(async () => {
    const newAmount = ui.getPledge(); // dollars
    dlog('update:confirm_submit', { newAmount });

    const t0 = performance.now();
    try {
      ui.setBusy(true);
      const res = await api.updateContribution({ new_monthly_dollars: newAmount });
      const ms = Math.round(performance.now() - t0);
      dlog('update:response', { res, ms });

      if (res?.billing_portal_url) {
        dlog('update:redirect -> billing_portal_url', res.billing_portal_url);
        location.href = res.billing_portal_url;
        return;
      }
      if (res?.checkout_url) {
        dlog('update:redirect -> checkout_url', res.checkout_url);
        location.href = res.checkout_url;
        return;
      }

      dlog('update:acknowledged_no_redirect');
      ui.toast('Contribution updated. Takes effect on next billing.');
      await refresh();
    } catch (e) {
      console.error('[contribute] update error', e);
      dlog('update:error', { message: e?.message, stack: e?.stack });
      ui.toast(e?.message || 'Update failed.');
    } finally {
      ui.setBusy(false);
      dlog('update:flow_finished');
    }
  });

  // Manage in Billing Portal
  portalBtn?.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const t0 = performance.now();
    dlog('portal:clicked');
    try {
      ui.setBusy(true);
      const { url } = await api.openBillingPortal();
      dlog('portal:response', { url, ms: Math.round(performance.now() - t0) });
      if (url) {
        dlog('portal:redirect', url);
        location.href = url;
      } else {
        ui.toast('Could not open billing portal.');
      }
    } catch (e) {
      console.error('[contribute] portal error', e);
      dlog('portal:error', e?.message);
      ui.toast(e?.message || 'Could not open billing portal.');
    } finally {
      ui.setBusy(false);
    }
  });
}

async function boot() {
  dlog('boot');
  // tiny debug handle for console testing
  window.__dbg = Object.assign(window.__dbg || {}, { api, st, ui });
  bindActions();
  await refresh();
}

document.addEventListener('DOMContentLoaded', boot);
