// /js/pages/profile/index.js
import { supabase } from '/js/shared/supabaseClient.js';
import { toast } from '/js/shared/ui.js';

const $  = (s, r=document) => r.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

/* ------------------ helpers ------------------ */
function isRecoveryLike() {
  const hash = new URLSearchParams(location.hash.slice(1));
  return hash.get('type') === 'recovery' || hash.has('access_token') || hash.get('type') === 'invite';
}

async function getCurrentUser() {
  const u = (await supabase.auth.getUser()).data.user;
  if (u) return u;
  const s = (await supabase.auth.getSession()).data.session;
  return s?.user ?? null;
}

async function upsertMemberAuth(user) {
  const patch = { auth_user_id: user.id, email: user.email };
  const { error } = await supabase.from('members').upsert(patch, { onConflict: 'auth_user_id' });
  if (error) throw error;
}

async function loadMemberByAuthId(userId) {
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, phone, email')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function saveMember(memberId, patch) {
  const { error } = await supabase.from('members').update(patch).eq('id', memberId);
  if (error) throw error;
}

function validatePassword(pw, confirm) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters.';
  if (pw !== confirm) return 'Passwords do not match.';
  return null;
}

async function markInviteAcceptedIfAny() {
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) return;
  try { await supabase.rpc('admin_invite_mark_accepted', { p_email: email }); }
  catch (e) { console.warn('[profile] mark accepted RPC failed', e); }
}

/* ------------------ main ------------------ */
async function init() {
  // fields
  const whoami         = $('#whoami');
  const fullName       = $('#fullName');
  const phone          = $('#phone');
  const msg            = $('#msg');

  const currentEmailEl = $('#currentEmail');
  const newEmailEl     = $('#newEmail');
  const btnChangeEmail = $('#btnChangeEmail');
  const emailMsg       = $('#emailMsg');

  const newPw          = $('#newPassword');
  const confirmPw      = $('#confirmPassword');
  const updatePwBtn    = $('#updatePassword');
  const pwMsg          = $('#pwMsg');

  const saveBtn        = $('#saveProfile');
  const signOutBtn     = $('#signOut');

  try {
    const user = await getCurrentUser();
    if (!user) { location.replace('/pages/login.html'); return; }

    if (whoami) whoami.textContent = user.email || '—';
    if (currentEmailEl) currentEmailEl.value = user.email || '';

    // ensure member row exists, then load it
    await upsertMemberAuth(user);
    const member = await loadMemberByAuthId(user.id);

    if (member) {
      if (fullName) fullName.value = member.full_name ?? '';
      if (phone)    phone.value    = member.phone ?? '';
    } else if (msg) {
      msg.textContent = 'No member record found for this account.';
    }

    // save profile (name/phone)
    on(saveBtn, 'click', async () => {
      try {
        saveBtn.disabled = true;
        if (msg) msg.textContent = 'Saving…';
        if (!member) throw new Error('Member not found');
        await saveMember(member.id, {
          full_name: (fullName?.value || '').trim(),
          phone:      (phone?.value || '').trim(),
        });
        toast('Profile saved', { kind: 'success' });
        if (msg) msg.textContent = '';
      } catch (e) {
        console.error(e);
        toast('Failed to save profile', { kind: 'error' });
        if (msg) msg.textContent = 'Could not save. Check console.';
      } finally {
        saveBtn.disabled = false;
      }
    });

    // email change (sends verification to NEW email)
    on(btnChangeEmail, 'click', async () => {
      const next = (newEmailEl?.value || '').trim().toLowerCase();
      if (!next) { toast('Enter a new email', { kind: 'error' }); return; }
      if (next === (user.email || '').toLowerCase()) { toast('That is already your current email', { kind: 'error' }); return; }

      try {
        btnChangeEmail.disabled = true;
        if (emailMsg) emailMsg.textContent = 'Sending verification…';
        const { error } = await supabase.auth.updateUser({ email: next });
        if (error) throw error;
        toast('Verification sent to new address', { kind: 'success' });
        if (emailMsg) emailMsg.textContent = 'Check your inbox to confirm the new email.';
      } catch (e) {
        console.error(e);
        toast('Could not start email change', { kind: 'error' });
        if (emailMsg) emailMsg.textContent = 'Could not start email change.';
      } finally {
        btnChangeEmail.disabled = false;
      }
    });

    // password change
    if (isRecoveryLike() && pwMsg) {
      pwMsg.textContent = 'Set a new password to complete the reset.';
      if (newPw) newPw.focus();
    }
    on(updatePwBtn, 'click', async () => {
      const err = validatePassword(newPw?.value, confirmPw?.value);
      if (err) { toast(err, { kind: 'error' }); return; }

      try {
        updatePwBtn.disabled = true;
        if (pwMsg) pwMsg.textContent = 'Updating…';
        const { error } = await supabase.auth.updateUser({ password: newPw.value });
        if (error) throw error;

        await markInviteAcceptedIfAny();

        toast('Password updated', { kind: 'success' });
        if (newPw) newPw.value = '';
        if (confirmPw) confirmPw.value = '';
        if (pwMsg) pwMsg.textContent = '';

        if (isRecoveryLike()) setTimeout(() => location.replace('/pages/account.html'), 800);
      } catch (e) {
        console.error(e);
        toast('Failed to update password', { kind: 'error' });
        if (pwMsg) pwMsg.textContent = 'Could not update password.';
      } finally {
        updatePwBtn.disabled = false;
      }
    });

    // sign out
    on(signOutBtn, 'click', async () => {
      await supabase.auth.signOut();
      location.replace('/pages/login.html');
    });

  } catch (e) {
    console.error(e);
    toast('Error loading profile', { kind: 'error' });
    const msg = $('#msg');
    if (msg) msg.textContent = 'Error loading profile.';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
