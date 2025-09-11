// /js/shared/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, APP } from './config.js';

// Create a singleton Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // useful if you ever use magic links
  },
});

// Debug: expose only when APP.debug = true
if (typeof window !== 'undefined' && APP.debug) {
  window.supabaseClient = supabase;
  console.info('[supabaseClient] Exposed supabaseClient to window (debug mode)');
}
