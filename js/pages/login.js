// /js/pages/login.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';

function wireEvents() {
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value.trim();
    const msg = $('#msg');

    msg.className = 'mt-4 text-sm text-gray-500';
    msg.textContent = 'Signing in…';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast('Signed in ✅', { kind: 'success', ms: 1500 });
      msg.className = 'mt-4 text-sm text-emerald-700';
      msg.textContent = '✅ Signed in! Redirecting…';

      // Redirect to account page
      setTimeout(() => (window.location.href = '/account.html'), 800);
    } catch (err) {
      console.error(err);
      toast('Login failed ❌', { kind: 'error' });
      msg.className = 'mt-4 text-sm text-red-700';
      msg.textContent = '❌ ' + (err?.message || 'Login failed');
    }
  });
}

(async function initLogin() {
  console.log('[login] init');
  wireEvents();
})();
