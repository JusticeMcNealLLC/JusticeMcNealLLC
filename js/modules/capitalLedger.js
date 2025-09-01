// /js/modules/capitalLedger.js
import { supabase } from '../shared/supabaseClient.js';


export async function addCredit({ member_id, amount_cents, note }) {
const { data, error } = await supabase
.from('capital_ledger')
.insert([{ member_id, amount_cents, note }])
.select('*')
.single();
if (error) throw error;
return data;
}


export async function getMemberLedger(member_id) {
const { data, error } = await supabase
.from('capital_ledger')
.select('created_at, amount_cents, note')
.eq('member_id', member_id)
.order('created_at', { ascending: false });
if (error) throw error;
return data || [];
}