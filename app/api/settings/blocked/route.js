import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getPrefs, setBlockedList } from "@/lib/user-prefs";
import { LIMITS, USERNAME_RE } from "@/lib/settings";
import { severTies } from "@/lib/chat-social";

export const runtime = "nodejs";

// POST { username, action: "block" | "unblock" } -> the updated blocked list.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user?.username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const action = body?.action === "unblock" ? "unblock" : "block";

  if (!USERNAME_RE.test(name)) {
    return NextResponse.json({ error: "That doesn’t look like a username." }, { status: 400 });
  }

  const prefs = await getPrefs(user.uid);
  let list = prefs.safety.blocked;
  let blockedUid = null;

  if (action === "unblock") {
    list = list.filter((n) => n !== name);
  } else {
    if (name === user.username.toLowerCase()) {
      return NextResponse.json({ error: "You can’t block yourself." }, { status: 400 });
    }
    if (list.includes(name)) return NextResponse.json({ ok: true, blocked: list });
    if (list.length >= LIMITS.blocked) {
      return NextResponse.json({ error: `You can block up to ${LIMITS.blocked} people.` }, { status: 400 });
    }
    const found = await getAdminDb()
      .collection("users")
      .where("usernameLower", "==", name)
      .limit(1)
      .get();
    if (found.empty) {
      return NextResponse.json({ error: `Nobody in Leonida goes by @${name}.` }, { status: 404 });
    }
    list = [...list, name];
    blockedUid = found.docs[0].id;
  }

  try {
    const saved = await setBlockedList(user.uid, list);
    // Blocking cuts every tie: follows both ways, friendship, pending request.
    if (blockedUid) await severTies(getAdminDb(), user.uid, blockedUid).catch(() => {});
    return NextResponse.json({ ok: true, blocked: saved.blocked });
  } catch {
    return NextResponse.json({ error: "Couldn’t update your block list." }, { status: 500 });
  }
}
