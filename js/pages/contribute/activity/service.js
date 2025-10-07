// /js/contribute/activity/service.js
import { getRecentInvoices, listActivityEvents } from '/js/shared/api.js';

/* ---------- config ---------- */
const MAX_ITEMS = 15;

/* ---------- helpers ---------- */
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

function normalizeCancelIso(meta = {}) {
  if (meta.cancel_at_iso) return meta.cancel_at_iso;
  if (meta.cancel_at_unix) return new Date(meta.cancel_at_unix * 1000).toISOString();
  return null;
}

/* ---------- main ---------- */
export async function fetchActivity() {
  /* Invoices → normalize (fetch a bit more than we’ll display to mix with events) */
  const invoicePayload = await getRecentInvoices(20);
  const invoices = Array.isArray(invoicePayload?.invoices)
    ? invoicePayload.invoices
    : Array.isArray(invoicePayload) ? invoicePayload : [];

  const invoiceItems = invoices.map((ix) => {
    const type = statusToType(ix);
    const amount = centsToDollars(ix.amount_paid ?? ix.amount_due ?? ix.total ?? 0);
    return {
      type,
      title:
        type === 'paid' ? 'Payment received' :
        type === 'upcoming' ? 'Upcoming charge' :
        type === 'failed' ? 'Payment failed' : 'Invoice',
      date: pickDate(ix), // seconds
      periodStart: ix.period_start ?? null,
      periodEnd: ix.period_end ?? null,
      amount,
      amountKind: type === 'paid' ? 'oneoff' : 'monthly',
      id: ix.id,
      url: ix.hosted_invoice_url || ix.invoice_pdf || ix.receipt_url || null,
    };
  });

  /* Raw events from DB (pledge_events) */
  const events = (await listActivityEvents(60)) || [];

  /* Is a cancellation currently scheduled? (banner only) */
  const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);
  const lastScheduled = [...events]
    .filter((e) => String(e.type).toLowerCase() === 'sub-cancel-scheduled')
    .sort(byNewest)[0];

  const lastClearedOrCanceled = [...events]
    .filter((e) => ['sub-resumed', 'sub-cancelled'].includes(String(e.type).toLowerCase()))
    .sort(byNewest)[0];

  let scheduled = null;
  if (
    lastScheduled &&
    (!lastClearedOrCanceled ||
      new Date(lastScheduled.created_at) > new Date(lastClearedOrCanceled.created_at))
  ) {
    scheduled = {
      created_at: lastScheduled.created_at,
      cancel_at_iso: normalizeCancelIso(lastScheduled.meta || {}),
    };
  }

  /* Event items for list (hide 'sub-cancel-scheduled' rows) */
  const eventItems = events
    .filter((ev) => String(ev.type).toLowerCase() !== 'sub-cancel-scheduled')
    .map((ev) => {
      const t = String(ev.type || '').toLowerCase();

      const oldCents = Number.isFinite(ev.old_cents) ? Math.round(ev.old_cents) : null;
      const newCents = Number.isFinite(ev.new_cents) ? Math.round(ev.new_cents) : null;

      // Fallbacks from meta if server didn't populate old/new_cents
      const metaPrevCents =
        Number.isFinite(ev.meta?.prev_cents) ? Math.round(ev.meta.prev_cents) :
        Number.isFinite(ev.meta?.prev_pledge_dollars) ? Math.round(ev.meta.prev_pledge_dollars * 100) :
        null;

      let amount = null;      // dollars (number)
      let amountKind = null;  // 'monthly' | 'oneoff' | null
      let oldAmount = oldCents != null ? oldCents / 100 : null;

      if (t === 'pledge-change') {
        amount = newCents != null ? newCents / 100 : null;
        if (oldAmount == null && metaPrevCents != null) oldAmount = metaPrevCents / 100;
        amountKind = 'monthly';
      } else if (t === 'payment-failed') {
        const due = ev.meta?.amount_due;
        amount = Number.isFinite(due) ? Math.round(due) / 100 : null;
        amountKind = 'monthly';
      } else if (t === 'sub-cancelled') {
        // Show old pledge → $0
        amount = 0;
        if (oldAmount == null && metaPrevCents != null) oldAmount = metaPrevCents / 100;
        amountKind = 'monthly';
      }

      return {
        type: t,
        date: ev.created_at,      // ISO
        amount,
        oldAmount,
        amountKind,
        meta: ev.meta || {},
        id: ev.id,
        url: null,
      };
    });

  /* Merge + sort + LIMIT */
  const items = [...invoiceItems, ...eventItems]
    .filter(Boolean)
    .sort((a, b) => {
      const da = new Date(a.date < 1e12 ? a.date * 1000 : a.date);
      const db = new Date(b.date < 1e12 ? b.date * 1000 : b.date);
      return db - da; // newest first
    })
    .slice(0, MAX_ITEMS); // <= cap to 15 rows

  return { items, scheduled };
}
