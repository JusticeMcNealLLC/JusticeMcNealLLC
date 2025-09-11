// /js/pages/index.js
import { supabase } from '/js/shared/supabaseClient.js';

async function whoami() {
  // session first
  const sess = (await supabase.auth.getSession()).data.session;
  if (sess?.user) return sess.user;
  // fallback right after auth transitions
  const user = (await supabase.auth.getUser()).data.user;
  return user ?? null;
}

(async function initIndex() {
  console.log('[index] init');
  try {
    const user = await whoami();
    if (user) {
      // Already logged in → go to account
      location.replace('/pages/account.html');
    } else {
      // Not logged in → go to login
      // Optionally include returnTo so they land in account after sign-in:
      const rt = encodeURIComponent('/pages/account.html');
      location.replace(`/pages/login.html?returnTo=${rt}`);
    }
  } catch (err) {
    console.error(err);
    // Fallback to login if something fails
    location.replace('/pages/login.html');
  }
})();
