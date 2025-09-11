// /js/shared/auth.js
import { supabase } from './supabaseClient.js';

const ADMIN_CACHE_KEY = 'isAdminCache';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) console.error('[auth] getSession error', error);
  return data?.session ?? null;
}

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error('[auth] getUser error', error);
  return data?.user ?? null;
}

// cache helpers (5 min TTL)
function getAdminCache(userId) {
  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const { id, isAdmin, ts } = JSON.parse(raw);
    if (id !== userId) return null;
    if (Date.now() - ts > 5 * 60 * 1000) return null;
    return isAdmin;
  } catch { return null; }
}
function setAdminCache(userId, value) {
  try {
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ id: userId, isAdmin: value, ts: Date.now() }));
  } catch {}
}

export async function isAdmin(userId) {
  if (!userId) return false;
  const cached = getAdminCache(userId);
  if (cached !== null) return cached;

  const { data, error } = await supabase
    .from('admins')
    .select('auth_user_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] isAdmin error', error);
    return false;
  }
  const ok = !!data;
  setAdminCache(userId, ok);
  return ok;
}

// 🚨 Only runs on pages with data-require-auth
export async function ensureAuthIfRequired() {
  const body = document.body;
  if (!body) return;

  const req = body.getAttribute('data-require-auth'); // "member" | "admin" | null
  if (!req) return; // Public page — do nothing

  // Check session
  let session = await getSession();
  if (!session) {
    const user = await getUser();
    if (user) session = { user };
  }

  if (!session) {
    const returnTo = encodeURIComponent(location.pathname + location.search + location.hash);
    window.location.href = `/pages/login.html?returnTo=${returnTo}`;
    return;
  }

  if (req === 'admin') {
    const ok = await isAdmin(session.user.id);
    if (!ok) {
      window.location.href = '/pages/account.html';
    }
  }
}

// Sign-in/out helpers
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  sessionStorage.removeItem(ADMIN_CACHE_KEY);
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  sessionStorage.removeItem(ADMIN_CACHE_KEY);
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    sessionStorage.removeItem(ADMIN_CACHE_KEY);
    const req = document.body?.getAttribute('data-require-auth');
    if (req) window.location.href = '/pages/login.html';
  }
});
