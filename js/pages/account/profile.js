// Entry for /pages/account.html
import { handleAvatarUpload } from './uploadAvatar.js';
import { handleEmailUpdate } from './updateEmail.js';
import { handlePasswordUpdate } from './updatePassword.js';

/* --- tiny toast system (gold theme) ---------------------- */
function ensureToastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'fixed z-[1000] top-4 right-4 space-y-2';
    document.body.appendChild(host);
  }
  return host;
}

export function toast(msg, type = 'ok') {
  const host = ensureToastHost();
  const el = document.createElement('div');
  const base =
    'rounded-lg px-4 py-2 text-sm shadow-2xl border backdrop-blur ' +
    'transition-all duration-300 translate-y-0';
  const styles = {
    ok:   'bg-[rgba(212,175,55,.12)] border-[rgba(212,175,55,.35)] text-[#EED488]',
    err:  'bg-[rgba(239,68,68,.12)] border-[rgba(239,68,68,.35)] text-[#f87171]',
    info: 'bg-white/10 border-white/20 text-white/90'
  };
  el.className = `${base} ${styles[type] || styles.info}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    setTimeout(() => el.remove(), 280);
  }, 2000);
}

/* --- boot ----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Avatar
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('profileUpload');
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleAvatarUpload(e, { toast }));
  }

  // Email
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', (e) => handleEmailUpdate(e, { toast }));
  }

  // Password
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => handlePasswordUpdate(e, { toast }));
  }
});
