// /js/modules/members.js
import { supabase } from '../shared/supabaseClient.js';


export async function getMember(member_id) {
const { data, error } = await supabase
.from('members')
.select('*')
.eq('id', member_id)
.single();
if (error) throw error;
return data;
}


export async function getBalance(member_id) {
const { data, error } = await supabase
.from('vw_capital_balances')
.select('capital_balance_cents, full_name')
.eq('member_id', member_id)
.single();
if (error) throw error;
return data;
}