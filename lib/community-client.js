// Browser helper: one endpoint, many actions. Throws Error(message) on failure.
export async function communityApi(action, payload = {}) {
  const res = await fetch("/api/communities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || "Something went wrong. Try again.");
    err.fields = body.fields;
    err.status = res.status;
    throw err;
  }
  return body;
}
