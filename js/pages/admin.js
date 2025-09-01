// /js/pages/admin.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';
import { signOut } from '../shared/auth.js';
import { APP } from '../shared/config.js';

// Add this to /js/shared/config.js:
// export const FUNCTIONS = {
//   adminInvite: 'https://onxkbrjtkparnldcjuqf.supabase.co/functions/v1/admin-invite',
// };
import { FUNCTIONS } from '../shared/config.js';

async function showWhoAmI() {
  const { data, error } = await supabase.auth.getUser();
  const who = $('#whoami');
  if (error || !data?.user) {
    who.textContent = 'Not signed in – redirecting…';
    window.location.href = '../pages/login.html';
    return;
  }
  who.textContent = `Signed in as ${data.user.email}`;
}

async function sendInvite(email) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('Missing session; please sign in again.');
  }
  const res = await fetch(FUNCTIONS.adminInvite, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(text);
  }
  return await res.json().catch(() => ({}));
}

function wireEvents() {
  $('#inviteBtn')?.addEventListener('click', async () => {
    const msg = $('#msg');
    const email = ($('#inviteEmail')?.value || '').trim();

    msg.className = 'mt-3 text-sm text-gray-500';
    msg.textContent = '';

    if (!email) {
      msg.textContent = 'Enter an email address.';
      return;
    }

    try {
      const btn = $('#inviteBtn');
      btn.disabled = true;
      btn.classList.add('opacity-60', 'cursor-not-allowed');

      await sendInvite(email);
      toast('Invite sent ✅', { kind: 'success', ms: 1500 });

      msg.className = 'mt-3 text-sm text-emerald-700';
      msg.textContent = 'Invite sent (check inbox).';
      $('#inviteEmail').value = '';
    } catch (e) {
      console.error(e);
      toast('Invite failed ❌', { kind: 'error' });
      msg.className = 'mt-3 text-sm text-red-700';
      msg.textContent = String(e?.message || e);
    } finally {
      const btn = $('#inviteBtn');
      btn.disabled = false;
      btn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
  });
}

(async function initAdmin() {
  console.log('[admin] init');
  await showWhoAmI();
  wireEvents();
})();
