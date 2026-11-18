import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminDb } from "@/lib/firebase-admin";
import { signInWithPassword } from "@/lib/identity-toolkit";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await signInWithPassword(email, password);

    // Username lives in Firestore; fall back to the legacy custom claim / displayName.
    let username = null;
    try {
      const doc = await getAdminDb().collection("users").doc(user.uid).get();
      username = doc.exists ? doc.data().username || null : null;
    } catch {}
    username = username || user.claimUsername || user.displayName || null;

    const token = await createSessionToken({ uid: user.uid, email: user.email, username });
    const cookieStore = await cookies();
    const { name, ...options } = sessionCookieOptions();
    cookieStore.set(name, token, options);

    return NextResponse.json({ ok: true, uid: user.uid, email: user.email, username });
  } catch (err) {
    return NextResponse.json({ error: mapAuthError(err) }, { status: 401 });
  }
}

function mapAuthError(err) {
  const code = err?.identityToolkitCode || "";
  if (code.includes("USER_DISABLED")) return "This account has been disabled.";
  if (code.includes("TOO_MANY_ATTEMPTS_TRY_LATER")) return "Too many attempts. Try again later.";
  return "Incorrect email or password.";
}
