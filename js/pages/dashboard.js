// /js/pages/dashboard.js
import { supabase } from '/js/shared/supabaseClient.js';
import { $, on } from '/js/shared/dom.js';
import { toast } from '/js/shared/ui.js';
import { formatCents, formatDate } from '/js/shared/format.js';

// ---------- debug ----------
const dbg = () => $('#debug');
function log(msg, obj) {
  const box = dbg(); if (!box) return;
  const line = typeof obj !== 'undefined' ? `${msg} ${JSON.stringify(obj, null, 2)}` : String(msg);
  box.textContent = (box.textContent ? box.textContent + '\n' : '') + line;
}

// ---------- whoami (optional) ----------
async function showWhoAmI() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const who = $('#whoami');
    if (who) who.textContent = user?.email ?? 'Signed in';
  } catch {}
}

// ---------- data ----------
async function loadAllBalances() {
  const { data, error } = await supabase
    .from('vw_capital_balances')
    .select('member_id, full_name, capital_balance_cents')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function loadRecentLedger(limit = 50) {
  const { data, error } = await supabase
    .from('capital_ledger')
    .select('created_at, amount_cents, note, member_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function loadContributions30d() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('capital_ledger')
    .select('amount_cents')
    .gte('created_at', since)
    .gt('amount_cents', 0); // only positive contributions
  if (error) throw error;
  return (data || []).reduce((sum, r) => sum + (r.amount_cents || 0), 0);
}

// ---------- helpers ----------
function setMetric(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

// ---------- renderers ----------
function renderMetricCards({ totalCents, memberCount, contrib30dCents }) {
  setMetric('#cardTotal', formatCents(totalCents));
  setMetric('#cardMembers', String(memberCount));
  setMetric('#card30d', formatCents(contrib30dCents));
  setMetric('#cardUpdated', formatDate(new Date().toISOString()));
}

function renderBalancesTable(rows) {
  const tbody = $('#balancesBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="px-2 py-3 text-sm text-gray-500">No members yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr class="border-b">
      <td class="px-2 py-2">${r.full_name ?? '—'}</td>
      <td class="px-2 py-2">${formatCents(r.capital_balance_cents)}</td>
      <td class="px-2 py-2 text-xs text-gray-500">${r.member_id}</td>
    </tr>
  `).join('');
}

function renderRecentTable(rows, nameById) {
  const tbody = $('#recentBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-2 py-3 text-sm text-gray-500">No recent ledger entries.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr class="border-b">
      <td class="px-2 py-2">${r.created_at ? formatDate(r.created_at) : '—'}</td>
      <td class="px-2 py-2">${nameById.get(r.member_id) ?? '—'}</td>
      <td class="px-2 py-2">${formatCents(r.amount_cents)}</td>
      <td class="px-2 py-2">${r.note ?? ''}</td>
    </tr>
  `).join('');
}

// ---------- chart ----------
let pieChart;
function renderLegend(rows) {
  const list = $('#legendList');
  if (!list) return;
  list.innerHTML = rows.length
    ? rows.map(r => `<li>${r.full_name ?? '—'} — ${formatCents(r.capital_balance_cents)}</li>`).join('')
    : `<li class="text-gray-500">No data</li>`;
}
function renderPie(rows) {
  const ctx = $('#capitalPie');
  if (!ctx) return;
  if (pieChart) { pieChart.destroy(); pieChart = null; }
  if (!rows.length) return;

  const labels = rows.map(r => r.full_name ?? '—');
  const values = rows.map(r => Math.max(0, (r.capital_balance_cents || 0) / 100)); // dollars

  // Chart is provided globally by Chart.js CDN
  // eslint-disable-next-line no-undef
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values }] },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              return `${ctx.label}: ${v.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`;
            }
          }
        }
      }
    }
  });
}

// ---------- csv export ----------
function exportBalancesCsv(rows) {
  const header = ['Member', 'Balance (cents)', 'Member ID'];
  const lines = [header.join(',')].concat(
    rows.map(r => [
      JSON.stringify(r.full_name ?? ''), // wrap to handle commas/quotes
      r.capital_balance_cents ?? 0,
      r.member_id
    ].join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `balances_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- orchestration ----------
async function refreshAll() {
  try {
    log('refreshing…');

    const [balances, recent, contrib30dCents] = await Promise.all([
      loadAllBalances(),
      loadRecentLedger(50),
      loadContributions30d(),
    ]);

    const totalCents = balances.reduce((sum, r) => sum + (r.capital_balance_cents || 0), 0);
    const memberCount = balances.length;
    renderMetricCards({ totalCents, memberCount, contrib30dCents });

    renderBalancesTable(balances);

    const nameById = new Map(balances.map(b => [b.member_id, b.full_name ?? '—']));
    renderRecentTable(recent, nameById);

    renderLegend(balances);
    renderPie(balances);

    log('balances count:', balances.length);
    log('recent count:', recent.length);

    const exportBtn = $('#exportCsv');
    if (exportBtn) exportBtn.onclick = () => exportBalancesCsv(balances);
  } catch (e) {
    console.error(e);
    log('refreshAll() error', { message: e.message, code: e.code });
    toast('Failed to load admin data', { kind: 'error' });
  } finally {
    setMetric('#cardUpdated', formatDate(new Date().toISOString()));
  }
}

function wireEvents() {
  on($('#refresh'), 'click', refreshAll);
}

// ---------- init ----------
(async function init() {
  console.log('[dashboard] init');
  log('waiting…');
  showWhoAmI();
  await refreshAll();
  wireEvents();
})();
