import { supabase } from '/js/shared/supabaseClient.js';

(async function initIndex() {
  console.log('[index] init');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Signed in → stay here on Home (index.html)
      return;
    }
    // Not signed in → go to Login and come back to Home after
    const rt = encodeURIComponent('/index.html'); // or '/' if you prefer
    location.replace(`/pages/login.html?returnTo=${rt}`);
  } catch (err) {
    console.error(err);
    location.replace(`/pages/login.html?returnTo=${encodeURIComponent('/index.html')}`);
  }
})();
