// /js/pages/history/index.js
import * as api from '/js/shared/api.js';
import * as skel from '/js/shared/skeletons.js';
import { initToasts, toast } from '/js/shared/ui.js';

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let nextCursor = '';
let hasMore = true;
let isLoading = false;
let firstPaint = true;

let aborter = null;                 // cancel stale loads
const seen = new Set();             // dedupe across pages
const allInvoices = [];             // cache for filters/export
let loadedCount = 0;

const $ = (id) => document.getElementById(id);

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleDateString();
  } catch {
    return '—';
  }
}

function keyOf(inv) {
  return inv?.id || inv?.number || `${inv?.created}-${inv?.amount_paid}`;
}

function row(inv) {
  const date = fmtDate(inv?.created);
  const amtCents = (inv?.amount_paid ?? inv?.amount_due ?? 0);
  const amt = usd0.format(amtCents / 100);
  const url = inv?.hosted_invoice_url || inv?.invoice_pdf || '#';
  const num = inv?.number || inv?.id || '—';
  const status = inv?.status || '—';

  return `
    <a class="flex items-center justify-between p-3 hover:bg-gray-50" href="${url}" target="_blank" rel="noopener noreferrer">
      <div class="flex flex-col">
        <span class="text-sm text-gray-700">${date} · ${num}</span>
        <span class="text-xs text-gray-500">Status: ${status}</span>
      </div>
      <span class="text-sm font-medium">${amt}</span>
    </a>
  `;
}

function updateResultCount() {
  const label = $('resultCount');
  if (!label) return;
  label.textContent = loadedCount
    ? `Showing ${loadedCount} invoice${loadedCount === 1 ? '' : 's'}`
    : 'No invoices yet';
}

function clearSkeletonOnce(wrap) {
  if (firstPaint) {
    wrap.innerHTML = '';
    firstPaint = false;
  }
}

function appendInvoices(invoices = []) {
  const wrap = $('invoiceList');
  if (!wrap) return;

  // First real paint: remove skeleton rows
  clearSkeletonOnce(wrap);

  if (!invoices.length && !wrap.children.length) {
    wrap.innerHTML = '<div class="p-3 text-sm text-gray-600">No invoices yet.</div>';
    updateResultCount();
    return;
  }

  // Visual divider once there is content
  if (!wrap.classList.contains('divide-y')) {
    wrap.classList.add('divide-y');
  }

  const frag = document.createDocumentFragment();

  for (const inv of invoices) {
    const k = keyOf(inv);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    allInvoices.push(inv);

    const holder = document.createElement('div');
    holder.innerHTML = row(inv);
    frag.appendChild(holder.firstElementChild);
  }

  if (frag.childNodes.length) {
    wrap.appendChild(frag);
    loadedCount = allInvoices.length;
    updateResultCount();
  }
}

function applyFiltersAndRender() {
  // Optional filter controls; if they don't exist, show everything
  const wrap = $('invoiceList');
  if (!wrap) return;

  const statusSel = $('statusFilter');  // <select>
  const fromEl = $('dateFrom');         // <input type="date">
  const toEl = $('dateTo');             // <input type="date">

  const wantStatus = statusSel?.value?.trim();
  const fromTs = fromEl?.value ? Date.parse(fromEl.value) / 1000 : null;
  const toTs = toEl?.value ? (Date.parse(toEl.value) / 1000 + 24*3600) : null; // inclusive day

  const filtered = allInvoices.filter(inv => {
    if (wantStatus && inv?.status !== wantStatus) return false;
    if (fromTs && (inv?.created ?? 0) < fromTs) return false;
    if (toTs && (inv?.created ?? 0) >= toTs) return false;
    return true;
  });

  // Re-render list
  wrap.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const inv of filtered) {
    const holder = document.createElement('div');
    holder.innerHTML = row(inv);
    frag.appendChild(holder.firstElementChild);
  }
  if (frag.childNodes.length) {
    wrap.classList.add('divide-y');
    wrap.appendChild(frag);
  } else {
    wrap.classList.remove('divide-y');
    wrap.innerHTML = '<div class="p-3 text-sm text-gray-600">No invoices for the selected filters.</div>';
  }

  // Keep the count label referring to the number displayed
  loadedCount = filtered.length;
  updateResultCount();
}

