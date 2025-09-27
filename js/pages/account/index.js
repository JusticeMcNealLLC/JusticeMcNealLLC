// /js/pages/account/index.js
import { APP } from '/js/shared/config.js';
import * as api from '/js/shared/api.js';
import { initToasts, toast } from '/js/shared/ui.js';
import { statusPill } from '/js/shared/status.js';
import { getStatusSWR } from './data.js';
import * as st from './state.js';
import * as accUI from './ui.js';

const $ = (s, r=document) => r.querySelector(s);

// local paging
const ST = { invoices: [], page: 1, per: 10, pms: [], defaultPmId: null };

function ytdTotalFromInvoices(invoices = []) {
  const year = new Date().getFullYear();
  let cents = 0;
  for (const i of invoices) {
    if (!i) continue;
    const paid = String(i.status).toLowerCase() === 'paid';
    const y = i.created ? new Date(i.created * 1000).getFullYear() : 0;
    if (paid && y === year) cents += (i.amount_paid ?? i.amount_due ?? 0) || 0;
  }
  return cents;
}

function formatPaymentMethod(pm) {
  if (!pm) return '—';
  const brand = (pm.brand || '').toUpperCase();
  const last4 = pm.last4 ? `•••• ${pm.last4}` : '';
  const mm = pm.exp_month ? String(pm.exp_month).padStart(2, '0') : '';
  const yy = pm.exp_year ? String(pm.exp_year).slice(-2) : '';
  const exp = mm && yy ? ` (${mm}/${yy})` : '';
  return [brand, last4].filter(Boolean).join(' ') + exp;
}

function nextChargeFromState() {
  const ts = st.nextBilling?.();
  return ts ? new Date(ts * 1000).toLocaleDateString() : '—';
}

/* ---------- Payment methods: fetch + actions ---------- */

async function fetchPaymentMethodsWithFallback(status) {
  // Prefer backend endpoint if available; else fall back to status payload
  if (typeof api.listPaymentMethods === 'function') {
    const res = await api.listPaymentMethods().catch(() => null);
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    return { list, defaultId: st.defaultCard?.()?.id || status?.default_payment_method_id || status?.invoice_settings?.default_payment_method || null };
  }
  const list = status?.payment_methods || status?.saved_payment_methods || [];
  const defaultId = st.defaultCard?.()?.id || status?.default_payment_method_id || status?.invoice_settings?.default_payment_method || null;
  return { list, defaultId };
}

async function setDefaultPaymentMethod(id) {
  if (typeof api.setDefaultPaymentMethod === 'function') {
    await api.setDefaultPaymentMethod(id);
    toast('Default payment method updated.');
    return;
  }
  toast('Opening Billing Portal to change default…');
  await openBillingPortal();
}

async function detachPaymentMethod(id) {
  if (typeof api.detachPaymentMethod === 'function') {
    await api.detachPaymentMethod(id);
    toast('Card removed.');
    return;
  }
  toast('Use Billing Portal to remove cards.');
  await openBillingPortal();
}

async function openBillingPortal() {
  try {
    if (typeof api.openBillingPortal === 'function') {
      const { url } = await api.openBillingPortal();
      if (url) { location.href = url; return; }
    }
  } catch {}
  location.assign('/pages/contribute.html');
}

/* ---------- Render orchestration ---------- */

function renderAll() {
  // Summary
  const lifetime = st.totalContributedCents?.() ?? 0;
  const ytd      = ytdTotalFromInvoices(ST.invoices);
  const next     = nextChargeFromState();
  const pm       = formatPaymentMethod(st.defaultCard?.());

  accUI.renderSummary({
    lifetimeCents: lifetime,
    ytdCents: ytd,
    nextCharge: next,
    paymentMethod: pm,
  });

  // Invoices
  $('#invCount').textContent = `${ST.invoices.length} total`;
  accUI.renderInvoices(ST.invoices.slice(0, ST.page * ST.per), {
    total: ST.invoices.length,
    pill: statusPill,
  });

  // Payment methods
  accUI.renderPaymentMethods(ST.pms, ST.defaultPmId);
}

async function refresh(forceNetwork = false) {
  accUI.showSkeletons();
  accUI.showPmSkeletons();
  accUI.setBusy(true);

  try {
    // Who am I (email in header)
    const me = await api.whoami?.().catch(() => null);
    accUI.setSignedInAs(me?.email || me?.full_name || '—');

    // Status (server is source of truth for totals)
    const status = await getStatusSWR(async () => {
      return forceNetwork
        ? await api.loadContributionStatus({ cache: 'no-store' })
        : await api.loadContributionStatus();
    });

    st.hydrateFromStatus?.(status || {});

    // Invoices
    const invResp = await api.getRecentInvoices?.().catch(() => ({}));
    ST.invoices = Array.isArray(invResp?.invoices) ? invResp.invoices : [];
    ST.page = 1;

    // Payment methods
    const { list, defaultId } = await fetchPaymentMethodsWithFallback(status || {});
    ST.pms = Array.isArray(list) ? list : [];
    ST.defaultPmId = defaultId || null;

    // Debug (admin only)
    const isAdmin = !!st.member?.()?.is_admin;
    if (typeof accUI.toggleDebug === 'function') {
      accUI.toggleDebug(!!(APP?.debug && isAdmin), { status, invoicesCount: ST.invoices.length, pmCount: ST.pms.length });
    }

    renderAll();
  } catch (e) {
    initToasts?.();
    toast?.(e?.message || 'Failed to load account', { kind: 'error' });
  } finally {
    accUI.setBusy(false);
  }
}

/* ---------- Events ---------- */

function wire() {
  $('#btnRefresh')?.addEventListener('click', () => refresh(true));
  $('#btnBillingPortal')?.addEventListener('click', openBillingPortal);
  $('#pmManage')?.addEventListener('click', openBillingPortal);

  // Payment methods actions (delegate)
  $('#pmList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (!id || !action) return;

    accUI.setBusy(true);
    try {
      if (action === 'make-default') await setDefaultPaymentMethod(id);
      if (action === 'detach')       await detachPaymentMethod(id);
      await refresh(true);
    } finally {
      accUI.setBusy(false);
    }
  });

  $('#btnMore')?.addEventListener('click', () => {
    ST.page += 1;
    accUI.renderInvoices(ST.invoices.slice(0, ST.page * ST.per), {
      total: ST.invoices.length,
      pill: statusPill,
    });
  });
}

function boot() {
  if (window.__acctBooted) return;
  window.__acctBooted = true;

  initToasts?.();
  wire();
  refresh(false);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot, { once: true })
  : boot();
