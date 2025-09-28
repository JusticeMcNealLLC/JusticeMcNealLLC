// /js/contribute/utils/format.js
export function fmtUSD(n, opts = {}) {
	if (n == null || Number.isNaN(+n)) return '—';
	const decimals = Number.isFinite(+opts.decimals) ? +opts.decimals : 0;
	return (+n).toLocaleString(undefined, {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: decimals,
		minimumFractionDigits: decimals,
	});
}


export function toDate(value) {
if (value == null) return null;
if (value instanceof Date) return value;
if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value); // secs vs ms
if (typeof value === 'string') {
const num = Number(value);
if (Number.isFinite(num) && value.trim().length <= 10) return new Date(num < 1e12 ? num * 1000 : num);
return new Date(value);
}
return null;
}
export function fmtDate(value, opts = {}) {
	try {
		const d = toDate(value);
		if (!d || Number.isNaN(+d)) return '—';
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', ...opts });
	} catch {
		return '—';
	}
}