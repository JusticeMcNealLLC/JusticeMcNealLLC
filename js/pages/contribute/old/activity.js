// /js/pages/contribute/activity.js
// Unified "activity" feed: charges (paid), failed, upcoming, pledge-change,
// plus membership lifecycle events (cancel scheduled/cancelled/resumed).

import { $ } from './dom.js';
import { fmtUSD, fmtUSD0, formatLocalDate } from './format.js';
import { getRecentInvoices, loadContributionStatus } from '/js/shared/api.js';

/* ───────────────── Fetch event rows (all types) ───────────────── */
async function fetchEventRows(limit = 50) {
  try {
    const api = await import('/js/shared/api.js');
    if (typeof api.listActivityEvents === 'function') return await api.listActivityEvents(limit);
    if (typeof api.listPledgeChanges === 'function') return await api.listPledgeChanges(limit); // back-compat
  } catch {}
  return [];
}

/* ───────────────── Normalizers ───────────────── */

function pickUnix(...candidates) {
  for (const v of candidates) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 0; // never use Date.now() for ordering
}

function normalizeInvoices(list = []) {
  if (!Array.isArray(list)) list = Array.isArray(list.invoices) ? list.invoices : [];

  return list.map(inv => {
    // Support both raw Stripe and normalized fields from list-invoices function
    const paidAt    = pickUnix(inv.paid_at_unix, inv?.status_transitions?.paid_at);
    const finalized = pickUnix(inv.finalized_at_unix, inv?.status_transitions?.finalized_at);
    const periodEnd = pickUnix(inv.period_end_unix, inv.period_end, inv?.lines?.data?.[0]?.period?.end);
    const created   = pickUnix(inv.created_unix, inv.created);
    const ts        = pickUnix(paidAt, finalized, periodEnd, created); // strict order

    const cents  = pickUnix(inv.amount_paid, inv.amount_due) || 0; // these are cents already
    const status = String(inv.status || '').toLowerCase();
    const failed = status === 'void' || status === 'uncollectible';
    const type   = failed ? 'failed' : 'charge';

    const amount = fmtUSD(cents / 100, { maximumFractionDigits: 2 });
    const href   = inv.hosted_invoice_url || inv.invoice_pdf || inv.url || null;

    return {
      id: inv.id || null,
      type,
      dateUnix: ts,
      title: `${formatLocalDate(ts)} · ${type === 'charge' ? 'Payment received' : 'Payment failed'}`,
      amount,
      right: amount,
      href,
    };
  });
}

function normalizePledgeChanges(rows = []) {
  return rows
    .filter(r => r.type === 'pledge-change' || !r.type) // BC
    .map(r => {
      const ts   = pickUnix(Math.floor(new Date(r.created_at || r.createdAt || 0).getTime() / 1000));
      const oldD = (r.old_cents || 0) / 100;
      const newD = (r.new_cents || 0) / 100;
      return {
        type: 'pledge-change',
        dateUnix: ts,
        title: `${formatLocalDate(ts)} · Pledge changed`,
        amount: `${fmtUSD0(oldD)} → ${fmtUSD0(newD)}`,
        right: `${fmtUSD0(newD)}/mo`,
        href: null,
      };
    });
}

function normalizeMembershipEvents(rows = []) {
  return rows
    .filter(r => ['sub-cancelled','sub-cancel-scheduled','sub-resumed','payment-failed'].includes(r.type))
    .map(r => {
      const ts = pickUnix(Math.floor(new Date(r.created_at || 0).getTime() / 1000));

      if (r.type === 'sub-cancel-scheduled') {
        const when = pickUnix(r.meta?.cancel_at_unix, r.meta?.cancel_at_iso ? Math.floor(Date.parse(r.meta.cancel_at_iso)/1000) : null);
        const whenStr = when ? formatLocalDate(when) : 'end of period';
        return {
          type: 'upcoming',
          dateUnix: ts,
          title: `${formatLocalDate(ts)} · Cancellation scheduled`,
          amount: `Ends ${whenStr}`,
          right: '',
          href: null,
          _dedupeKey: `sched|${when||''}`,
        };
      }
      if (r.type === 'sub-resumed') {
        return {
          type: 'pledge-change',
          dateUnix: ts,
          title: `${formatLocalDate(ts)} · Cancellation removed`,
          amount: ``,
          right: '',
          href: null,
          _dedupeKey: 'resumed',
        };
      }
      if (r.type === 'payment-failed') {
        const due = r.meta?.amount_due ? fmtUSD((r.meta.amount_due)/100) : '';
        return {
          type: 'failed',
          dateUnix: ts,
          title: `${formatLocalDate(ts)} · Payment failed`,
          amount: due,
          right: due,
          href: null,
          _dedupeKey: `invfail|${r.meta?.invoice_id||''}|${r.meta?.amount_due||''}`,
        };
      }
      // sub-cancelled (immediate)
      return {
        type: 'failed',
        dateUnix: ts,
        title: `${formatLocalDate(ts)} · Membership cancelled`,
        amount: '',
        right: '',
        href: null,
        _dedupeKey: 'cancelled',
      };
    });
}

