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

// Changes a password: re-checks the current one first, then sets the new one.
// Throws an Error whose message is the Identity Toolkit code (for example
// INVALID_LOGIN_CREDENTIALS or WEAK_PASSWORD).
export async function changePassword(email, currentPassword, newPassword) {
  const data = await call("accounts:signInWithPassword", {
    email,
    password: currentPassword,
    returnSecureToken: true,
  });
  await call("accounts:update", {
    idToken: data.idToken,
    password: newPassword,
    returnSecureToken: false,
  });
  return true;
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

// Signs in (or creates the account) from a Google ID token obtained in the
// browser with Google Identity Services. Needs the Google provider enabled in
// Firebase console > Authentication > Sign-in method.
// Returns { uid, email, displayName, isNewUser, needsConfirmation }.
export async function signInWithGoogleIdToken(idToken, requestUri) {
  const data = await call("accounts:signInWithIdp", {
    postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
    requestUri: requestUri || "http://localhost",
    returnIdpCredential: true,
    returnSecureToken: true,
  });
  if (data.needConfirmation || !data.localId) {
    return { needsConfirmation: true };
  }
  let claimUsername = null;
  try {
    claimUsername = decodeJwt(data.idToken).username || null;
  } catch {}
  return {
    uid: data.localId,
    email: data.email || null,
    displayName: data.displayName || data.fullName || null,
    isNewUser: !!data.isNewUser,
    claimUsername,
  };
}
