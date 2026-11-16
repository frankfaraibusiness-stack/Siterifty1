import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { changePassword } from "@/lib/identity-toolkit";

export const runtime = "nodejs";

const MESSAGES = {
  INVALID_LOGIN_CREDENTIALS: "That isn’t your current password. If you signed up with Google, use Forgot password on the log-in screen to set one.",
  INVALID_PASSWORD: "That isn’t your current password.",
  EMAIL_NOT_FOUND: "We couldn’t find a password for this account. Use Forgot password on the log-in screen.",
  WEAK_PASSWORD: "Pick a stronger password (at least 6 characters).",
  TOO_MANY_ATTEMPTS_TRY_LATER: "Too many tries. Wait a few minutes and try again.",
};

// POST { current, next } -> changes the signed-in member's password.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const current = String(body?.current ?? "");
  const next = String(body?.next ?? "");

  if (!current) return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  if (next.length < 6) {
    return NextResponse.json({ error: "Your new password needs at least 6 characters." }, { status: 400 });
  }
  if (next.length > 128) {
    return NextResponse.json({ error: "That password is too long." }, { status: 400 });
  }
  if (next === current) {
    return NextResponse.json({ error: "Your new password is the same as the old one." }, { status: 400 });
  }

  try {
    await changePassword(user.email, current, next);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = String(err?.identityToolkitCode || err?.message || "").split(" ")[0];
    return NextResponse.json(
      { error: MESSAGES[code] || "Couldn’t change your password right now." },
      { status: MESSAGES[code] ? 400 : 500 }
    );
  }
}
