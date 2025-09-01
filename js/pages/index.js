// /js/pages/index.js
import { supabase } from '../shared/supabaseClient.js';

(async function initIndex() {
  console.log('[index] init');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (data?.session?.user) {
      // Already logged in → go to account
      window.location.href = '../pages/account.html';
    } else {
      // Not logged in → go to login
      window.location.href = '../pages/login.html';
    }
  } catch (err) {
    console.error(err);
    // Fallback to login if something fails
    window.location.href = '../pages/login.html';
  }
})();