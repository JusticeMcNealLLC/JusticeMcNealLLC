// /js/pages/admin/memberDrawer.js
import { getMemberDetails, openPortal, cancelSubscription, resendInvoice } from './data.js';
import { toast } from '/js/shared/ui.js';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* inject small drawer styles if needed (reuses global skeleton classes) */
(function injectDrawerStyles(){
  if (document.getElementById('memberDrawerStyles')) return;
  const style = document.createElement('style');
  style.id = 'memberDrawerStyles';
  style.textContent = `
    .drawer-card { border-radius: 0.75rem; border: 1px solid rgba(2,6,23,.08); }
    .drawer-header { position: sticky; top: 0; background: white; z-index: 1; }
    .rowline { border-top: 1px solid rgba(2,6,23,.06); }
    .tabbar { display:flex; border:1px solid rgba(2,6,23,.08); border-radius:0.75rem; overflow:hidden; }
    .tabbar > button { flex:1 1 0; padding:0.5rem 0.75rem; font-weight:600; font-size:0.875rem; }
    .tab--active { background:#f1f5f9; }
  `;
  document.head.appendChild(style);
})();

function ensureDrawerRoot() {
  let el = document.getElementById('memberDrawer');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'memberDrawer';
  el.className = 'fixed inset-0 z-50 hidden';
  document.body.appendChild(el);
  return el;
}

function closeDrawer() {
  const root = ensureDrawerRoot();
  root.classList.add('hidden');
}

function row(label, value) {
  return `
    <div class="flex justify-between text-sm">
      <div class="text-gray-500">${label}</div>
      <div class="font-medium text-gray-900">${value ?? '—'}</div>
    </div>
  `;
}

function moneyCents(c=0){ return `$${((c||0)/100).toFixed(2)}`; }
function fmtDate(x){ return x ? new Date(x).toLocaleDateString() : '—'; }
function fmtDateTime(x){ return x ? new Date(x).toLocaleString() : '—'; }

function renderInvoicesList(invoices=[]) {
  if (!invoices.length) return '<div class="text-sm text-gray-500">No invoices.</div>';
  return `
    <div class="space-y-2 max-h-64 overflow-auto pr-1">
      ${invoices.map(iv => `
        <a class="block border rounded p-2 hover:bg-slate-50 transition-colors" href="${iv.hosted_invoice_url ?? '#'}" target="_blank" rel="noreferrer">
          <div class="flex items-center justify-between text-sm">
            <div class="font-medium">#${iv.number || iv.id}</div>
            <div class="font-medium">${moneyCents((iv.amount_paid ?? iv.amount_due) || 0)}</div>
          </div>
          <div class="text-xs text-gray-500">${iv.status || '—'} • ${iv.created_iso ? new Date(iv.created_iso).toLocaleDateString() : '—'}</div>
        </a>
      `).join('')}
    </div>
  `;
}

function drawerSkeleton() {
  return `
    <div class="space-y-3">
      <div>
        <div class="skel h-6 w-48 mb-2"></div>
        <div class="skel h-4 w-64"></div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="drawer-card p-3 space-y-3">
          <div class="skel h-4 w-20"></div>
          <div class="skel h-4 w-28"></div>
          <div class="skel h-4 w-24"></div>
          <div class="skel h-4 w-24"></div>
          <div class="skel h-4 w-28"></div>
          <div class="skel h-4 w-28"></div>
        </div>
        <div class="drawer-card p-3 space-y-3">
          <div class="skel h-4 w-40"></div>
          <div class="skel h-10 w-full"></div>
          <div class="skel h-10 w-full"></div>
          <div class="skel h-10 w-full"></div>
          <div class="skel h-10 w-full"></div>
        </div>
      </div>

      <div class="drawer-card p-3">
        <div class="skel h-4 w-32 mb-3"></div>
        <div class="space-y-2">
          <div class="skel h-10 w-full"></div>
          <div class="skel h-10 w-full"></div>
          <div class="skel h-10 w-full"></div>
        </div>
      </div>
    </div>
  `;
}

// Helpers for auth + function URL (no CONFIG dependency)
async function getToken(){
  if (window.__api?.getToken) return await window.__api.getToken();
  const { data:{ session } } = await window.supabaseClient.auth.getSession();
  return session?.access_token;
}
function getFnUrl(){
  // Prefer global if you have it; fallback to known project URL (safe to replace with your env)
  return (window.SUPABASE_URL || (window.CONFIG && window.CONFIG.SUPABASE_URL) || 'https://onxkbrjtkparnldcjuqf.supabase.co')
    + '/functions/v1/admin-get-member';
}

