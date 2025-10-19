export async function handlePasswordUpdate(e, { toast } = {}) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  const current = document.getElementById('currentPassword')?.value?.trim();
  const next = document.getElementById('newPassword')?.value?.trim();

  if (!current || !next) { toast?.('Fill out both fields.', 'err'); return; }
  if (next.length < 8)   { toast?.('Use at least 8 characters.', 'err'); return; }

  const supabase = window.supabaseClient || window.supabase;

  try {
    btn && (btn.disabled = true);
    if (!supabase) {
      toast?.('Password change simulated (no backend).', 'info'); 
      form.reset(); 
      return;
    }

    // (Supabase doesn’t require current password here; if you need reauth, add server-side check.)
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw error;

    toast?.('Password updated successfully.', 'ok');
    form.reset();
  } catch (err) {
    console.error('[updatePassword]', err);
    toast?.(err?.message || 'Could not update password.', 'err');
  } finally {
    btn && (btn.disabled = false);
  }
}
