import { NextResponse } from "next/server";
import { sendPasswordReset } from "@/lib/identity-toolkit";

// Firebase sends the reset email itself. Always responds ok so the endpoint
// can't be used to find out which emails are registered.
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const continueUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/`
      : undefined;
    try {
      await sendPasswordReset(email, continueUrl);
    } catch (err) {
      if (!String(err?.identityToolkitCode || "").includes("EMAIL_NOT_FOUND")) throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not send a reset email right now." },
      { status: 400 }
    );
  }
}
