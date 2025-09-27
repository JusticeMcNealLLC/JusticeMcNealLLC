// /js/pages/account/ui.js
import { formatCents as usdFromCents } from '/js/shared/format.js';

const $ = (s, r=document) => r.querySelector(s);

export function setBusy(isBusy) {
  ['btnBillingPortal','btnRefresh','pmManage'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !!isBusy;
    el.classList.toggle('opacity-60', !!isBusy);
    el.classList.toggle('pointer-events-none', !!isBusy);
  });
}

export function setSignedInAs(text='—') {
  const el = $('#accSignedIn');
  if (el) el.textContent = text;
}

export function showSkeletons() {
  const wrap = $('#recentInvoices');
  if (!wrap) return;
  wrap.innerHTML = Array.from({length: 4}).map(() =>
    `<div class="p-3 grid grid-cols-[1fr_auto] gap-2">
       <div>
         <div class="skel h-4 w-48"></div>
         <div class="skel mt-2 h-3 w-24"></div>
       </div>
       <div class="skel h-4 w-20"></div>
     </div>`
  ).join('');
}
export function clearSkeletons() {}

export function renderSummary({ lifetimeCents=0, ytdCents=0, nextCharge='—', paymentMethod='—' }) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('metricLifetime', usdFromCents(lifetimeCents));
  set('metricYTD',      usdFromCents(ytdCents));
  set('metricNextCharge', nextCharge || '—');
  set('metricPayMethod',  paymentMethod || '—');
}

export function renderInvoices(items=[], { total=0, pill } = {}) {
  const wrap = $('#recentInvoices');
  if (!wrap) return;

  if (!items.length) {
    wrap.innerHTML = `<div class="p-3 text-sm text-gray-600">No invoices yet.</div>`;
  } else {
    wrap.innerHTML = items.map((inv) => {
      const date = inv?.created ? new Date(inv.created * 1000).toLocaleDateString() : '';
      const num  = inv?.number || inv?.id || '';
      const left = [date, num].filter(Boolean).join(' · ');
      const amt  = usdFromCents(inv?.amount_paid ?? inv?.amount_due ?? 0);
      const url  = inv?.hosted_invoice_url || inv?.invoice_pdf || '#';
      const status = (inv?.status || '').toLowerCase();

      const statusHTML = pill ? pill(status) : `<span class="text-xs text-gray-500">${status}</span>`;

      return `
        <a class="flex items-center justify-between p-3 hover:bg-gray-50" href="${url}" target="_blank" rel="noopener">
          <div class="flex flex-col">
            <span class="text-sm text-gray-700">${left || num || 'Invoice'}</span>
            <span class="mt-0.5">${statusHTML}</span>
          </div>
          <span class="text-sm font-medium">${amt}</span>
        </a>`;
    }).join('');
  }

  const btnMore = document.getElementById('btnMore');
  if (btnMore) btnMore.classList.toggle('hidden', items.length >= total);
}

/* ---------- Payment Methods UI ---------- */

export function showPmSkeletons() {
  const root = $('#pmList');
  if (!root) return;
  root.innerHTML = Array.from({length: 2}).map(() => `
    <div class="p-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="skel h-6 w-10"></div>
        <div>
          <div class="skel h-4 w-40"></div>
          <div class="skel mt-2 h-3 w-24"></div>
        </div>
      </div>
      <div class="skel h-8 w-28 rounded-md"></div>
    </div>
  `).join('');
}

function fmtPM(pm = {}) {
  const brand = (pm.brand || pm.card_brand || 'Card').toUpperCase();
  const last4 = pm.last4 || pm.card?.last4 || '';
  const mm = pm.exp_month || pm.card?.exp_month;
  const yy = pm.exp_year  || pm.card?.exp_year;
  const exp = (mm && yy) ? ` • ${String(mm).padStart(2,'0')}/${String(yy).slice(-2)}` : '';
  return `${brand} •••• ${last4}${exp}`;
}

export function renderPaymentMethods(list = [], defaultId = null) {
  const root = $('#pmList');
  if (!root) return;

  if (!Array.isArray(list) || list.length === 0) {
    root.innerHTML = `<div class="p-3 text-sm text-gray-600">No saved payment methods.</div>`;
    return;
  }

  root.innerHTML = list.map(pm => {
    const id = pm.id || pm.payment_method_id || '';
    const isDefault = !!(pm.default || id === defaultId);
    const summary = fmtPM(pm);

    return `
      <div class="p-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-md bg-gray-100 grid place-items-center text-xs text-gray-600">${(pm.brand || 'CARD').slice(0,4).toUpperCase()}</div>
          <div>
            <div class="text-sm font-medium text-gray-800">${summary}</div>
            ${isDefault ? `<div class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-600/20">Default</div>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${isDefault
            ? `<button class="rounded-md border border-line bg-white px-3 py-2 text-sm text-gray-400 cursor-not-allowed" disabled>Make default</button>`
            : `<button data-action="make-default" data-id="${id}" class="rounded-md border border-line bg-white px-3 py-2 text-sm hover:bg-gray-50">Make default</button>`
          }
          <button data-action="detach" data-id="${id}" class="rounded-md border border-line bg-white px-3 py-2 text-sm hover:bg-gray-50"${isDefault ? ' disabled title="Cannot remove default"' : ''}>Remove</button>
        </div>
      </div>
    `;
  }).join('');
}
