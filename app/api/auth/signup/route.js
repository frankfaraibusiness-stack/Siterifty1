import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { signUpWithPassword } from "@/lib/identity-toolkit";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";
import { DEFAULT_PLAN } from "@/lib/plans";
import { ONBOARD_COOKIE_VALUE, onboardCookieOptions } from "@/lib/onboarding";
import { claimReferral } from "@/lib/referrals-data";
import { getCharacter } from "@/lib/characters";
import { detectCountry } from "@/lib/geo";

export async function POST(request) {
  try {
    const { username, email, password, character: characterId } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email and password are all required." },
        { status: 400 }
      );
    }
    // Every new account starts as Lucia or Jason; the pick is required (it also tells us who our players are).
    const character = getCharacter(characterId);
    if (!character) {
      return NextResponse.json(
        { error: "Pick your character, Lucia or Jason, to create your account." },
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
        { error: "Username must be 3-20 characters: letters, numbers, dots or underscores." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const taken = await db
      .collection("users")
      .where("usernameLower", "==", username.toLowerCase())
      .limit(1)
      .get();
    if (!taken.empty) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 400 }
      );
    }

    const user = await signUpWithPassword(email, password, username);

    await db.collection("users").doc(user.uid).set({
      username,
      usernameLower: username.toLowerCase(),
      displayName: username,
      theme: "vice",
      plan: DEFAULT_PLAN,
      // The character is the starting profile picture (served by /avatar/[username] until a photo is uploaded).
      character: character.id,
      gender: character.gender,
      // Where they signed up from (two-letter code), or "unknown" when the host could not tell.
      country: detectCountry(request.headers),
      hasAvatar: true,
      // Every new account does the 3-step welcome tour once (/welcome).
      onboarded: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Came in through someone's referral link? Count it for them (never fails the sign-up).
    await claimReferral({ uid: user.uid, username });

    const token = await createSessionToken({ uid: user.uid, email: user.email, username });
    const cookieStore = await cookies();
    const { name, ...options } = sessionCookieOptions();
    cookieStore.set(name, token, options);
    const { name: onboardName, ...onboardOptions } = onboardCookieOptions();
    cookieStore.set(onboardName, ONBOARD_COOKIE_VALUE, onboardOptions);

    return NextResponse.json({ ok: true, uid: user.uid, username, email: user.email, onboarding: true });
  } catch (err) {
    return NextResponse.json({ error: mapError(err) }, { status: 400 });
  }
}

function mapError(err) {
  const code = err?.identityToolkitCode || "";
  if (code.includes("EMAIL_EXISTS")) return "An account with that email already exists.";
  if (code.includes("INVALID_EMAIL")) return "That email address looks invalid.";
  if (code.includes("WEAK_PASSWORD")) return "Password must be at least 6 characters.";
  if (code.includes("TOO_MANY_ATTEMPTS")) return "Too many attempts. Try again later.";
  return err?.message || "Something went wrong creating your account.";
}
