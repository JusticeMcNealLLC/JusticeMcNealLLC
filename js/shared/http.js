// /js/shared/http.js

/** GET request that returns parsed JSON. */
export async function getJSON(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}\n${text}`);
  }
  return safeJson(res);
}

/** POST request with JSON body and JSON response. */
export async function postJSON(url, body = {}, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`POST ${url} failed: ${res.status} ${res.statusText}\n${text}`);
  }
  return safeJson(res);
}

/** PUT with JSON */
export async function putJSON(url, body = {}, opts = {}) {
  return postJSON(url, body, { ...opts, method: 'PUT' });
}

/** DELETE with optional JSON body */
export async function deleteJSON(url, body = {}, opts = {}) {
  return postJSON(url, body, { ...opts, method: 'DELETE' });
}

/* Helpers */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null; // no JSON body
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
