import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REF_COOKIE, REF_COOKIE_DAYS, cleanRefCode } from "@/lib/referrals";
import { countRefClick, ownerOfCode } from "@/lib/referrals-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /r/<code>: someone opened a member's referral link. Remember the code in a cookie so that if they
// create an account in this browser, the sign-up counts for that member, then send them to the home page.
// An unknown or malformed code is ignored: the visitor still lands on the site.
export async function GET(request, { params }) {
  const { code: raw } = await params;
  const code = cleanRefCode(raw);
  const home = NextResponse.redirect(new URL("/", request.url));
  if (!code) return home;

  try {
    const owner = await ownerOfCode(code);
    if (!owner) return home;
    const jar = await cookies();
    // The first link wins: someone who already holds a code keeps it (and doesn't add to the click count again).
    if (cleanRefCode(jar.get(REF_COOKIE)?.value)) return home;
    home.cookies.set(REF_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
    });
    await countRefClick(owner.uid);
  } catch (err) {
    console.error("[referrals] link visit failed", err);
  }
  return home;
}
