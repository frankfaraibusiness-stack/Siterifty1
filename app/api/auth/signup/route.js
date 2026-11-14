import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { exchangeCustomTokenForIdToken } from "@/lib/identity-toolkit";
import { sessionCookieOptions } from "@/lib/session";

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email and password are all required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters: letters, numbers, dots or underscores.",
        },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    // Create the account with the Admin SDK.
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: username,
    });

    // Store the chosen handle as a custom claim, since Firebase Auth has
    // no native "username" field.
    await auth.setCustomUserClaims(userRecord.uid, { username });

    // Admin SDK can create accounts but cannot "sign in" with a password —
    // there's no such API. So we mint a custom token server-side with the
    // Admin SDK, then exchange it for an ID token via Google's Identity
    // Toolkit REST endpoint (using the public Web API key), entirely from
    // our server. No Firebase client SDK is used anywhere.
    const customToken = await auth.createCustomToken(userRecord.uid);
    const idToken = await exchangeCustomTokenForIdToken(customToken);

    // Turn the ID token into a long-lived, secure session cookie.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days, in ms
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    const { name, ...options } = sessionCookieOptions();
    cookieStore.set(name, sessionCookie, options);

    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      username,
      email,
    });
  } catch (err) {
    return NextResponse.json(
      { error: mapFirebaseError(err) },
      { status: 400 }
    );
  }
}

function mapFirebaseError(err) {
  const code = err?.errorInfo?.code || err?.code || "";
  if (code.includes("email-already-exists")) {
    return "An account with that email already exists.";
  }
  if (code.includes("invalid-email")) {
    return "That email address looks invalid.";
  }
  if (code.includes("invalid-password")) {
    return "Password must be at least 6 characters.";
  }
  return err?.message || "Something went wrong creating your account.";
}
