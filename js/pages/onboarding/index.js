// /js/pages/onboarding/index.js
import { supabase } from '/js/shared/supabaseClient.js';
import { toast } from '/js/shared/ui.js';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

function isRecoveryLike() {
  const hash = new URLSearchParams(location.hash.slice(1));
  // Covers recovery / invite / magiclink flows (access_token present)
  return hash.get('type') === 'recovery' || hash.get('type') === 'invite' || hash.has('access_token');
}

function step(n) {
  // show/hide sections
  for (let i=1;i<=3;i++) $('#step-'+i)?.classList.toggle('hidden', i!==n);
  // update dots
  for (let i=1;i<=3;i++) {
    const d = $('#dot-'+i);
    if (!d) continue;
    d.classList.toggle('bg-gray-50', i>n);
    d.classList.toggle('bg-emerald-50', i<=n);
    d.classList.toggle('border-emerald-200', i<=n);
  }
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
  catch (e) { console.warn('[onboarding] mark accepted RPC failed', e); }
}

async function getUser() {
  const u = (await supabase.auth.getUser()).data.user;
  if (u) return u;
  const s = (await supabase.auth.getSession()).data.session;
  return s?.user ?? null;
}

async function ensureMemberRow(user) {
  // Upsert into members keyed by auth_user_id so they exist immediately
  const patch = {
    auth_user_id: user.id,
    email: user.email,
  };
  const { error } = await supabase
    .from('members')
    .upsert(patch, { onConflict: 'auth_user_id' });
  if (error) throw error;
}

async function saveMemberFields({ full_name, phone }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('members')
    .update({ full_name, phone })
    .eq('auth_user_id', user.id);
  if (error) throw error;
}

async function init() {
  const pwBtn = $('#btnSetPassword');
  const newPw = $('#newPassword');
  const conf  = $('#confirmPassword');
  const pwMsg = $('#pwMsg');

  const saveBtn = $('#btnSaveDetails');
  const full    = $('#fullName');
  const phone   = $('#phone');
  const emailEl = $('#email');
  const dMsg    = $('#detailsMsg');

  try {
    const user = await getUser();
    if (!user) return location.replace('/pages/login.html');

    // Pre-fill email, ensure member exists
    if (emailEl) emailEl.value = user.email || '';
    await ensureMemberRow(user);

    // Decide which step to show first:
    // - If URL has recovery/invite tokens OR we can't be sure a password exists -> show Step 1
    // - Otherwise (normal signed-in session) -> skip to Step 2
    // Heuristic: if email is confirmed or there's a provider, assume password exists
    const hasPw = !!user?.app_metadata?.provider || !!user?.email_confirmed_at;
    if (isRecoveryLike() || !hasPw) {
      step(1);
    } else {
      step(2);
    }

    // Step 1: set password
    pwBtn?.addEventListener('click', async (e) => {
      e.preventDefault();

      const err = validatePassword(newPw?.value, conf?.value);
      if (err) { toast(err, { kind: 'error' }); return; }

      try {
        pwBtn.disabled = true;
        if (newPw?.value) {
          const { error } = await supabase.auth.updateUser({ password: newPw.value });
          if (error) throw error;
          toast('Password saved', { kind: 'success' });
          await markInviteAcceptedIfAny(); // keep your current behavior
        }
        // clear inputs & advance
        if (newPw) newPw.value = '';
        if (conf) conf.value = '';
        if (pwMsg) pwMsg.textContent = '';
        step(2);
        full?.focus();
      } catch (e2) {
        console.error(e2);
        toast('Failed to set password', { kind: 'error' });
        if (pwMsg) pwMsg.textContent = 'Could not set password. Try again.';
      } finally {
        pwBtn.disabled = false;
      }
    });

    // Step 2: save details
    saveBtn?.addEventListener('click', async (e) => {
      e.preventDefault();

      const nameVal = (full?.value || '').trim();
      const phoneVal = (phone?.value || '').trim();
      if (!nameVal) { toast('Please enter your full name.', { kind: 'error' }); return; }

      try {
        saveBtn.disabled = true;
        if (dMsg) dMsg.textContent = 'Saving…';
        await saveMemberFields({ full_name: nameVal, phone: phoneVal });
        toast('Saved', { kind: 'success' });
        if (dMsg) dMsg.textContent = '';
        step(3);
      } catch (e3) {
        console.error(e3);
        toast('Failed to save details', { kind: 'error' });
        if (dMsg) dMsg.textContent = 'Could not save. Check console.';
      } finally {
        saveBtn.disabled = false;
      }
    });

  } catch (e) {
    console.error(e);
    toast('Error loading onboarding', { kind: 'error' });
  }
}

document.addEventListener('DOMContentLoaded', init);
