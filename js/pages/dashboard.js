// /js/pages/dashboard.js
import { supabase } from '../shared/supabaseClient.js';
import { $ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { formatCents, parseDollarsToCents, formatDate } from '../shared/format.js';

let memberId = null;

function log(msg, obj) {
  const dbg = $('#debug');
  if (!dbg) return;
  const line = obj ? `${msg} ${JSON.stringify(obj, null, 2)}` : msg;
  dbg.textContent = (dbg.textContent || '') + (dbg.textContent ? '\n' : '') + line;
}

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

async function resolveMemberId() {
  // Prefer server-provided data-member-id if present & not the placeholder
  const htmlId = (document.body.dataset.memberId || '').trim();
  if (htmlId && htmlId !== '00000000-0000-0000-0000-000000000000') {
    log('Using memberId from data-member-id:', htmlId);
    return htmlId;
  }
  // Else map auth user → members.id
  const user = await getUser();
  if (!user) {
    log('No auth user — redirecting to login.');
    window.location.href = './login.html';
    return null;
  }
  $('#whoami') && ($('#whoami').textContent = user.email || 'Signed in');

  const { data, error } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) {
    log('Error selecting members row:', error);
    throw error;
  }
  if (!data?.id) {
    toast('No member profile found. Contact an admin.', { kind: 'error' });
    log('No members row for auth user.');
    return null;
  }

  $('#memberName') && ($('#memberName').textContent = data.full_name || 'Member');
  log('Resolved memberId:', data.id);
  return data.id;
}

// Try the view first; if it fails, fall back to summing ledger
async function fetchBalance(member_id) {
  try {
    const { data, error } = await supabase
      .from('vw_capital_balances')
      .select('capital_balance_cents, full_name')
      .eq('member_id', member_id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  } catch (e) {
    log('vw_capital_balances failed; falling back to sum:', e);
  }
  // Fallback: sum capital_ledger.amount_cents
  const { data: sumRows, error: sumErr } = await supabase
    .from('capital_ledger')
    .select('amount_cents')
    .eq('member_id', member_id);

  if (sumErr) throw sumErr;
  const total = (sumRows || []).reduce((acc, r) => acc + (Number(r.amount_cents) || 0), 0);
  return { capital_balance_cents: total, full_name: $('#memberName')?.textContent || 'Member' };
}

async function refreshUI() {
  if (!memberId) return;
  const bal = await fetchBalance(memberId);
  const nameEl = $('#memberName');
  const balEl = $('#balance');
  if (nameEl && bal.full_name) nameEl.textContent = bal.full_name;
  if (balEl) balEl.textContent = formatCents(bal.capital_balance_cents);
  log('Balance:', bal);
}

async function refreshLedger() {
  if (!memberId) return;
  try {
    const { data, error } = await supabase
      .from('capital_ledger')
      .select('created_at, amount_cents, note')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    const rows = data || [];
    const tbody = $('#ledgerBody');
    if (tbody) {
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td class="px-2 py-1">${r.created_at ? formatDate(r.created_at) : '—'}</td>
          <td class="px-2 py-1">${formatCents(r.amount_cents)}</td>
          <td class="px-2 py-1">${r.note ?? ''}</td>
        </tr>
      `).join('');
    }
    $('#debug') && ($('#debug').textContent = JSON.stringify(rows, null, 2));
    log('Ledger rows rendered:', rows.length);
  } catch (e) {
    log('Ledger load error:', e);
    const tbody = $('#ledgerBody');
    if (tbody) tbody.innerHTML = '';
  }
}

function wireEvents() {
  const form = $('#creditForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!memberId) return;
      const dollars = form.amount.value.trim();
      const note = form.note.value.trim();
      try {
        const amount_cents = parseDollarsToCents(dollars);
        const { error } = await supabase
          .from('capital_ledger')
          .insert([{ member_id: memberId, amount_cents, note }]);
        if (error) throw error;
        toast('Credit added', { kind: 'success' });
        form.reset();
        await refreshUI();
        await refreshLedger();
      } catch (err) {
        toast('Failed to add credit', { kind: 'error' });
        log('Insert error:', err);
      }
    });
  }

  $('#refresh') && $('#refresh').addEventListener('click', async () => {
    await refreshUI();
    await refreshLedger();
    toast('Refreshed', { kind: 'success', ms: 1200 });
  });
}

(async function init() {
  console.log('[dashboard] init');
  try {
    memberId = await resolveMemberId();
    if (!memberId) return;
    await refreshUI();
    await refreshLedger();
    wireEvents();
  } catch (e) {
    log('Fatal init error:', e);
    toast('Unable to load dashboard', { kind: 'error' });
  }
})();
