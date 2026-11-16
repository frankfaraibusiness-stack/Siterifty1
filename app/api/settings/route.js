import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getPrefs, savePrefsSection } from "@/lib/user-prefs";
import { SECTIONS } from "@/lib/settings";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store" };

// GET -> the signed-in member's full settings.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ prefs: await getPrefs(user.uid) }, { headers: NO_STORE });
}

// PUT { section, patch } -> saves one section ("account" | "content" |
// "safety" | "feed" | "look") and returns it as stored. Unknown or invalid
// values are corrected, never trusted. The blocked list has its own route.
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { section, patch } = body || {};
  if (!SECTIONS.includes(section) || !patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Unknown setting." }, { status: 400 });
  }

  const clean = { ...patch };
  if (section === "safety") delete clean.blocked;

  try {
    const saved = await savePrefsSection(user.uid, section, clean);
    return NextResponse.json({ ok: true, section, prefs: saved }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Couldn’t save that right now." }, { status: 500 });
  }
}
