// All Firebase Auth operations go through Google's Identity Toolkit REST API
// using the public Web API key. No firebase-admin/auth, no client SDK.
import { decodeJwt } from "jose";
import { firebaseConfig } from "@/lib/firebase-config";

async function call(path, body) {
  const key = firebaseConfig.apiKey;
  if (!key) throw new Error("Missing Firebase Web API key in lib/firebase-config.js.");
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

// Creates the account. Returns { uid, email, idToken }.
export async function signUpWithPassword(email, password, displayName) {
  const data = await call("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
  if (displayName) {
    await call("accounts:update", {
      idToken: data.idToken,
      displayName,
      returnSecureToken: false,
    }).catch(() => {});
  }
  return { uid: data.localId, email: data.email, idToken: data.idToken };
}

// Verifies email/password. Returns { uid, email, displayName, claimUsername }.
// claimUsername comes from the old custom claim, so existing accounts still work.
export async function signInWithPassword(email, password) {
  const data = await call("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  let claimUsername = null;
  try {
    claimUsername = decodeJwt(data.idToken).username || null;
  } catch {}
  return {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName || null,
    claimUsername,
  };
}

// Firebase emails the reset link itself (configure the template in the
// Firebase console > Authentication > Templates).
export async function sendPasswordReset(email, continueUrl) {
  return call("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
    ...(continueUrl ? { continueUrl } : {}),
  });
}
