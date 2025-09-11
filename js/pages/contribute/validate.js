export function clampPledge(n) {
  const stepped = Math.round((Number(n) || 0) / 10) * 10;
  const v = Math.max(50, Math.min(2000, stepped));
  return v >= 50 ? v : 0;
}

export function fmtUSD0(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
