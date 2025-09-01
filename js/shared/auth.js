// /js/shared/auth.js
import { supabase } from './supabaseClient.js';


export async function getSession() {
const { data, error } = await supabase.auth.getSession();
if (error) console.error('[auth] getSession error', error);
return data?.session ?? null;
}


export async function ensureAuthIfRequired() {
const needsAuth = document.body.hasAttribute('data-require-auth');
if (!needsAuth) return;
const session = await getSession();
if (!session) {
// Route to login page if not authenticated
window.location.href = '/login.html';
}
}


export async function signInWithPassword(email, password) {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
return data.user;
}


export async function signOut() {
const { error } = await supabase.auth.signOut();
if (error) throw error;
}