/** Build an "upcoming" synthetic row from contribution status, if available. */
function synthUpcoming(status) {
  const cents =
    status?.member?.monthly_contribution_cents ??
    status?.current_cents ?? 0;

  const nextUnix =
    pickUnix(status?.next_billing_unix, status?.next_billing_iso ? Math.floor(Date.parse(status.next_billing_iso)/1000) : null);

  if (!cents || !nextUnix) return [];
  if (nextUnix * 1000 < Date.now() - 86_400_000) return []; // hide old "upcoming"

  const dollars = Math.round(cents / 100);
  return [{
    type: 'upcoming',
    dateUnix: nextUnix,
    title: `${formatLocalDate(nextUnix)} · Upcoming charge`,
    amount: `${fmtUSD0(dollars)}/mo`,
    right: `${fmtUSD0(dollars)}/mo`,
    href: null,
    _dedupeKey: `upcoming|${nextUnix}|${dollars}`,
  }];
}

/* ───────────────── Renderers ───────────────── */

function rowHTML(item) {
  const right = item.right || '';
  const href = item.href && /^https?:/i.test(item.href) ? item.href : null;

  const badge =
    item.type === 'pledge-change'
      ? '<span class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Pledge</span>'
      : item.type === 'failed'
      ? '<span class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Failed</span>'
      : item.type === 'upcoming'
      ? '<span class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Upcoming</span>'
      : '<span class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>';

  const row =
    `<div class="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">` +
    `  <div class="min-w-0">` +
    `    <div class="text-sm font-medium text-gray-900 truncate">${item.title}</div>` +
    `    <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">${badge}<span class="truncate">${item.amount || ''}</span></div>` +
    `  </div>` +
    `  <div class="text-sm font-semibold text-right tabular-nums min-w-[5.5rem]">${right}</div>` +
    `</div>`;

  if (href) return `<a href="${href}" target="_blank" rel="noopener">${row}</a>`;
  return row;
}

export function renderActivity(items = []) {
  const wrap = $('#activityList');
  if (!wrap) return;
  if (!Array.isArray(items) || !items.length) {
    wrap.innerHTML = `<div class="p-4 text-sm text-gray-500">No activity yet.</div>`;
    return;
  }
  wrap.innerHTML = items.map(rowHTML).join('');
}

export function prependActivityItem(item) {
  const wrap = $('#activityList');
  if (!wrap) return;
  const html = rowHTML(item);
  if (!wrap.firstElementChild || /No activity/i.test(wrap.textContent)) {
    wrap.innerHTML = html;
  } else {
    wrap.insertAdjacentHTML('afterbegin', html);
  }
}

/* ───────────────── Compose, dedupe, sort ───────────────── */

function dedupe(items) {
  const seen = new Set();
  return items.filter(it => {
    const key =
      it._dedupeKey ||
      `${it.type}|${it.dateUnix}|${it.right||''}|${it.amount||''}|${it.href||''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchActivity() {
  const [status, invoices, eventRows] = await Promise.all([
    loadContributionStatus().catch(() => null),
    getRecentInvoices(25).catch(() => []),
    fetchEventRows(50).catch(() => []),
  ]);

  const items = dedupe([
    ...normalizeInvoices(invoices),
    ...normalizePledgeChanges(eventRows),
    ...normalizeMembershipEvents(eventRows),
    ...synthUpcoming(status),
  ]);

  // newest first, tie-break by type priority
  const TYPE_PRIORITY = { 'upcoming': 3, 'pledge-change': 2, 'charge': 1, 'failed': 0 };

  return items.sort((a, b) =>
    (b.dateUnix - a.dateUnix) ||
    ((TYPE_PRIORITY[b.type] ?? 0) - (TYPE_PRIORITY[a.type] ?? 0))
  );
}
