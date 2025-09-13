// /js/pages/login.js
import { supabase } from '/js/shared/supabaseClient.js';
import { $ , on } from '/js/shared/dom.js';
import { toast } from '/js/shared/ui.js';

function getReturnTo() {
  const p = new URLSearchParams(location.search);
  const rt = p.get('returnTo');
  return rt && rt.startsWith('/') && !rt.startsWith('//') ? rt : '/index.html';

}

function redirectTo(returnTo = getReturnTo()) {
  location.replace(returnTo);
}

async function markInviteAcceptedIfAny() {
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) return;
  try { await supabase.rpc('admin_invite_mark_accepted', { p_email: email }); }
  catch (e) { console.warn('[login] mark accepted RPC failed', e); }
}

async function initLogin() {
  console.log('[login] init');

  const form = $('#loginForm');
  const emailEl = $('#email');
  const pwEl = $('#password');
  const msg = $('#msg');
  const submitBtn = $('#submitBtn');
  const forgot = $('#forgotPw') || $('#forgotPassword');

  // Already signed in? bounce
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return redirectTo();

  // Sign in
  if (form) {
    on(form, 'submit', async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const password = pwEl.value;

      submitBtn && (submitBtn.disabled = true);
      if (msg) { msg.className = 'mt-4 text-sm text-gray-500'; msg.textContent = 'Signing in…'; }

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // double-check session & mark accepted
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session after sign-in');

        await markInviteAcceptedIfAny();   // ✅ mark invite accepted

        toast('Signed in ✅', { kind: 'success', ms: 1200 });
        if (msg) { msg.className = 'mt-4 text-sm text-emerald-700'; msg.textContent = '✅ Signed in! Redirecting…'; }
        redirectTo();
      } catch (err) {
        console.error(err);
        toast('Login failed ❌', { kind: 'error' });
        if (msg) { msg.className = 'mt-4 text-sm text-red-700'; msg.textContent = '❌ ' + (err?.message || 'Login failed'); }
      } finally {
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }

  // Forgot password → send recovery link to profile page
  if (forgot) {
    on(forgot, 'click', async (e) => {
      e.preventDefault();
      const address = emailEl.value.trim();
      if (!address) {
        if (msg) { msg.className = 'mt-4 text-sm text-red-700'; msg.textContent = 'Enter your email above first.'; }
        return;
      }
      const redirectToUrl = new URL('/pages/profile.html', location.origin).href;
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: redirectToUrl });
        if (error) throw error;
        toast('Reset email sent ✅', { kind: 'success', ms: 5000 });
        if (msg) { msg.className = 'mt-4 text-sm text-emerald-700'; msg.textContent = 'Check your inbox for a password reset link.'; }
      } catch (err) {
        console.error(err);
        toast('Could not send reset email ❌', { kind: 'error' });
        if (msg) { msg.className = 'mt-4 text-sm text-red-700'; msg.textContent = '❌ ' + (err?.message || 'Could not send reset email'); }
      }
    });
  }
}

initLogin();
