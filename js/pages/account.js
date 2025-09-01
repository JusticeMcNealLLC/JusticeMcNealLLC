// /js/pages/account.js
import { supabase } from '../shared/supabaseClient.js';
import { $ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { signOut } from '../shared/auth.js';
import { formatCents, parseDollarsToCents, formatDate } from '../shared/format.js';

let memberId = null;
const dbg = () => $('#debug');
const log = (msg, obj) => {
  const box = dbg();
  if (!box) return;
  const line = typeof obj !== 'undefined' ? `${msg} ${JSON.stringify(obj, null, 2)}` : msg;
  box.textContent = (box.textContent || '') + (box.textContent ? '\n' : '') + line;
};

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

async function createMemberForCurrentUser(user) {
  // Adjust fields to match your members table schema
  const full_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member';
  const payload = { auth_user_id: user.id, full_name };
  log('Attempting to create members row:', payload);

  const { data, error } = await supabase.from('members').insert([payload]).select('id, full_name').maybeSingle();
  if (error) throw error;
  return data;
}

async function resolveMemberId() {
  // 1) Prefer explicit data-member-id if provided
  const htmlId = (document.body.dataset.memberId || '').trim();
  if (htmlId && htmlId !== '00000000-0000-0000-0000-000000000000') {
    log('Using memberId from data-member-id:', htmlId);
    return htmlId;
  }

  // 2) Otherwise, look up via members.auth_user_id
  const user = await getCurrentUser();
  if (!user) {
    log('No auth user — redirecting to login.html');
    window.location.href = '../pages/login.html';
    return null;
  }
  const who = $('#whoami');
  if (who) who.textContent = user.email || 'Signed in';
  log('Signed in as:', { id: user.id, email: user.email });

  let { data, error } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) {
    log('Error selecting members by auth_user_id:', error);
    throw error;
  }

  if (!data?.id) {
    log('No members row found for this user.');
    // Try to auto-create the members row once
    try {
      const created = await createMemberForCurrentUser(user);
      if (created?.id) {
        const nm = $('#memberName');
        if (nm) nm.textContent = created.full_name || 'Member';
        log('Created members row:', created);
        return created.id;
      }
    } catch (e) {
      log('Failed to create members row (check RLS/policies):', e);
      toast('No member profile found. Contact an admin.', { kind: 'error' });
      return null;
    }
  }

  const nm = $('#memberName');
  if (nm) nm.textContent = data.full_name || 'Member';
  log('Resolved memberId from members table:', data.id);
  return data.id;
}

async function fetchBalance(mid) {
  const { data, error } = await supabase
    .from('vw_capital_balances')
    .select('capital_balance_cents, full_name')
    .eq('member_id', mid)
    .maybeSingle();
  if (error) throw error;
  return data || { capital_balance_cents: 0, full_name: ($('#memberName')?.textContent || 'Member') };
}

async function refreshUI() {
  if (!memberId) return;
  log('Refreshing UI for memberId:', memberId);

  try {
    const bal = await fetchBalance(memberId);
    const balEl = $('#balance');
    if (balEl) balEl.textContent = formatCents(bal.capital_balance_cents);

    if (bal.full_name) {
      const who = $('#whoami');
      const nm = $('#memberName');
      if (who) who.textContent = bal.full_name;
      if (nm) nm.textContent = bal.full_name;
    }
    log('Balance fetched:', bal);
  } catch (err) {
    console.error(err);
    log('Error fetching balance:', err);
    toast('Failed to load balance', { kind: 'error' });
  }
}

async function refreshLedger() {
  if (!memberId) return;
  log('Refreshing ledger for memberId:', memberId);

  try {
    // Try robust selection set (handles missing columns gracefully)
    const { data, error } = await supabase
      .from('capital_ledger')
      .select('created_at,amount_cents,note')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(5);

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
    if (dbg()) dbg().textContent = JSON.stringify(rows, null, 2) || '[]';
    log('Ledger rows rendered:', rows.length);
  } catch (e) {
    console.error(e);
    log('Error loading ledger:', e);
    const tbody = $('#ledgerBody');
    if (tbody) tbody.innerHTML = '';
    if (dbg()) dbg().textContent = 'Error loading ledger: ' + (e?.message || e);
  }
}

function wireEvents() {
  const refreshBtn = $('#refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await refreshUI();
      await refreshLedger();
      toast('Refreshed', { kind: 'success', ms: 1200 });
    });
  }

  const signOutBtn = $('#signOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        await signOut();
        window.location.href = '../pages/login.html';
      } catch (e) {
        toast('Sign out failed', { kind: 'error' });
      }
    });
  }

  // Credit form
  const form = document.getElementById('creditForm');
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
        console.error(err);
        log('Error adding credit:', err);
        toast('Failed to add credit', { kind: 'error' });
      }
    });
  }
}

(async function initAccount() {
  console.log('[account] init');
  log('Init started.');
  try {
    memberId = await resolveMemberId();
    log('resolveMemberId() returned:', memberId);
    if (!memberId) {
      log('Stopping: no memberId.');
      return;
    }
    await refreshUI();
    await refreshLedger();
    wireEvents();
    log('Init complete.');
  } catch (e) {
    console.error(e);
    log('Fatal init error:', e);
    toast('Unable to load account. Please sign in again.', { kind: 'error' });
  }
})();
