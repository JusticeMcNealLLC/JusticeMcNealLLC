// /js/pages/login.js
import { supabase } from '../shared/supabaseClient.js';
import { $, $$ } from '../shared/dom.js';
import { toast } from '../shared/ui.js';

function redirectToAccount() {
  // login.html lives in /pages/, so ./account.html stays inside /pages/
  window.location.href = './account.html';
}

function wireEvents() {
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value.trim();
    const msg = $('#msg');

    msg.className = 'mt-4 text-sm text-gray-500';
    msg.textContent = 'Signing in…';

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast('Signed in ✅', { kind: 'success', ms: 1200 });
      msg.className = 'mt-4 text-sm text-emerald-700';
      msg.textContent = '✅ Signed in! Redirecting…';
      setTimeout(redirectToAccount, 600);
    } catch (err) {
      console.error(err);
      toast('Login failed ❌', { kind: 'error' });
      msg.className = 'mt-4 text-sm text-red-700';
      msg.textContent = '❌ ' + (err?.message || 'Login failed');
    }
  });

  // Forgot password flow
  $('#forgotPw')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const msg = $('#msg');

    if (!email) {
      msg.className = 'mt-4 text-sm text-red-700';
      msg.textContent = 'Enter your email above first.';
      return;
    }

    // Build a correct absolute URL to /pages/profile.html
    // (login.html is also in /pages/, so ./profile.html resolves to the same folder)
   // Always send reset link to /pages/profile.html
const redirectTo = new URL('../pages/profile.html', window.location.href).href;


    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      toast('Reset email sent ✅', { kind: 'success', ms: 1500 });
      msg.className = 'mt-4 text-sm text-emerald-700';
      msg.textContent = 'Check your inbox for a password reset link.';
    } catch (err) {
      console.error(err);
      toast('Could not send reset email ❌', { kind: 'error' });
      msg.className = 'mt-4 text-sm text-red-700';
      msg.textContent = '❌ ' + (err?.message || 'Could not send reset email');
    }
  });
}

(async function initLogin() {
  console.log('[login] init');
  wireEvents();

  // If already logged in, skip login
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) redirectToAccount();
})();
