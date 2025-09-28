// /js/contribute/activity/index.js
import { fetchActivity } from './service.js';
import { fmtDate } from '../utils/format.js';

const usd0 = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function mountActivity() {
  const list = document.getElementById('activityList');
  const content = document.getElementById('activityContent');
  const skeletons = document.querySelectorAll('#activitySkeleton,#recentSkeleton,#recentskeleton,[data-skeleton="activity"],[data-skeleton*="invoice"]');
  const card = list?.closest('.card') || content || document;

  function cleanExtras() {
    card.querySelectorAll('[data-legend-activity="1"]').forEach((el) => el.remove());
    card.querySelectorAll('[data-activity-footnote="1"]').forEach((el) => el.remove());
  }

  function renderLegend() {
    const target = document.getElementById('activityLegend');
    const html = `
      <span class="pill-paid pill-dot">Paid</span>
      <span class="pill-up pill-dot">Upcoming</span>
      <span class="pill-fail pill-dot">Failed</span>
      <span class="pill-pledge pill-dot">Pledge change</span>
    `;
    if (target) {
      target.innerHTML = html;
      target.setAttribute('data-legend-activity', '1');
      return;
    }
    const wrap = document.createElement('div');
    wrap.setAttribute('data-legend-activity', '1');
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
    'sub-cancel-scheduled': 'Cancellation scheduled',
    'sub-resumed': 'Cancellation removed',
  }[t] || 'Event');

  function chipFor(t) {
    if (t === 'paid') return `<span class="pill-paid">Paid</span>`;
    if (t === 'upcoming') return `<span class="pill-up">Upcoming</span>`;
    if (t === 'failed' || t === 'payment-failed') return `<span class="pill-fail">Failed</span>`;
    if (t === 'sub-cancel-scheduled') return `<span class="pill-up">Scheduled</span>`;
    if (t === 'sub-resumed') return `<span class="pill-pledge">Resumed</span>`;
    return `<span class="pill-pledge">Pledge</span>`;
  }

  function leftSub(it) {
    // Pledge change
    if (it.type === 'pledge_change' || it.type === 'pledge-change') {
      const oldV = typeof it.oldAmount === 'number' ? usd0(it.oldAmount) : '—';
      const newV = typeof it.amount    === 'number' ? usd0(it.amount)    : '—';
      return `${oldV} → ${newV}`;
    }
    // Failed invoice (from Stripe or from event)
    if (it.type === 'failed' || it.type === 'payment-failed') {
      return typeof it.amount === 'number' ? `${usd0(it.amount)}/mo` : '';
    }
    // Upcoming
    if (it.type === 'upcoming') {
      return typeof it.amount === 'number' ? `${usd0(it.amount)}/mo` : '';
    }
    // Cancellation scheduled → show the scheduled date
    if (it.type === 'sub-cancel-scheduled') {
      const when = it.meta?.cancel_at_iso || it.meta?.cancel_at_unix || null;
      const d = when ? fmtDate(when, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      return `Cancels on ${d}`;
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

  (async () => {
    try {
      const { items = [] } = await fetchActivity();
      cleanExtras();
      renderLegend();
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
    } catch (e) {
      console.error('[activity] render failed', e);
    }
  })();

  return () => {};
}
