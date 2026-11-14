// The Firebase Admin SDK can create/manage users but has NO api to verify a
// password or sign a user in — Google's docs are explicit that this check
// only exists on the client SDK or via the Identity Toolkit REST API.
// To keep this entirely server-side (no Firebase client SDK, ever loaded),
// we call that REST API directly from our Next.js server using the
// project's public Web API key (safe to use server-side; it only identifies
// the Firebase project, it is not a secret credential).

const WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

function requireWebApiKey() {
  if (!WEB_API_KEY) {
    throw new Error(
      "Missing FIREBASE_WEB_API_KEY env var (Firebase project's Web API key, found in Project Settings)."
    );
  }
  return WEB_API_KEY;
}

async function identityToolkitFetch(path, body) {
  const key = requireWebApiKey();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message || "UNKNOWN_ERROR";
    const err = new Error(code);
    err.identityToolkitCode = code;
    throw err;
  }
  return data;
}

// Verifies an email/password pair the same way the client SDK would,
// returning the resulting ID token on success. Throws on bad credentials.
export async function verifyPasswordAndGetIdToken(email, password) {
  const data = await identityToolkitFetch(
    "accounts:signInWithPassword",
    { email, password, returnSecureToken: true }
  );
  return data.idToken;
}

// Exchanges a custom token (minted by the Admin SDK) for a real ID token,
// used right after signup so we can immediately mint a session cookie.
export async function exchangeCustomTokenForIdToken(customToken) {
  const data = await identityToolkitFetch(
    "accounts:signInWithCustomToken",
    { token: customToken, returnSecureToken: true }
  );
  return data.idToken;
}
