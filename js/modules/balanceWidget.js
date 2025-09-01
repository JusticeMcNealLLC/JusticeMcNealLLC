// /js/modules/balanceWidget.js
import { getBalance } from './members.js';
import { formatCents } from '../shared/format.js';


export async function renderBalance({ memberId, nameEl, balanceEl }) {
if (!memberId) return;
const data = await getBalance(memberId);
if (data) {
if (nameEl) nameEl.textContent = data.full_name ?? 'Member';
if (balanceEl) balanceEl.textContent = formatCents(data.capital_balance_cents);
}
}