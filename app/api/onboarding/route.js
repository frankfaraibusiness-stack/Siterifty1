import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { ONBOARD_COOKIE } from "@/lib/onboarding";
import { LEGAL } from "@/lib/site";

export const runtime = "nodejs";

// POST: the signed-in member finished the three-step welcome tour.
// Marks the account as done and drops the "tour pending" cookie. Safe to call
// again (someone replaying /welcome): it just stays done.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  // The last step has a tick box for the Terms and Privacy Policy; the server
  // insists on it and keeps when it was accepted and which version was live.
  const body = (await request.json().catch(() => null)) || {};
  if (body.acceptTerms !== true) {
    return NextResponse.json(
      { error: "Please agree to the Terms and Privacy Policy to continue." },
      { status: 400 }
    );
  }
  try {
    await getAdminDb()
      .collection("users")
      .doc(user.uid)
      .set(
        {
          onboarded: true,
          onboardedAt: FieldValue.serverTimestamp(),
          termsAcceptedAt: FieldValue.serverTimestamp(),
          termsVersion: LEGAL.updatedISO,
        },
        { merge: true }
      );
  } catch {
    return NextResponse.json({ error: "Couldn’t save that. Please try again." }, { status: 500 });
  }
  const jar = await cookies();
  jar.delete(ONBOARD_COOKIE);
  return NextResponse.json({ ok: true });
}
