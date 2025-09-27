// /js/pages/account/data.js
// Tiny sessionStorage SWR cache for account status
const KEY = 'acct:status';
const TTL = 60_000; // 60s

export async function getStatusSWR(fetchStatus /* () => Promise<status> */) {
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
  const now = Date.now();

  if (cached && (now - cached.t < TTL)) {
    // Refresh in background
    refresh(fetchStatus);
    return cached.v;
  }

  const v = await fetchStatus();
  sessionStorage.setItem(KEY, JSON.stringify({ t: now, v }));
  return v;
}

async function refresh(fetchStatus) {
  try {
    const v = await fetchStatus();
    sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v }));
  } catch {}
}
