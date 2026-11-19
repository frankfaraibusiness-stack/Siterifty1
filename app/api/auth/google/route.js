import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { signInWithGoogleIdToken } from "@/lib/identity-toolkit";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";
import { ONBOARD_COOKIE, ONBOARD_COOKIE_VALUE, needsOnboarding, onboardCookieOptions } from "@/lib/onboarding";

export const runtime = "nodejs";

// POST { credential } -> signs in (or creates the account for) a Google user.
// `credential` is the ID token Google Identity Services hands the browser;
// Firebase verifies it, we never trust it directly.
export async function POST(request) {
  try {
    const { credential } = (await request.json().catch(() => ({}))) || {};
    if (typeof credential !== "string" || credential.length < 20 || credential.length > 4096) {
      return NextResponse.json({ error: "Google sign-in failed. Try again." }, { status: 400 });
    }

    const google = await signInWithGoogleIdToken(credential, new URL(request.url).origin);
    if (google.needsConfirmation) {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in with your password instead." },
        { status: 409 }
      );
    }

    const db = getAdminDb();
    const ref = db.collection("users").doc(google.uid);
    const snap = await ref.get();
    let username = snap.exists ? snap.data().username || null : null;
    // A brand-new profile does the welcome tour once; so does an unfinished one.
    let pending = snap.exists && needsOnboarding(snap.data());

    if (!username) {
      // First Google sign-in (or an older account with no profile yet): give
      // them a handle they can recognise. They can change their display name
      // from the profile page.
      username = await pickUsername(db, google);
      await ref.set(
        {
          username,
          usernameLower: username.toLowerCase(),
          displayName: google.displayName || username,
          theme: "vice",
          // New accounts start on the free plan; keep a plan if one already exists.
          plan: isPlanId(snap.exists ? snap.data().plan : null) ? snap.data().plan : DEFAULT_PLAN,
          hasAvatar: false,
          onboarded: false,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      pending = true;
    }

    const token = await createSessionToken({ uid: google.uid, email: google.email, username });
    const cookieStore = await cookies();
    const { name, ...options } = sessionCookieOptions();
    cookieStore.set(name, token, options);
    if (pending) {
      const { name: onboardName, ...onboardOptions } = onboardCookieOptions();
      cookieStore.set(onboardName, ONBOARD_COOKIE_VALUE, onboardOptions);
    } else {
      cookieStore.delete(ONBOARD_COOKIE);
    }

    return NextResponse.json({ ok: true, uid: google.uid, username, isNewUser: google.isNewUser, onboarding: pending });
  } catch (err) {
    return NextResponse.json({ error: mapError(err) }, { status: 401 });
  }
}

// 3-20 chars of letters, numbers, dots and underscores, unique (case-insensitive).
async function pickUsername(db, google) {
  const seed =
    google.claimUsername ||
    (google.email ? google.email.split("@")[0] : "") ||
    google.displayName ||
    "fan";
  let base = seed.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 14);
  if (base.length < 3) base = `${base}fan`.slice(0, 14);

  for (let i = 0; i < 8; i++) {
    const suffix = i === 0 ? "" : String(Math.floor(Math.random() * 9000) + 1000);
    const candidate = `${base}${suffix}`.slice(0, 20);
    const taken = await db
      .collection("users")
      .where("usernameLower", "==", candidate.toLowerCase())
      .limit(1)
      .get();
    if (taken.empty) return candidate;
  }
  return `fan${Date.now().toString(36)}`.slice(0, 20);
}

function mapError(err) {
  const code = err?.identityToolkitCode || "";
  if (code.includes("USER_DISABLED")) return "This account has been disabled.";
  if (code.includes("OPERATION_NOT_ALLOWED")) {
    return "Google sign-in isn’t switched on for this site yet.";
  }
  if (code.includes("INVALID_IDP_RESPONSE") || code.includes("INVALID_ID_TOKEN")) {
    return "Google sign-in failed. Check that the Google client ID matches your Firebase project.";
  }
  return "Google sign-in failed. Try again.";
}
