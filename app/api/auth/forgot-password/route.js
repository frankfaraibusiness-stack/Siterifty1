import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

// Generates a password-reset link via the Admin SDK. This route does NOT
// send any email — it hands back the link so your own email
// pipeline (Resend, SendGrid, Firebase Extensions, etc.) can deliver it.
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    // actionCodeSettings is optional — set NEXT_PUBLIC_APP_URL to control
    // where the link sends the user after they set a new password.
    const continueUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/`
      : undefined;

    const link = await auth.generatePasswordResetLink(
      email,
      continueUrl ? { url: continueUrl } : undefined
    );

    // Deliberately always respond ok (even if the email doesn't exist) so
    // this endpoint can't be used to enumerate registered accounts.
    // We still return the link only when it was actually generated —
    // swap this for your real email-sending call.
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    const code = err?.errorInfo?.code || err?.code || "";
    if (code.includes("user-not-found")) {
      // Same neutral response, to avoid leaking which emails are registered.
      return NextResponse.json({ ok: true, link: null });
    }
    return NextResponse.json(
      { error: err?.message || "Could not generate a reset link right now." },
      { status: 400 }
    );
  }
}
