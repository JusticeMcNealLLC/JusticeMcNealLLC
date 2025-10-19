export async function handleEmailUpdate(e, { toast } = {}) {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  const email = document.getElementById('newEmail')?.value?.trim();
  if (!email) { toast?.('Enter a valid email.', 'err'); return; }

  const supabase = window.supabaseClient || window.supabase;

  try {
    btn && (btn.disabled = true);
    if (!supabase) {
      toast?.('Email change simulated (no backend).', 'info');
      return;
    }
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;

    toast?.('Email updated. Check your inbox to verify.', 'ok');
  } catch (err) {
    console.error('[updateEmail]', err);
    toast?.(err?.message || 'Could not update email.', 'err');
  } finally {
    btn && (btn.disabled = false);
  }
}