// Load paged invoices via POST with cursor/direction
async function fetchInvoicesPage(memberId, direction, cursor, limit=12){
  const token = await getToken();
  const res = await fetch(getFnUrl(), {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
    body: JSON.stringify({ memberId, invoices: { direction, cursor, limit } })
  });
  if(!res.ok) throw new Error(await res.text());
  return res.json(); // returns full payload; we will read .invoices and .invoice_pagination
}

// CSV export of ledger + invoices
function exportPaymentsCsv(memberId, ledger=[], invoices=[]){
  const rows = [
    ['kind','date','amount','currency','status','invoice_id','link','note'],
    ...ledger.map(r => ['ledger', new Date(r.created_at).toISOString(), (r.amount_cents||0)/100, 'USD', r.type||'', r.invoice_id||'', '', r.note||'']),
    ...invoices.map(i => ['invoice', i.created_iso || '', (i.amount_paid ?? i.amount_due)/100, (i.currency || 'usd').toUpperCase(), i.status || '', i.id || '', i.hosted_invoice_url || '', ''])
  ];
  const csv = rows.map(r => r.map(x => String(x).replaceAll('"','""')).map(x => `"${x}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `member_${memberId}_payments.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function openMemberDrawer(memberId) {
  const root = ensureDrawerRoot();
  root.innerHTML = `
    <div class="absolute inset-0 bg-black/40" data-close></div>
    <div class="absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl flex flex-col">
      <div class="drawer-header flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">Member Details</h2>
        <button class="px-3 py-1 rounded border" data-close>Close</button>
      </div>
      <div class="p-4 space-y-4 overflow-y-auto" id="drawerBody">${drawerSkeleton()}</div>
    </div>
  `;
  root.classList.remove('hidden');
  $$('[data-close]', root).forEach(b => b.addEventListener('click', closeDrawer));

  try {
    const data = await getMemberDetails(memberId); // initial load
    renderTabs(root, data, memberId);
    wireActions(root, data.member);
  } catch (e) {
    $('#drawerBody', root).innerHTML = `<div class="text-sm text-red-700">${String(e?.message || e)}</div>`;
  }
}

function renderTabs(root, data, memberId){
  const m = data.member || {};
  const bill = data.billing || {};
  const pm = data.default_payment_method || null;
  const total = (data.totals?.total_contributed_cents ?? 0) / 100;
  const cancelIso = bill.cancel_at_iso || m.membership_cancel_at || null;

  const name = m.full_name || m.email || '—';
  const join = fmtDate(m.membership_started_at);
  const last = fmtDate(m.last_paid_at);
  const next = fmtDateTime(bill.next_billing_iso);

  $('#drawerBody', root).innerHTML = `
    <div class="space-y-4">
      <div>
        <div class="text-xl font-semibold">${name}</div>
        <div class="text-sm text-gray-600">${m.email ?? ''}</div>
        ${m.phone ? `<div class="text-sm text-gray-600">${m.phone}</div>` : ''}
      </div>

      <div class="tabbar">
        <button class="tab tab--active" data-tab="overview">Overview</button>
        <button class="tab" data-tab="payments">Payments</button>
      </div>

      <div data-panel="overview">
        <div class="grid grid-cols-2 gap-3">
          <div class="drawer-card p-3">
            ${row('Status', m.membership_status)}
            ${row('Pledge', moneyCents(m.monthly_contribution_cents))}
            ${row('Join date', join)}
            ${row('Last payment', last)}
            ${row('Next billing', next)}
            ${row('Missed payments', m.missed_payment_count ?? 0)}
            ${row('Total contributed', `$${total.toFixed(2)}`)}
            ${cancelIso ? `<div class="mt-2 text-xs inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5" title="${cancelIso}">
              Cancel scheduled: ${fmtDate(cancelIso)}
            </div>` : ''}
          </div>

          <div class="drawer-card p-3">
            <div class="font-medium mb-2">Default payment method</div>
            ${pm ? `
              <div class="text-sm">
                <div class="font-medium uppercase">${pm.brand ?? 'CARD'} •••• ${pm.last4 ?? '—'}</div>
                <div class="text-gray-600">Exp ${pm.exp_month ?? '--'}/${pm.exp_year ?? '----'}</div>
              </div>
            ` : `<div class="text-sm text-gray-500">No default payment method.</div>`}

            <div class="mt-3 grid gap-2">
              <button class="admin-btn btn-open-portal bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-3 py-2 text-sm">Open Portal</button>
              <button class="admin-btn btn-cancel-pe bg-rose-600/90 hover:bg-rose-700 text-white rounded-md px-3 py-2 text-sm">Cancel at period end</button>
              <button class="admin-btn btn-cancel-now border border-rose-600 text-rose-700 hover:bg-rose-50 rounded-md px-3 py-2 text-sm">Cancel now</button>
              <button class="admin-btn btn-resend border rounded px-3 py-2 text-sm">Resend latest invoice</button>
            </div>
          </div>
        </div>

        <div class="drawer-card p-3">
          <div class="font-medium mb-2">Recent invoices</div>
          ${renderInvoicesList(data.invoices)}
        </div>
      </div>

      <div data-panel="payments" class="hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="drawer-card p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">Ledger</div>
              <button class="px-2 py-1 text-xs border rounded" data-csv>Export CSV</button>
            </div>
            <div class="space-y-2 max-h-72 overflow-auto pr-1" data-ledger>
              ${Array.isArray(data.ledger) && data.ledger.length ? data.ledger.map(r => `
                <div class="p-2 rounded border">
                  <div class="flex items-center justify-between">
                    <div class="text-sm">${moneyCents(r.amount_cents)}</div>
                    <div class="text-xs text-slate-500">${fmtDate(r.created_at)}</div>
                  </div>
                  <div class="text-xs text-slate-600">${r.type || 'entry'}${r.invoice_id ? ` • inv ${r.invoice_id}` : ''}</div>
                  ${r.note ? `<div class="text-xs text-slate-500 mt-1">${r.note}</div>` : ''}
                </div>
              `).join('') : `<div class="text-sm text-gray-500">No ledger entries.</div>`}
            </div>
          </div>

          <div class="drawer-card p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium">Stripe Invoices</div>
              <div class="space-x-2">
                <button data-inv-newer class="px-2 py-1 text-xs border rounded">Newer</button>
                <button data-inv-older class="px-2 py-1 text-xs border rounded">Older</button>
              </div>
            </div>
            <div class="space-y-2 max-h-72 overflow-auto pr-1" data-invoices>
              ${renderInvoicesList(data.invoices)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  const tabs = $$('.tab', root);
  const panels = {
    overview: $('[data-panel="overview"]', root),
    payments: $('[data-panel="payments"]', root),
  };
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      tabs.forEach(t => t.classList.toggle('tab--active', t === btn));
      panels.overview.classList.toggle('hidden', tab !== 'overview');
      panels.payments.classList.toggle('hidden', tab !== 'payments');
    });
  });

  // Payments controls (pagination + CSV)
  const $older = $('[data-inv-older]', root);
  const $newer = $('[data-inv-newer]', root);
  const $invoices = $('[data-invoices]', root);
  const $csv = $('[data-csv]', root);

  let cursors = data.invoice_pagination || { next_cursor:null, prev_cursor:null };
  function setDisabled(){
    if ($older) $older.disabled = !cursors?.next_cursor;
    if ($newer) $newer.disabled = !cursors?.prev_cursor;
  }
  setDisabled();

  async function loadInvoices(direction){
    try{
      const cursor = direction === 'older' ? cursors.next_cursor : cursors.prev_cursor;
      if (!cursor) return;
      const fresh = await fetchInvoicesPage(memberId, direction, cursor, 12);
      cursors = fresh.invoice_pagination || { next_cursor:null, prev_cursor:null };
      $invoices.innerHTML = renderInvoicesList(fresh.invoices || []);
      setDisabled();
    }catch(e){
      console.error(e);
      toast?.(String(e?.message || e), { type:'error' });
    }
  }

  $older?.addEventListener('click', () => loadInvoices('older'));
  $newer?.addEventListener('click', () => loadInvoices('newer'));
  $csv?.addEventListener('click', () => exportPaymentsCsv(memberId, data.ledger || [], data.invoices || []));
}

function wireActions(root, m){
  $('.btn-open-portal', root)?.addEventListener('click', async () => {
    try { await openPortal(m.id); }
    catch (e){ toast?.(String(e?.message || e), { type: 'error' }); }
  });
  $('.btn-cancel-pe', root)?.addEventListener('click', async () => {
    try { await cancelSubscription(m.id, 'period_end'); toast?.('Cancellation scheduled'); closeDrawer(); document.dispatchEvent(new CustomEvent('admin:refresh')); }
    catch (e){ toast?.(String(e?.message || e), { type: 'error' }); }
  });
  $('.btn-cancel-now', root)?.addEventListener('click', async () => {
    try { await cancelSubscription(m.id, 'now'); toast?.('Canceled immediately'); closeDrawer(); document.dispatchEvent(new CustomEvent('admin:refresh')); }
    catch (e){ toast?.(String(e?.message || e), { type: 'error' }); }
  });
  $('.btn-resend', root)?.addEventListener('click', async () => {
    try { await resendInvoice(m.id); toast?.('Invoice email resent'); }
    catch (e){ toast?.(String(e?.message || e), { type: 'error' }); }
  });
}
