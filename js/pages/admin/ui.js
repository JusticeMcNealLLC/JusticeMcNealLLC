// /js/pages/admin/ui.js
// Visuals aligned with your Contribute page: soft cards, pills, subtle motion.

/* ========= One-time CSS ========= */
(function injectAdminUxStyles() {
  if (document.getElementById('adminUxStyles')) return;
  const css = `
  @keyframes admin-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .skel { position:relative; overflow:hidden; background:linear-gradient(90deg,rgba(0,0,0,.05) 25%,rgba(0,0,0,.1) 37%,rgba(0,0,0,.05) 63%); background-size:400% 100%; animation:admin-shimmer 1.6s infinite linear; border-radius:.75rem; }

  .admin-row { transition: background-color .14s ease, transform .12s ease, opacity .18s ease; opacity:0; transform:translateY(2px); }
  .admin-row.show { opacity:1; transform:translateY(0); }
  .admin-row:hover { background-color: rgba(15,31,58,0.03); }

  .admin-btn { transition: transform .08s ease, box-shadow .14s ease, background-color .12s ease, color .12s ease; }
  .admin-btn:hover { transform: translateY(-1px); }
  .admin-btn:active { transform: translateY(0); }

  /* Pills */
  .pill { display:inline-flex; align-items:center; padding:.125rem .5rem; border-radius:9999px; font-size:.75rem; line-height:1rem; font-weight:600; }
  .pill-green  { background:#dcfce7; color:#166534; }
  .pill-amber  { background:#fef3c7; color:#92400e; }
  .pill-red    { background:#fee2e2; color:#991b1b; }
  .pill-slate  { background:#e2e8f0; color:#334155; }
  .pill-indigo { background:#e0e7ff; color:#3730a3; }
  .pill-violet { background:#ede9fe; color:#5b21b6; }

  .focus-ring { outline: none; }
  .focus-ring:focus-visible { box-shadow: 0 0 0 3px rgba(99,102,241,.35); }
  `;
  const style = document.createElement('style');
  style.id = 'adminUxStyles';
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
const fmtUSD2 = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0) / 100);

export function showError(msg){ const el=$('adminError'); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); }
export function showInfo(msg){  const el=$('adminInfo');  if(!el) return; el.textContent=msg; el.classList.remove('hidden'); }
export function clearBanners(){ $('adminError')?.classList.add('hidden'); $('adminInfo')?.classList.add('hidden'); }

/* ========= Controls ========= */
function mountExtrasRow() {
  const host = document.getElementById('filterExtras');
  if (!host) return null;
  // Create containers once; JS will insert checkbox & sort select into it
  if (!host.dataset.ready) {
    host.innerHTML = `
      <div id="extraHasCancel"></div>
      <div id="extraSort"></div>
    `;
    host.dataset.ready = '1';
  }
  return host;
}

function ensureHasCancelCheckbox(){
  mountExtrasRow();
  if ($('hasCancelOnly')) return $('hasCancelOnly');
  const holder = document.getElementById('extraHasCancel');
  const label = document.createElement('label');
  label.className = 'inline-flex items-center gap-2 text-sm';
  label.innerHTML = `
    <input id="hasCancelOnly" type="checkbox" class="rounded border-gray-300 text-navy focus:ring-navy">
    <span>Has scheduled cancel</span>
  `;
  holder?.appendChild(label);
  return $('hasCancelOnly');
}

function ensureSortControl() {
  mountExtrasRow();
  if ($('sortBy')) return $('sortBy');
  const holder = document.getElementById('extraSort');
  const wrap = document.createElement('label');
  wrap.className = 'inline-flex items-center gap-2 text-sm';
  wrap.innerHTML = `
    <span>Sort</span>
    <select id="sortBy" class="rounded border-gray-300 text-sm">
      <option value="relevance">Relevance</option>
      <option value="last_paid_desc">Last paid ↓</option>
      <option value="pledge_desc">Pledge ↓</option>
      <option value="missed_desc">Missed payments ↓</option>
      <option value="cancel_asc">Cancel date ↑</option>
      <option value="name_asc">Name A–Z</option>
    </select>
  `;
  holder?.appendChild(wrap);
  return $('sortBy');
}

