// /js/pages/account.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { signOut } from '../shared/auth.js';
import { formatCents } from '../shared/format.js';

// If you already have members.js with getBalance(), use that.
// Here we query the balance view directly for clarity.
async function fetchBalance(memberId) {
  const { data, error } = await supabase
    .from('vw_capital_balances')
    .select('capital_balance_cents, full_name')
    .eq('member_id', memberId)
    .single();
  if (error) throw error;
  return data;
}

async function getSessionEmail() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.user?.email ?? null;
}

async function refreshUI() {
  const memberId = document.body.dataset.memberId;
  if (!memberId) return;

  try {
    const balanceRow = await fetchBalance(memberId);
    $('#balance').textContent = formatCents(balanceRow.capital_balance_cents);
    $('#whoami').textContent = balanceRow.full_name || 'Member';
  } catch (err) {
    console.error(err);
    toast('Failed to load balance', { kind: 'error' });
  }
}

function wireEvents() {
  $('#refresh')?.addEventListener('click', async () => {
    await refreshUI();
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

  // Stripe actions: set these hrefs or click handlers to your endpoints/functions
  $('#startBtn')?.addEventListener('click', async () => {
    // Example: call your serverless function to create a Checkout Session
    // const res = await fetch('/api/create-checkout-session', { method: 'POST' });
    // const { url } = await res.json();
    // window.location.href = url;
    toast('Checkout link not wired yet', { ms: 1500 });
  });

  $('#manageBtn')?.addEventListener('click', async () => {
    // Example: call your serverless function to create a Customer Portal session
    // const res = await fetch('/api/create-portal-session', { method: 'POST' });
    // const { url } = await res.json();
    // window.location.href = url;
    toast('Portal link not wired yet', { ms: 1500 });
  });
}

(async function initAccount() {
  console.log('[account] init');
  wireEvents();

  // Optional: show email under whoami while we fetch name/balance
  const email = await getSessionEmail();
  if (email) $('#whoami').textContent = email;

  await refreshUI();

  // Debug block: show the last 5 ledger entries (optional)
  try {
    const memberId = document.body.dataset.memberId;
    const { data: rows } = await supabase
      .from('capital_ledger')
      .select('created_at, amount_cents, note')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(5);

    const dbg = $('#debug');
    if (dbg && rows) {
      dbg.textContent = JSON.stringify(rows, null, 2);
    }
  } catch (e) {
    // ignore debug errors
  }
})();
