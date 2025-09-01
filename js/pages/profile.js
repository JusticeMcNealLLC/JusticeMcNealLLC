// /js/pages/profile.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { signOut } from '../shared/auth.js';

function isRecovery() {
  // Supabase appends hash params like #access_token=...&type=recovery
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return (hash.get('type') === 'recovery') || hash.has('access_token');
}

async function showWhoAmI() {
  const { data, error } = await supabase.auth.getUser();
  const who = $('#whoami');
  if (error || !data?.user) {
    if (who) who.textContent = 'Not signed in – redirecting…';
    window.location.href = '../login.html'; // profile is in /pages/
    return;
  }
  if (who) who.textContent = `Signed in as ${data.user.email}`;
}

function wireEvents() {
  $('#pwForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwInput = $('#newPw');
    const pw = pwInput.value.trim();
    const msg = $('#msg');

    if (!pw || pw.length < 8) {
      msg.className = 'mt-3 text-sm text-red-700';
      msg.textContent = 'Password must be at least 8 characters.';
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      msg.className = 'mt-3 text-sm text-emerald-700';
      msg.textContent = '✅ Password updated';
      $('#pwForm').reset();
      toast('Password updated', { kind: 'success' });

      // After a recovery reset, take them to account
      if (isRecovery()) {
        setTimeout(() => (window.location.href = './account.html'), 800);
      }
    } catch (err) {
      console.error(err);
      msg.className = 'mt-3 text-sm text-red-700';
      msg.textContent = '❌ ' + (err?.message || 'Password update failed');
      toast('Password update failed', { kind: 'error' });
    }
  });

  $('#logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut();
      window.location.href = '../index.html';
    } catch (err) {
      toast('Sign out failed', { kind: 'error' });
    }
  });
}

(async function initProfile() {
  console.log('[profile] init');
  await showWhoAmI();

  if (isRecovery()) {
    const msg = $('#msg');
    if (msg) {
      msg.className = 'mt-3 text-sm text-blue-700';
      msg.textContent = 'Set a new password to complete the reset.';
    }
    // Optionally, focus the field
    $('#newPw')?.focus();
  }

  wireEvents();
})();
