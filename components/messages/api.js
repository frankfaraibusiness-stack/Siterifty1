// Tiny fetch wrapper: JSON in, JSON out, errors carry the server's message.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Try again.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const post = (path, body) => api(path, { method: "POST", body });

export function makeClientId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20).padEnd(10, "0");
}
