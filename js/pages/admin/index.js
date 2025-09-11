// /js/pages/admin/index.js
import {
  listMembers,
  myMember,
  openPortal,
  cancelSubscription,
  resendInvoice,
} from './data.js';

import {
  renderMembers,
  showError,
  showInfo,
  clearBanners,
  toggleSkeleton,
  bindUI,
  openCancelOverlay,
  readControls,
} from './ui.js';

import { openMemberDrawer } from './memberDrawer.js';
import { toast } from '/js/shared/ui.js';

let __booted = false;
let __state = { members: [] };
let __liveTimer = null;
// Track the last server query we actually fetched
let __lastServerQuery = { q: '', status: 'all' };

/* ==== Relevance & sorting helpers (client-side) ==== */
function relevanceScore(m, q) {
  if (!q) return 0;
  const hay = [(m.full_name || ''), (m.email || '')].join(' ').toLowerCase();
  const needle = q.toLowerCase();
  if (!hay.includes(needle)) return -1;
  const idx = hay.indexOf(needle);
  return idx === 0 ? 1000 : (500 - idx);
}

function sortRows(rows, { sortBy, q }) {
  const r = [...rows];
  switch (sortBy) {
    case 'last_paid_desc':
      r.sort((a,b) => (new Date(b.last_paid_at||0)) - (new Date(a.last_paid_at||0)));
      break;
    case 'pledge_desc':
      r.sort((a,b) => (b.monthly_contribution_cents||0) - (a.monthly_contribution_cents||0));
      break;
    case 'missed_desc':
      r.sort((a,b) => (b.missed_payment_count||0) - (a.missed_payment_count||0));
      break;
    case 'cancel_asc':
      r.sort((a,b) => (new Date(a.membership_cancel_at||'9999-12-31')) - (new Date(b.membership_cancel_at||'9999-12-31')));
      break;
    case 'name_asc':
      r.sort((a,b) => (a.full_name||a.email||'').localeCompare(b.full_name||b.email||''));
      break;
    case 'relevance':
    default:
      if (q) r.sort((a,b) => relevanceScore(b, q) - relevanceScore(a, q));
      break;
  }
  return r;
}

function filterRows(rows, { q, status, hasCancel }) {
  let out = rows;
  if (status && status !== 'all') {
    out = out.filter(m => (m.membership_status||'').toLowerCase() === status.toLowerCase());
  }
  if (hasCancel) out = out.filter(m => !!m.membership_cancel_at);
  if (q) {
    const ql = q.toLowerCase();
    out = out.filter(m =>
      (m.full_name||'').toLowerCase().includes(ql) ||
      (m.email||'').toLowerCase().includes(ql)
    );
  }
  return out;
}

function applyFiltersAndRender({ animate = true } = {}) {
  const { q, status, hasCancel, sortBy } = readControls();
  const filtered = filterRows(__state.members, { q, status, hasCancel });
  const sorted = sortRows(filtered, { sortBy, q });

  renderMembers(sorted, {
    onOpen: async (id) => {
      try { await openPortal(id); }
      catch (e) { showError(String(e?.message || e)); }
    },
    onCancel: (id) => {
      const member = __state.members.find(m => m.id === id);
      if (!member) return;
      openCancelOverlay(member, {
        onPeriodEnd: async () => {
          try { await cancelSubscription(id, 'period_end'); toast?.('Cancellation scheduled at period end'); await refresh({ showLoad:false, animate:false }); }
          catch (e) { showError(String(e?.message || e)); }
        },
        onNow: async () => {
          try { await cancelSubscription(id, 'now'); toast?.('Subscription canceled immediately'); await refresh({ showLoad:false, animate:false }); }
          catch (e) { showError(String(e?.message || e)); }
        },
      });
    },
    onResend: async (id) => {
      try { const res = await resendInvoice(id); toast?.(res?.message || 'Invoice email resent'); }
      catch (e) { showError(String(e?.message || e)); }
    },
    onView: (id) => openMemberDrawer(id),
  }, { q, animate });
}

export async function refresh({ showLoad=true, animate=true } = {}) {
  clearBanners();
  if (showLoad) toggleSkeleton(true);

  try {
    const me = await myMember();
    if (!me?.is_admin) {
      showError('Admin access required.');
      toggleSkeleton(false);
      return;
    }

    const { q, status } = readControls();
    const { members } = await listMembers({ q, status });
    __state.members = Array.isArray(members) ? members : [];
    __lastServerQuery = { q, status };

    applyFiltersAndRender({ animate });
    toggleSkeleton(false);
    if (!__state.members.length) showInfo('No members found for the current filters.');
  } catch (e) {
    console.error('[admin] refresh error', e);
    showError(String(e?.message || e) || 'Something went wrong.');
    toggleSkeleton(false);
  }
}

function handleLiveFilter() {
  // 1) Immediate local filter/sort — NO animation (prevents double flicker)
  applyFiltersAndRender({ animate: false });

  // 2) Soft debounce server refresh ONLY when q or status changed
  clearTimeout(__liveTimer);
  const { q, status } = readControls();
  const needsServer = (q !== __lastServerQuery.q) || (status !== __lastServerQuery.status);
  if (!needsServer) return;

  __liveTimer = setTimeout(() => {
    // silent refresh (no skeleton, no animation)
    refresh({ showLoad: false, animate: false });
  }, 350);
}

export async function boot() {
  if (__booted) return; __booted = true;
  bindUI({ onRefresh: () => refresh({ showLoad:true, animate:true }), onLiveFilter: handleLiveFilter });
  await refresh({ showLoad:true, animate:true });
}

window.__adminBoot = boot;
window.__adminRefresh = refresh;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  queueMicrotask(boot);
}
