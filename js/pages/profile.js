// /js/pages/profile.js
import { supabase } from '/js/shared/supabaseClient.js';
import { $, on } from '/js/shared/dom.js';
import { toast } from '/js/shared/ui.js';

function isRecovery() {
  const hash = new URLSearchParams(location.hash.slice(1));
  return hash.get('type') === 'recovery' || hash.has('access_token');
}

async function getCurrentUser() {
  const u = (await supabase.auth.getUser()).data.user;
  if (u) return u;
  const s = (await supabase.auth.getSession()).data.session;
  return s?.user ?? null;
}

async function loadMember(userId) {
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, phone')
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
  // RPC: marks latest invite row for this email as accepted
  try { await supabase.rpc('admin_invite_mark_accepted', { p_email: email }); }
  catch (e) { console.warn('[profile] mark accepted RPC failed', e); }
}

async function init() {
  console.log('[profile] init');

  const whoami = $('#whoami');
  const fullName = $('#fullName');
  const phone = $('#phone');
  const msg = $('#msg');

  const newPw = $('#newPassword');
  const confirmPw = $('#confirmPassword');
  const updatePwBtn = $('#updatePassword');

  const saveBtn = $('#saveProfile');
  const signOutBtn = $('#signOut');

  try {
    const user = await getCurrentUser();
    if (!user) return location.replace('/pages/login.html');
    whoami && (whoami.textContent = user.email);

    // Load member
    const member = await loadMember(user.id);
    if (!member) {
      msg && (msg.textContent = 'No member record found for this account.');
    } else {
      if (fullName) fullName.value = member.full_name ?? '';
      if (phone) phone.value = member.phone ?? '';
    }

    // Save profile
    if (saveBtn && member) {
      on(saveBtn, 'click', async () => {
        try {
          saveBtn.disabled = true;
          msg && (msg.textContent = 'Saving…');
          await saveMember(member.id, {
            full_name: fullName?.value.trim() ?? '',
            phone: phone?.value.trim() ?? '',
          });
          toast('Profile saved', { kind: 'success' });
          msg && (msg.textContent = '');
        } catch (e) {
          console.error(e);
          toast('Failed to save profile', { kind: 'error' });
          msg && (msg.textContent = 'Could not save. Check console for details.');
        } finally {
          saveBtn.disabled = false;
        }
      });
    }

    // Recovery hint
    if (isRecovery()) {
      msg && (msg.textContent = 'Set a new password to complete the reset.');
      newPw?.focus();
    }

    // Change password
    if (updatePwBtn) {
      on(updatePwBtn, 'click', async () => {
        const err = validatePassword(newPw?.value, confirmPw?.value);
        if (err) return toast(err, { kind: 'error' });

        try {
          updatePwBtn.disabled = true;
          const { error } = await supabase.auth.updateUser({ password: newPw.value });
          if (error) throw error;

          // ✅ mark invite accepted after successful password set
          await markInviteAcceptedIfAny();

          toast('Password updated', { kind: 'success' });
          if (newPw) newPw.value = '';
          if (confirmPw) confirmPw.value = '';

          if (isRecovery()) setTimeout(() => location.replace('/pages/account.html'), 800);
        } catch (e) {
          console.error(e);
          toast('Failed to update password', { kind: 'error' });
        } finally {
          updatePwBtn.disabled = false;
        }
      });
    }

    // Sign out
    if (signOutBtn) {
      on(signOutBtn, 'click', async () => {
        await supabase.auth.signOut();
        location.replace('/pages/login.html');
      });
    }
  } catch (e) {
    console.error(e);
    toast('Error loading profile', { kind: 'error' });
    msg && (msg.textContent = 'Error loading profile.');
  }
}

init();
