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

function renderInvoices(invoices=[]) {
  if (!invoices.length) return '<div class="text-sm text-gray-500">No recent invoices.</div>';
  return `
    <div class="space-y-2 max-h-64 overflow-auto pr-1">
      ${invoices.map(iv => `
        <div class="flex items-center justify-between text-sm border rounded p-2 hover:bg-slate-50 transition-colors">
          <div>
            <div class="font-medium">${iv.created_iso ? new Date(iv.created_iso).toLocaleString() : '—'}</div>
            <div class="text-gray-500">${iv.status || '—'}</div>
          </div>
          <div class="text-right">
            <div class="font-medium">$${((iv.amount_due ?? 0)/100).toFixed(2)}</div>
            ${iv.hosted_invoice_url ? `<a class="underline text-indigo-700" href="${iv.hosted_invoice_url}" target="_blank" rel="noreferrer">View</a>` : ''}
          </div>
        </div>
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
    const data = await getMemberDetails(memberId);
    const m = data.member || {};
    const bill = data.billing || {};
    const pm = data.default_payment_method || null;
    const total = (data.totals?.total_contributed_cents ?? 0) / 100;

    const name = m.full_name || m.email || '—';
    const join = m.membership_started_at ? new Date(m.membership_started_at).toLocaleDateString() : '—';
    const last = m.last_paid_at ? new Date(m.last_paid_at).toLocaleDateString() : '—';
    const next = bill.next_billing_iso ? new Date(bill.next_billing_iso).toLocaleString() : '—';
    const cancelIso = bill.cancel_at_iso || m.membership_cancel_at || null;

    $('#drawerBody', root).innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-xl font-semibold">${name}</div>
          <div class="text-sm text-gray-600">${m.email ?? ''}</div>
          ${m.phone ? `<div class="text-sm text-gray-600">${m.phone}</div>` : ''}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="drawer-card p-3">
            ${row('Status', m.membership_status)}
            ${row('Pledge', `$${((m.monthly_contribution_cents ?? 0)/100).toFixed(2)}`)}
            ${row('Join date', join)}
            ${row('Last payment', last)}
            ${row('Next billing', next)}
            ${row('Missed payments', m.missed_payment_count ?? 0)}
            ${row('Total contributed', `$${total.toFixed(2)}`)}
            ${cancelIso ? `<div class="mt-2 text-xs inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5" title="${cancelIso}">
              Cancel scheduled: ${new Date(cancelIso).toLocaleDateString()}
            </div>` : ''}
          </div>

          <div class="drawer-card p-3">
            <div class="font-medium mb-2">Default payment method</div>
            ${pm ? `
              <div class="text-sm">
                <div class="font-medium uppercase">${pm.brand ?? '—'} •••• ${pm.last4 ?? '—'}</div>
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
          ${renderInvoices(data.invoices)}
        </div>
      </div>
    `;

    // Actions
    $('.btn-open-portal', root)?.addEventListener('click', async () => {
      try { await openPortal(m.id); } catch (e){ toast?.(String(e?.message || e), { type: 'error' }); }
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

  } catch (e) {
    $('#drawerBody', root).innerHTML = `<div class="text-sm text-red-700">${String(e?.message || e)}</div>`;
  }
}
