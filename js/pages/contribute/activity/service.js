// /js/contribute/activity/service.js
import { getRecentInvoices, listActivityEvents } from '/js/shared/api.js';

const centsToDollars = (c) => (Number.isFinite(+c) ? Math.round(+c) / 100 : 0);
const pickDate = (ix) => (
  ix?.status_transitions?.paid_at ||
  ix?.created ||
  ix?.period_end ||
  ix?.created_at || null
);
const statusToType = (inv) => {
  const st = String(inv?.status || '').toLowerCase();
  if (st === 'paid') return 'paid';
  if (['open', 'draft', 'unpaid', 'upcoming'].includes(st)) return 'upcoming';
  if (['void', 'uncollectible'].includes(st)) return 'failed';
  return 'event';
};

export async function fetchActivity() {
  // Invoices → normalize
  const invoicePayload = await getRecentInvoices(12);
  const invoices = Array.isArray(invoicePayload?.invoices)
    ? invoicePayload.invoices
    : Array.isArray(invoicePayload) ? invoicePayload : [];

  const invoiceItems = invoices.map(ix => {
    const type = statusToType(ix);
    const amount = centsToDollars(ix.amount_paid ?? ix.amount_due ?? ix.total ?? 0);
    return {
      type,
      title: type === 'paid' ? 'Payment received'
           : type === 'upcoming' ? 'Upcoming charge'
           : type === 'failed' ? 'Payment failed' : 'Invoice',
      date: pickDate(ix), // seconds
      periodStart: ix.period_start ?? null,
      periodEnd: ix.period_end ?? null,
      amount,
      amountKind: type === 'paid' ? 'oneoff' : 'monthly',
      id: ix.id,
      url: ix.hosted_invoice_url || ix.invoice_pdf || ix.receipt_url || null
    };
  });

  // Events → preserve TRUE type + meta
  const events = await listActivityEvents(50);
  const eventItems = (events || []).map(ev => {
    const t = String(ev.type || '').toLowerCase();
    const oldCents = Number.isFinite(ev.old_cents) ? Math.round(ev.old_cents) : null;
    const newCents = Number.isFinite(ev.new_cents) ? Math.round(ev.new_cents) : null;

    // Amount logic per event
    let amount = null, amountKind = null;
    if (t === 'pledge-change') {
      amount = newCents != null ? newCents / 100 : null;
      amountKind = 'monthly';
    } else if (t === 'payment-failed') {
      const due = ev.meta?.amount_due;
      amount = Number.isFinite(due) ? Math.round(due) / 100 : null;
      amountKind = 'monthly';
    }

    return {
      type: t,                           // e.g. 'sub-cancel-scheduled', 'sub-resumed', 'payment-failed', 'pledge-change'
      date: ev.created_at,               // ISO
      amount,
      oldAmount: oldCents != null ? oldCents / 100 : null,
      amountKind,
      meta: ev.meta || {},
      id: ev.id,
      url: null
    };
  });

  const items = [...invoiceItems, ...eventItems]
    .filter(Boolean)
    .sort((a, b) => {
      const da = new Date(a.date < 1e12 ? a.date * 1000 : a.date);
      const db = new Date(b.date < 1e12 ? b.date * 1000 : b.date);
      return db - da; // newest first
    });

  return { items };
}