function bindOptionalFilters() {
  const statusSel = $('statusFilter');
  const fromEl = $('dateFrom');
  const toEl = $('dateTo');
  if (statusSel) statusSel.addEventListener('change', applyFiltersAndRender);
  if (fromEl) fromEl.addEventListener('change', applyFiltersAndRender);
  if (toEl) toEl.addEventListener('change', applyFiltersAndRender);
}

function exportCsv() {
  if (!allInvoices.length) {
    toast('Nothing to export yet.', { type: 'info' });
    return;
  }
  const header = ['date','number','status','amount_usd','invoice_url'];
  const lines = [header.join(',')];

  for (const inv of allInvoices) {
    const date = fmtDate(inv?.created).replace(/,/g, '');
    const number = (inv?.number || inv?.id || '').replace(/,/g, '');
    const status = (inv?.status || '').replace(/,/g, '');
    const amount = ((inv?.amount_paid ?? inv?.amount_due ?? 0) / 100).toString();
    const url = (inv?.hosted_invoice_url || inv?.invoice_pdf || '').replace(/"/g, '""');
    // Quote fields that may contain commas
    const row = [date, number, status, amount, `"${url}"`];
    lines.push(row.join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindOptionalExport() {
  const btn = $('btnExportCsv');
  if (btn) btn.addEventListener('click', exportCsv);
}

async function loadMore(limit = 25) {
  if (isLoading || !hasMore) return;

  const list = $('invoiceList');
  const btn = $('btnLoadMore');

  isLoading = true;

  // show skeletons on first fetch
  if (firstPaint && list) skel.renderListSkeleton(list, 8);
  skel.setBusy([btn], true);

  // Cancel any in-flight request
  if (aborter) aborter.abort();
  aborter = new AbortController();

  try {
    const { invoices = [], has_more = false, next_cursor = '', total_count } =
      await api.getAllInvoices(
        { limit, starting_after: nextCursor || '' },
        { signal: aborter.signal } // if your api wrapper passes init through
      );

    if (typeof total_count === 'number') {
      // Use server total if provided to phrase counts later if you want
    }

    appendInvoices(invoices);
    hasMore = !!has_more && !!next_cursor;
    nextCursor = hasMore ? next_cursor : '';

    if (!hasMore) btn?.classList.add('hidden'); else btn?.classList.remove('hidden');

    // If filters exist, re-apply them to reflect newly loaded data
    if ($('statusFilter') || $('dateFrom') || $('dateTo')) applyFiltersAndRender();

  } catch (e) {
    if (e?.name === 'AbortError') return; // benign
    console.error('[history] load error', e);
    toast('Could not load invoices. Please try again.', { type: 'error' });

    // On first paint error, clear skeletons and show a friendly message
    const wrap = $('invoiceList');
    if (firstPaint && wrap) {
      firstPaint = false;
      wrap.innerHTML = `
        <div class="p-3 text-sm text-red-600">
          We couldn’t load your invoices. <button id="retryHistory" class="underline">Retry</button>
        </div>`;
      $('retryHistory')?.addEventListener('click', () => loadMore(limit));
    }
  } finally {
    isLoading = false;
    skel.setBusy([btn], false);
  }
}

/** Infinite scroll: uses a sentinel after the list, falls back to button */
function setupInfiniteScroll() {
  const list = $('invoiceList');
  if (!list || !('IntersectionObserver' in window)) return;

  let sentinel = $('scrollSentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'scrollSentinel';
    sentinel.className = 'h-6';
    list.parentElement?.appendChild(sentinel);
  }

  const io = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry?.isIntersecting && hasMore && !isLoading) {
      loadMore(25);
    }
  }, { rootMargin: '200px 0px 200px 0px' });

  io.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
  initToasts();

  // Fallback manual paging
  $('btnLoadMore')?.addEventListener('click', () => loadMore(25));

  // Optional niceties
  bindOptionalFilters();
  bindOptionalExport();
  setupInfiniteScroll();

  // Initial label/skeletons + first page
  updateResultCount();
  loadMore(25);
});
