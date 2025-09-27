// /js/shared/status.js
// Tiny helper to render a colored status pill for invoices
export function statusPill(status = '') {
  const s = String(status).toLowerCase();
  const map = {
    paid:           { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: 'Paid' },
    open:           { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20',       label: 'Open' },
    void:           { cls: 'bg-slate-50 text-slate-700 ring-slate-600/20',       label: 'Void' },
    uncollectible:  { cls: 'bg-rose-50 text-rose-700 ring-rose-600/20',          label: 'Uncollectible' },
    draft:          { cls: 'bg-sky-50 text-sky-700 ring-sky-600/20',             label: 'Draft' },
  };
  const { cls, label } = map[s] || map.open;
  return `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${cls}">${label}</span>`;
}
