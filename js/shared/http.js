// /js/shared/http.js
export async function getJSON(url, opts = {}) {
const res = await fetch(url, { ...opts, headers: { 'Accept': 'application/json', ...(opts.headers||{}) } });
if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
return await res.json();
}


export async function postJSON(url, body = {}, opts = {}) {
const res = await fetch(url, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(opts.headers||{}) },
body: JSON.stringify(body),
...opts,
});
if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
return await res.json();
}