import { whoami } from '/js/shared/api.js';
import { $ } from './dom.js';

export async function updateWhoamiFromStatus(status) {
  const el = $('#whoami');
  if (!el) return;
  let txt = status?.member?.full_name || status?.member?.email || '';
  if (!txt) {
    try { const u = await whoami(); txt = u?.email || ''; } catch {}
  }
  if (txt) el.textContent = txt;
}
