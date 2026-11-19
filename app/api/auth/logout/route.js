import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { ONBOARD_COOKIE } from "@/lib/onboarding";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  // The welcome tour belongs to the account, not the browser.
  cookieStore.delete(ONBOARD_COOKIE);
  return NextResponse.json({ ok: true });
}