export function bindUI({ onRefresh, onLiveFilter } = {}){
  const btn = $('btnRefresh');
  const q = $('q');
  const status = $('status');
  const hasCancel = ensureHasCancelCheckbox();
  const sortBy = ensureSortControl();

  btn?.addEventListener('click', () => onRefresh?.());
  status?.addEventListener('change', () => onLiveFilter?.());
  hasCancel?.addEventListener('change', () => onLiveFilter?.());
  sortBy?.addEventListener('change', () => onLiveFilter?.());

  q?.addEventListener('input', () => onLiveFilter?.());
  q?.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ q.value=''; onLiveFilter?.(); } });
}

export function readControls() {
  return {
    q: $('q')?.value?.trim() || '',
    status: $('status')?.value || 'all',
    hasCancel: $('hasCancelOnly')?.checked || false,
    sortBy: $('sortBy')?.value || 'relevance',
  };
}

/* ========= Skeleton ========= */
function ensureListSkeleton() {
  const skel = $('memberSkeleton');
  if (!skel) return;
  if (skel.dataset.built === '1') return;

  const rows = 8;
  const blocks = Array.from({ length: rows }).map(() => `
    <div class="grid px-4 md:px-5 py-3 items-center md:grid-cols-[1fr_7rem_6rem_7rem_7rem_4rem_24rem] gap-2">
      <div class="space-y-2">
        <div class="skel h-4 w-40"></div>
        <div class="skel h-3 w-28"></div>
      </div>
      <div class="skel h-4 w-16"></div>
      <div class="skel h-4 w-14 ml-auto"></div>
      <div class="skel h-4 w-20 ml-auto"></div>
      <div class="skel h-4 w-24 ml-auto"></div>
      <div class="skel h-4 w-8 ml-auto"></div>
      <div class="flex gap-2 justify-end">
        <div class="skel h-8 w-24"></div>
        <div class="skel h-8 w-24"></div>
        <div class="skel h-8 w-28"></div>
      </div>
    </div>
    <div class="border-t border-line"></div>
  `).join('');

  skel.innerHTML = blocks;
  skel.dataset.built = '1';
}

export function toggleSkeleton(show){
  ensureListSkeleton();
  $('memberSkeleton')?.classList.toggle('hidden', !show);
  $('memberList')?.classList.toggle('hidden', show);
}

/* ========= Rendering ========= */
function statusPill(status) {
  const s = String(status || '').toLowerCase();
  const map = {
    active: 'pill pill-green',
    trialing: 'pill pill-green',
    past_due: 'pill pill-amber',
    unpaid: 'pill pill-amber',
    canceled: 'pill pill-slate',
    inactive: 'pill pill-slate',
    rejoining: 'pill pill-indigo',
    chargeback: 'pill pill-red',
    suspended: 'pill pill-violet',
  };
  const cls = map[s] || 'pill pill-slate';
  const label = s.replace(/_/g, ' ') || '—';
  return `<span class="${cls}" title="${label}">${label}</span>`;
}

