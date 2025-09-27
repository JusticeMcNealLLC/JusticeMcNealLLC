import { $ } from './dom.js';
import { fmtUSD, formatLocalDate } from './format.js';

export function renderInvoices(list = []) {
  const wrap = $('#recentInvoices');
  if (!wrap) return;

  if (!Array.isArray(list) || !list.length) {
    wrap.innerHTML = `<div class="p-4 text-sm text-gray-500">No contributions yet.</div>`;
    return;
  }

  const rows = list.map(inv => {
    const cents     = inv.amount_paid ?? inv.amount_due ?? 0;
    const amountStr = fmtUSD(cents / 100, { maximumFractionDigits: 2 });

    const dateStr = inv.created ? formatLocalDate(inv.created)
                  : inv.created_at ? formatLocalDate(inv.created_at)
                  : '';

    const num  = inv.number || inv.invoice_number || (inv.id ? inv.id.slice(-8).toUpperCase() : '');
    const title = dateStr && num ? `${dateStr} · ${num}`
                : dateStr        ? dateStr
                : num            ? num
                : 'Invoice';

    const status = String(inv.status || '').replace(/_/g, ' ').toLowerCase() || '—';

    const href   = inv.hosted_invoice_url || inv.invoice_pdf || inv.url || '#';
    const isLink = /^https?:/i.test(href);

    return `
      <a ${isLink ? `href="${href}" target="_blank" rel="noopener"` : 'role="button"'}
         class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
        <div class="min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">${title}</div>
          <div class="text-xs text-gray-500">${status}</div>
        </div>
        <div class="text-sm font-semibold text-right tabular-nums min-w-[5.5rem]">${amountStr}</div>
      </a>
    `;
  }).join('');

  wrap.innerHTML = rows;
}
