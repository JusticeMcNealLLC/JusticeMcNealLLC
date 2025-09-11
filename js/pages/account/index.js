import { APP } from '/js/shared/config.js';
import * as api from '/js/shared/api.js';
import { initToasts, toast } from '/js/shared/ui.js';
import * as st from './state.js';
import * as accUI from './ui.js';

const $ = (id) => document.getElementById(id);
const dlog = (...args) => {
  if (APP?.debug) {
    console.log('[account]', ...args);
    const pre = $('debugLog');
    if (pre) pre.textContent += `${args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); }
      catch { return String(a); }
    }).join(' ')}\n`;
  }
};

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd0FromCents = (c) => usd0.format((Number(c) || 0) / 100);

function togglePair(base, isSkeleton) {
  const sk = $(`${base}Skeleton`);
  const ct = $(`${base}Content`);
  if (!sk || !ct) return;
  if (isSkeleton) { sk.classList.remove('hidden'); ct.classList.add('hidden'); }
  else { sk.classList.add('hidden'); ct.classList.remove('hidden'); }
}

function renderOverview() {
  $('currentPledge').textContent     = usd0FromCents(st.currentPledgeCents());
  $('totalContributed').textContent  = usd0FromCents(st.totalContributedCents());
  $('nextBillingDate').textContent   = st.nextBilling()
    ? new Date(st.nextBilling() * 1000).toLocaleDateString()
    : '—';

  const warn = $('cardStatus');
  const ok   = $('cardSummary');
  const txt  = $('cardSummaryTxt');
  const pm   = st.defaultCard();

  if (pm) {
    warn?.classList.add('hidden');
    ok?.classList.remove('hidden');
    const brand = pm.brand ? pm.brand[0].toUpperCase() + pm.brand.slice(1) : 'Card';
    const exp = (pm.exp_month && pm.exp_year)
      ? ` exp ${String(pm.exp_month).padStart(2,'0')}/${String(pm.exp_year).slice(-2)}`
      : '';
    if (txt) txt.textContent = `${brand} •••• ${pm.last4 || '••••'}${exp}`;
  } else {
    ok?.classList.add('hidden');
    warn?.classList.remove('hidden');
  }
}

function renderInvoices(invoices = []) {
  const wrap = $('recentInvoices');
  if (!wrap) return;
  if (!invoices.length) {
    wrap.innerHTML = '<div class="p-3 text-sm text-gray-600">No invoices yet.</div>';
    return;
  }
  wrap.innerHTML = invoices.map(inv => {
    const date = inv?.created ? new Date(inv.created * 1000).toLocaleDateString() : '—';
    const amt  = usd0FromCents(inv?.amount_paid ?? inv?.amount_due ?? 0);
    const url  = inv?.hosted_invoice_url || inv?.invoice_pdf || '#';
    const num  = inv?.number || inv?.id || '—';
    const stx  = inv?.status || '—';
    return `
      <a class="flex items-center justify-between p-3 hover:bg-gray-50" href="${url}" target="_blank" rel="noopener">
        <div class="flex flex-col">
          <span class="text-sm text-gray-700">${date} · ${num}</span>
          <span class="text-xs text-gray-500">Status: ${stx}</span>
        </div>
        <span class="text-sm font-medium">${amt}</span>
      </a>`;
  }).join('');
}

async function refresh() {
  dlog('refresh:start');
  togglePair('top', true);
  togglePair('recent', true);

  try {
    const me = await api.whoami().catch(() => null);
    if (me?.email) $('whoami').textContent = me.email;
    dlog('whoami', me?.email || '(unknown)');

    const status = await api.loadContributionStatus().catch(e => {
      dlog('status:error', e?.message);
      return null;
    });

    st.hydrateFromStatus(status || {});
    renderOverview();

    const { invoices = [] } = await api.getRecentInvoices().catch(e => {
      dlog('invoices:error', e?.message);
      return {};
    });
    renderInvoices(invoices);
  } catch (e) {
    dlog('refresh:error', e?.message);
    toast(e?.message || 'Error loading account');
  } finally {
    togglePair('top', false);
    togglePair('recent', false);
    dlog('refresh:done');
  }
}

function bindActions() {
  $('btnRefresh')?.addEventListener('click', refresh);

  $('btnBillingPortal')?.addEventListener('click', async () => {
    try {
      accUI.setBusy(true);
      dlog('portal:clicked');
      const { url } = await api.openBillingPortal();
      if (url) {
        dlog('portal:redirect', url);
        location.href = url;
      } else {
        toast('Could not open billing portal.');
      }
    } catch (e) {
      dlog('portal:error', e?.message);
      toast(e?.message || 'Could not open billing portal.');
    } finally {
      accUI.setBusy(false);
    }
  });

  $('btnSignOut')?.addEventListener('click', async () => {
    try {
      await api.supabase.auth.signOut();
    } finally {
      location.href = '/'; // or your sign-in page
    }
  });
}

function boot() {
  initToasts();
  accUI.init();
  bindActions();
  refresh();
}

document.addEventListener('DOMContentLoaded', boot);
