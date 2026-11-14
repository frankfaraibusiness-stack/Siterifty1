import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { verifyPasswordAndGetIdToken } from "@/lib/identity-toolkit";
import { sessionCookieOptions } from "@/lib/session";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const idToken = await verifyPasswordAndGetIdToken(email, password);

    const auth = getAdminAuth();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days, in ms
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    const decoded = await auth.verifySessionCookie(sessionCookie);

    const cookieStore = await cookies();
    const { name, ...options } = sessionCookieOptions();
    cookieStore.set(name, sessionCookie, options);

    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email,
      username: decoded.username || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: mapAuthError(err) },
      { status: 401 }
    );
  }
}

function mapAuthError(err) {
  const code = err?.identityToolkitCode || "";
  if (code.includes("EMAIL_NOT_FOUND") || code.includes("INVALID_PASSWORD") || code.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Incorrect email or password.";
  }
  if (code.includes("USER_DISABLED")) {
    return "This account has been disabled.";
  }
  if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) {
    return "Too many attempts. Try again later.";
  }
  return "Incorrect email or password.";
}
