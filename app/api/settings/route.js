import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getPrefs, savePrefsSection } from "@/lib/user-prefs";
import { SECTIONS } from "@/lib/settings";
import { checkChatPrivacy } from "@/lib/chat-gate";
import { checkProfilePrivacy, cleanInfoPatch } from "@/lib/profile-privacy";
import { getUserPlan } from "@/lib/user-plan";
import { planRank } from "@/lib/plans";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store" };

// GET -> the signed-in member's full settings.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ prefs: await getPrefs(user.uid) }, { headers: NO_STORE });
}

// PUT { section, patch } -> saves one section ("account" | "content" |
// "safety" | "feed" | "look" | "reels" | "access" | "stories" | "region") and returns it as stored. Unknown or invalid
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

  const clean = section === "account" ? cleanInfoPatch(patch) : { ...patch };
  if (section === "safety") delete clean.blocked;

  // Hiding gender or country from everyone ("No one") is a paid-plan option. The panel shows it locked,
  // and this is the real lock.
  if (section === "account") {
    try {
      const [plan, current] = await Promise.all([getUserPlan(user.uid), getPrefs(user.uid)]);
      const gate = checkProfilePrivacy({ paid: planRank(plan) > 0, current: current.account, patch: clean });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error, upgrade: true, locked: gate.locked }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Couldn’t save that right now." }, { status: 500 });
    }
  }

  // "No one" for messages and read receipts off are paid-plan options. The panel
  // shows them locked, and this is the real lock.
  if (section === "safety") {
    try {
      const [plan, current] = await Promise.all([getUserPlan(user.uid), getPrefs(user.uid)]);
      const gate = checkChatPrivacy({ paid: planRank(plan) > 0, current: current.safety, patch: clean });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error, upgrade: true, locked: gate.locked }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Couldn’t save that right now." }, { status: 500 });
    }
  }

  try {
    const saved = await savePrefsSection(user.uid, section, clean);
    return NextResponse.json({ ok: true, section, prefs: saved }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Couldn’t save that right now." }, { status: 500 });
  }
}
