// /js/contribute/activity/index.js
import { fetchActivity } from './service.js';
import { fmtDate } from '../utils/format.js';

const usd0 = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function mountActivity({ memberId } = {}) {
  const list = document.getElementById('activityList');
  const content = document.getElementById('activityContent');
  const skeletons = document.querySelectorAll('#activitySkeleton,#recentSkeleton,[data-skeleton="activity"]');
  const card = list?.closest('.card') || content || document;

  /* ───────────────── helpers ───────────────── */

  function cleanExtras() {
    // keep fixed legend container; just clear it
    const fixedLegend = document.getElementById('activityLegend');
    if (fixedLegend) fixedLegend.innerHTML = '';
    // remove only dynamic wrappers
    card.querySelectorAll('[data-legend-activity="wrap"]').forEach((el) => el.remove());
    // remove footnote + banner
    card.querySelectorAll('[data-activity-footnote="1"]').forEach((el) => el.remove());
    card.querySelectorAll('[data-cancel-banner="1"]').forEach((el) => el.remove());
  }

function renderLegend() {
  const html = `
    <span class="pill-paid pill-dot">Paid</span>
    <span class="pill-up pill-dot">Upcoming</span>
    <span class="pill-fail pill-dot">Failed</span>
    <span class="pill-fail pill-dot">Cancelled</span>
    <span class="pill-pledge pill-dot">Pledge change</span>
  `;
  const target = document.getElementById('activityLegend');
  if (target) { target.innerHTML = html; return; }

  const wrap = document.createElement('div');
  wrap.setAttribute('data-legend-activity', 'wrap');
  wrap.className = 'px-0 pb-3 flex flex-wrap gap-2';
  wrap.innerHTML = html;
  if (list?.parentElement) list.parentElement.insertBefore(wrap, list);
  else card.prepend(wrap);
}


  const labelFor = (t) => ({
    paid: 'Payment received',
    upcoming: 'Upcoming charge',
    failed: 'Payment failed',
    'payment-failed': 'Payment failed',
    'pledge_change': 'Pledge changed',
    'pledge-change': 'Pledge changed',
    'sub-resumed': 'Cancellation removed',
    'sub-cancelled': 'Membership cancelled',
  }[t] || 'Event');

  function chipFor(t) {
    if (t === 'paid') return `<span class="pill-paid">Paid</span>`;
    if (t === 'upcoming') return `<span class="pill-up">Upcoming</span>`;
    if (t === 'failed' || t === 'payment-failed') return `<span class="pill-fail">Failed</span>`;
    if (t === 'sub-resumed') return `<span class="pill-pledge">Resumed</span>`;
    if (t === 'sub-cancelled') return `<span class="pill-fail">Cancelled</span>`;
    return `<span class="pill-pledge">Pledge</span>`;
  }

  function leftSub(it) {
    if (it.type === 'pledge_change' || it.type === 'pledge-change') {
      const oldV = typeof it.oldAmount === 'number' ? usd0(it.oldAmount) : '—';
      const newV = typeof it.amount    === 'number' ? usd0(it.amount)    : '—';
      return `${oldV} → ${newV}`;
    }
    // NEW: show amount for paid rows instead of leaving blank
    if (it.type === 'paid') {
      return typeof it.amount === 'number' ? usd2(it.amount) : '';
    }
    if (it.type === 'sub-cancelled') {
      const oldV = typeof it.oldAmount === 'number' ? usd0(it.oldAmount) : '—';
      return `${oldV} → ${usd0(0)}`;
    }
    if (it.type === 'failed' || it.type === 'payment-failed') {
      return typeof it.amount === 'number' ? `${usd0(it.amount)}/mo` : '';
    }
    if (it.type === 'upcoming') {
      return typeof it.amount === 'number' ? `${usd0(it.amount)}/mo` : '';
    }
    return '';
  }

  function rightAmt(it) {
    if (it.type === 'paid') return usd2(it.amount);
    if (['upcoming','pledge_change','pledge-change','failed','payment-failed'].includes(it.type)) {
      if (typeof it.amount === 'number') {
        const amt = usd0(it.amount);
        return `${amt}<span class="text-[12px] font-medium opacity-70">/mo</span>`;
      }
    }
    if (it.type === 'sub-cancelled') {
      return `${usd0(0)}<span class="text-[12px] font-medium opacity-70">/mo</span>`;
    }
    return '';
  }

  const rowDate = (v) => fmtDate(v, { month: 'short', day: 'numeric', year: 'numeric' });

  function renderList(items) {
    return `
      <div class="activity-list">
        ${items.map(it => {
          const rowAttrs = it.url
            ? ` tabindex="0" role="link" aria-label="Open receipt for ${rowDate(it.date)}" data-url="${it.url}"`
            : '';
          return `
            <div class="activity-row-compact${it.url ? ' is-clickable' : ''}"${rowAttrs}>
              <div>
                <div class="act-title">${rowDate(it.date)} <span class="mx-1">·</span> ${labelFor(it.type)}</div>
                <div class="act-sub">
                  ${chipFor(it.type)}
                  ${leftSub(it) ? `<span>${leftSub(it)}</span>` : ''}
                </div>
              </div>
              <div class="act-right">
                ${rightAmt(it) ? `<div class="act-amt">${rightAmt(it)}</div>` : ''}
                ${it.url ? `<a class="act-receipt" href="${it.url}" target="_blank" rel="noopener">receipt</a>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function wireRowClicks() {
    if (!list) return;
    list.querySelectorAll('.activity-row-compact[data-url]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const url = row.dataset.url;
        if (url) window.open(url, '_blank', 'noopener');
      });
      row.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && row.dataset.url) {
          e.preventDefault();
          window.open(row.dataset.url, '_blank', 'noopener');
        }
      });
    });
  }

  function renderCancelBanner(scheduled) {
    card.querySelectorAll('[data-cancel-banner="1"]').forEach((el) => el.remove());
    if (!scheduled?.cancel_at_iso) return;

    const d = fmtDate(scheduled.cancel_at_iso, { month: 'short', day: 'numeric', year: 'numeric' });
    const banner = document.createElement('div');
    banner.setAttribute('data-cancel-banner', '1');
    banner.className = 'px-6 py-3 text-sm text-amber-800 bg-amber-50 border-b border-amber-200 flex items-center gap-2';
    banner.innerHTML = `<span class="pill-up">Scheduled</span> Cancellation scheduled — cancels on <span class="font-medium">${d}</span>`;
    if (content && list) content.insertBefore(banner, list);
  }

  /* ─────────────── live refresh (Realtime + polling fallback) ─────────────── */

  async function refreshActivityOnce() {
    const { items = [], scheduled } = await fetchActivity();
    cleanExtras();
    renderLegend();
    renderCancelBanner(scheduled);
    if (list) {
      list.innerHTML = renderList(items);
      wireRowClicks();
    }
    let foot = card.querySelector('[data-activity-footnote="1"]');
    if (!foot) {
      foot = document.createElement('p');
      foot.setAttribute('data-activity-footnote', '1');
      (list?.parentElement || card).appendChild(foot);
    }
    foot.className = 'act-footer';
    foot.textContent = 'Click a row to view a receipt when available.';
    skeletons.forEach(el => { el.classList.add('hidden'); el.style.display = 'none'; });
    content?.classList.remove('hidden');
  }

  function beginLiveUpdates() {
    let pollId = null;
    let channel = null;

    const startPolling = (ms = 10000) => {
      if (pollId) return;
      pollId = setInterval(() => refreshActivityOnce().catch(console.error), ms);
    };
    const stopPolling = () => { if (pollId) { clearInterval(pollId); pollId = null; } };

    const supabase = window.supabaseClient || window.supabase;
    if (supabase && memberId) {
      try {
        channel = supabase
          .channel(`activity:${memberId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'pledge_events', filter: `member_id=eq.${memberId}` },
            () => refreshActivityOnce().catch(console.error)
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'capital_ledger', filter: `member_id=eq.${memberId}` },
            () => refreshActivityOnce().catch(console.error)
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') stopPolling();
          });

        startPolling(10000); // safety net until subscribed
      } catch (e) {
        console.warn('[activity] realtime subscribe failed; falling back to polling', e);
        startPolling(12000);
      }
    } else {
      startPolling(12000);
    }

    return () => {
      if (channel?.unsubscribe) channel.unsubscribe();
      stopPolling();
    };
  }

  /* ───────────────── mount ───────────────── */

  (async () => {
    try {
      await refreshActivityOnce();
      beginLiveUpdates();
    } catch (e) {
      console.error('[activity] render failed', e);
    }
  })();

  return () => {};
}
