// /js/navbar/state.js
import { $ } from './dom.js';

function initials(src = '', fb = 'U') {
  const base = (src || '').trim();
  if (!base) return fb;
  const parts = base.split(/\s+/);
  const ii = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return (ii || base[0] || fb).toUpperCase();
}

async function getSupabase() {
  if (window.supabase) return window.supabase;
  try {
    const m = await import('/js/shared/supabaseClient.js');
    if (m?.supabase) {
      window.supabase = m.supabase;
      return m.supabase;
    }
  } catch {}
  return null;
}

export async function hydrateFromSupabase() {
  const sb = await getSupabase();
  if (!sb || !sb.auth || !sb.auth.getUser) return;

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    let isAdmin = false;
    let full    = user.user_metadata?.full_name || '';
    let email   = user.email || '';

    try {
      const { data: me } = await sb
        .from('members')
        .select('is_admin, full_name, email')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (me) {
        isAdmin = !!me.is_admin;
        full    = me.full_name || full || '';
        email   = me.email || email || '';
      }
    } catch {}

    const first = (full || email.split('@')[0] || '').split(' ')[0] || '';

    // Fill profile UI (no optional-chaining on assignment)
    const helloEl = $('#nav-hello');
    if (helloEl) helloEl.textContent = first || 'there';

    const nameEl = $('#nav-name');
    if (nameEl) nameEl.textContent = full || first || '—';

    const emailEl = $('#nav-email');
    if (emailEl) emailEl.textContent = email || '—';

    const avatarEl = $('#nav-avatar');
    if (avatarEl && (avatarEl.textContent || '').trim() === '') {
      avatarEl.textContent = initials(full || email);
    }

    // Gate admin-only sections
    const adminDesktop = document.getElementById('nav-admin-desktop');
    if (adminDesktop) adminDesktop.classList.toggle('hidden', !isAdmin);

    const adminMobile = document.getElementById('nav-admin-mobile');
    if (adminMobile) adminMobile.classList.toggle('hidden', !isAdmin);
  } catch {
    // never block the page
  }
}

export async function setupSignOut() {
  const sb = await getSupabase();
  const goLogin = () => location.assign('/pages/login.html');

  const handler = async () => {
    if (sb && sb.auth && sb.auth.signOut) {
      try { await sb.auth.signOut(); } catch {}
    }
    goLogin();
  };

  const a = document.getElementById('nav-signout');
  if (a) a.addEventListener('click', handler);

  const b = document.getElementById('nav-signout-drawer');
  if (b) b.addEventListener('click', handler);
}

export async function watchAuth() {
  const sb = await getSupabase();
  if (!sb || !sb.auth || !sb.auth.onAuthStateChange) return;
  sb.auth.onAuthStateChange(() => { hydrateFromSupabase(); });
}
