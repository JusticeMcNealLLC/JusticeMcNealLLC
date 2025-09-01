// /js/pages/dashboard.js
import { $, $$ } from '../shared/dom.js';
import { renderBalance } from '../modules/balanceWidget.js';
import { addCredit, getMemberLedger } from '../modules/capitalLedger.js';
import { toast } from '../shared/ui.js';
import { formatCents, parseDollarsToCents, formatDate } from '../shared/format.js';


(async function init() {
console.log('[dashboard] init');
const memberId = document.body.dataset.memberId;


await renderBalance({
memberId,
nameEl: $('#memberName'),
balanceEl: $('#balance'),
});


// Example: simple credit form (if present)
const form = document.getElementById('creditForm');
if (form) {
form.addEventListener('submit', async (e) => {
e.preventDefault();
const dollars = form.amount.value.trim();
const note = form.note.value.trim();
try {
const row = await addCredit({
member_id: memberId,
amount_cents: parseDollarsToCents(dollars),
note,
});
toast('Credit added', { kind: 'success' });
form.reset();
await refreshLedger();
} catch (err) {
console.error(err);
toast('Failed to add credit', { kind: 'error' });
}
});
}


async function refreshLedger() {
const rows = await getMemberLedger(memberId);
const tbody = $('#ledgerBody');
if (tbody) {
tbody.innerHTML = rows
.map(r => `
<tr>
<td class="px-2 py-1">${formatDate(r.created_at)}</td>
<td class="px-2 py-1">${formatCents(r.amount_cents)}</td>
<td class="px-2 py-1">${r.note ?? ''}</td>
</tr>
`)
.join('');
}
}


await refreshLedger();
})();