function highlight(text, q) {
  if (!q) return escapeHtml(text || '');
  const t = String(text || '');
  const idx = t.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return escapeHtml(t);
  const before = escapeHtml(t.slice(0, idx));
  const mid = escapeHtml(t.slice(idx, idx + q.length));
  const after = escapeHtml(t.slice(idx + q.length));
  return `${before}<mark class="bg-yellow-100 rounded px-0.5">${mid}</mark>${after}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
}

export function renderMembers(
  rows,
  { onOpen, onCancel, onResend, onView } = {},
  { q = '', animate = true } = {}
) {
  const wrap = $('memberList');
  const count = $('memberCount');
  if (!wrap) return;

  const html = (rows || []).map((m, i) => {
    const nameRaw = m.full_name || m.email || '—';
    const name = highlight(nameRaw, q);
    const email = highlight(m.email || '', q);

    const pledge = fmtUSD2(m.monthly_contribution_cents ?? 0);
    const lastPaid = m.last_paid_at ? new Date(m.last_paid_at).toLocaleDateString() : '—';
    const cancelsOn = m.membership_cancel_at ? new Date(m.membership_cancel_at) : null;
    const cancelsShort = cancelsOn ? cancelsOn.toLocaleDateString() : '—';
    const cancelsISO = cancelsOn ? cancelsOn.toISOString() : '';
    const status = statusPill(m.membership_status);

    const delay = Math.min(i * 8, 120);

    return `
      <div class="admin-row ${animate ? '' : 'show'} grid px-4 md:px-5 py-3 items-center md:grid-cols-[1fr_7rem_6rem_7rem_7rem_4rem_24rem] gap-2" data-id="${m.id}" style="${animate ? `transition-delay:${delay}ms` : ''}">
        <div class="min-w-0">
          <button class="link-member underline decoration-dotted underline-offset-2 hover:decoration-solid text-left font-medium truncate focus-ring"
                  aria-label="View details for ${escapeHtml(nameRaw)}">${name}</button>
          <div class="text-xs text-gray-500">${email}</div>
        </div>

        <div class="text-sm">${status}</div>
        <div class="text-right text-sm tabular-nums">${pledge}</div>
        <div class="text-right text-sm text-gray-700">${lastPaid}</div>

        <div class="text-right text-sm ${cancelsOn ? 'text-amber-800' : 'text-gray-700'}">
          ${cancelsShort}
          ${cancelsOn ? `
            <span class="ml-2 inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs"
                  title="${cancelsISO}" aria-label="Cancellation scheduled for ${cancelsISO}">
              canceling
            </span>` : ''}
        </div>

        <div class="text-right text-sm tabular-nums">${m.missed_payment_count ?? 0}</div>

        <div class="flex justify-end">
          <div class="inline-flex flex-wrap gap-2">
            <button class="admin-btn btn-portal bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-3 py-1.5 text-xs md:text-sm" data-id="${m.id}">Open&nbsp;Portal</button>
            <button class="admin-btn btn-cancel bg-rose-600 hover:bg-rose-700 text-white rounded-md px-3 py-1.5 text-xs md:text-sm" data-id="${m.id}">Cancel&nbsp;Sub</button>
            <button class="admin-btn btn-resend bg-slate-700 hover:bg-slate-800 text-white rounded-md px-3 py-1.5 text-xs md:text-sm" data-id="${m.id}">Resend&nbsp;Invoice</button>
          </div>
        </div>
      </div>
      <div class="border-t border-line"></div>
    `;
  }).join('');

  wrap.innerHTML = html;
  if (count) count.textContent = String(rows?.length ?? 0);

  if (animate) {
    requestAnimationFrame(() => {
      wrap.querySelectorAll('.admin-row').forEach(el => el.classList.add('show'));
    });
  }

  wrap.querySelectorAll('.btn-portal').forEach(b => b.addEventListener('click', () => onOpen?.(b.dataset.id)));
  wrap.querySelectorAll('.btn-cancel').forEach(b => b.addEventListener('click', () => onCancel?.(b.dataset.id)));
  wrap.querySelectorAll('.btn-resend').forEach(b => b.addEventListener('click', () => onResend?.(b.dataset.id)));
  wrap.querySelectorAll('.link-member').forEach(b => b.addEventListener('click', () => {
    const id = b.closest('[data-id]')?.getAttribute('data-id');
    if (id) onView?.(id);
  }));
}

/* ========= Cancel overlay ========= */
function ensureOverlayRoot() {
  let el = document.getElementById('adminCancelOverlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'adminCancelOverlay';
  el.className = 'fixed inset-0 hidden';
  document.body.appendChild(el);
  return el;
}

export function openCancelOverlay(member, { onPeriodEnd, onNow } = {}) {
  const root = ensureOverlayRoot();
  const name = member?.full_name || member?.email || 'this member';
  root.innerHTML = `
    <div class="absolute inset-0 bg-black/40"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-2xl bg-white shadow-soft p-6 border border-line">
        <h2 class="text-lg font-semibold mb-2">Cancel subscription</h2>
        <p class="text-sm text-gray-600 mb-4">Choose how to cancel <strong>${escapeHtml(name)}</strong>:</p>
        <div class="space-y-2">
          <button id="btnCancelPeriodEnd" class="admin-btn w-full border rounded px-3 py-2 focus-ring">Cancel at period end (recommended)</button>
          <button id="btnCancelNow" class="admin-btn w-full border rounded px-3 py-2 text-red-600 focus-ring">Cancel now (immediate)</button>
          <button id="btnCancelClose" class="admin-btn w-full border rounded px-3 py-2">Never mind</button>
        </div>
      </div>
    </div>
  `;
  root.classList.remove('hidden');

  const close = () => root.classList.add('hidden');
  root.querySelector('#btnCancelClose')?.addEventListener('click', close);
  root.querySelector('#btnCancelPeriodEnd')?.addEventListener('click', async () => { try { await onPeriodEnd?.(); } finally { close(); } });
  root.querySelector('#btnCancelNow')?.addEventListener('click', async () => { try { await onNow?.(); } finally { close(); } });
}
