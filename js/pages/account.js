// /js/pages/account.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { signOut } from '../shared/auth.js';
import { formatCents, parseDollarsToCents, formatDate } from '../shared/format.js';

let memberId = null;

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}

async function resolveMemberId() {
  // 1) Prefer explicit data-member-id if you set it server-side
  const htmlId = document.body.dataset.memberId?.trim();
  if (htmlId && htmlId !== '00000000-0000-0000-0000-000000000000') return htmlId;

  // 2) Otherwise, look up via members.auth_user_id
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  $('#whoami')?.textContent = user.email || 'Signed in';

  const { data, error } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    // No member row yet for this auth user
    toast('No member profile found. Contact an admin.', { kind: 'error' });
    return null;
  }

  // Optional: show name immediately
  $('#memberName')?.textContent = data.full_name || 'Member';
  return data.id;
}

async function fetchBalance(mid) {
  const { data, error } = await supabase
    .from('vw_capital_balances')
    .select('capital_balance_cents, full_name')
    .eq('member_id', mid)
    .maybeSingle(); // <-- handle zero rows

  if (error) throw error;
  // When no ledger rows exist yet, data can be null
  return data || { capital_balance_cents: 0, full_name: $('#memberName')?.textContent || 'Member' };
}

async function refreshUI() {
  if (!memberId) return;

  try {
    const bal = await fetchBalance(memberId);
    $('#balance')?.textContent = formatCents(bal.capital_balance_cents);
    if (bal.full_name) $('#whoami')?.textContent = bal.full_name;
    if (bal.full_name) $('#memberName')?.textContent = bal.full_name;
  } catch (err) {
    console.error(err);
    toast('Failed to load balance', { kind: 'error' });
  }
}

async function refreshLedger() {
  if (!memberId) return;
  try {
    const { data, error } = await supabase
      .from('capital_ledger')
      .select('created_at, amount_cents, note')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;

    const rows = data || [];
    const tbody = $('#ledgerBody');
    if (tbody) {
      tbody.innerHTML = rows
        .map(
          (r) => `
          <tr>
            <td class="px-2 py-1">${formatDate(r.created_at)}</td>
            <td class="px-2 py-1">${formatCents(r.amount_cents)}</td>
            <td class="px-2 py-1">${r.note ?? ''}</td>
          </tr>`
        )
        .join('');
    }
  } catch (e) {
    console.error(e);
    // Don’t toast on first run; keep console-only to avoid noisy UI
  }
}

function wireEvents() {
  $('#refresh')?.addEventListener('click', async () => {
    await refreshUI();
    await refreshLedger();
    toast('Refreshed', { kind: 'success', ms: 1200 });
  });

  $('#signOut')?.addEventListener('click', async () => {
    try {
      await signOut();
      window.location.href = '/login.html';
    } catch (e) {
      toast('Sign out failed', { kind: 'error' });
    }
  });

  // Stripe buttons (wire to your endpoints later)
  $('#startBtn')?.addEventListener('click', () => {
    toast('Checkout link not wired yet', { ms: 1500 });
  });
  $('#manageBtn')?.addEventListener('click', () => {
    toast('Portal link not wired yet', { ms: 1500 });
  });

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
        toast('Failed to add credit', { kind: 'error' });
      }
    });
  }
}

(async function initAccount() {
  console.log('[account] init');
  try {
    memberId = await resolveMemberId();
    if (!memberId) return; // stops here if no member row
    await refreshUI();
    await refreshLedger();
    wireEvents();
  } catch (e) {
    console.error(e);
    toast('Unable to load account. Please sign in again.', { kind: 'error' });
    // window.location.href = '/login.html'; // enable if you prefer redirect on error
  }
})();
