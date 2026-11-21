import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import {
  FOLLOWS,
  findUserByUsername,
  followId,
  getSocialCounts,
  now,
} from "@/lib/social-data";
import { noteNewFollower, undoNewFollower } from "@/lib/notifications-data";

// POST { username, follow: boolean } -> follows or unfollows a member.
// Answers with whether the viewer now follows them and that member's counts.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Log in to follow people." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const wantFollow = body?.follow !== false;

  const db = getAdminDb();
  const target = await findUserByUsername(db, body?.username);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.uid === user.uid) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  const ref = db.collection(FOLLOWS).doc(followId(user.uid, target.uid));
  try {
    if (wantFollow) {
      // Settings > Wanted Level: someone who blocked you can't be followed by you.
      const blocked = target.prefs?.safety?.blocked;
      if (Array.isArray(blocked) && blocked.includes(user.username.toLowerCase())) {
        return NextResponse.json(
          { error: "You can’t follow this member." },
          { status: 403 }
        );
      }
      const existing = await ref.get();
      await ref.set({ from: user.uid, to: target.uid, createdAt: now() });
      // Header badge: only a genuinely new follow counts, not a repeat tap.
      if (!existing.exists) await noteNewFollower(db, target.uid, { uid: user.uid, username: user.username });
    } else {
      const existing = await ref.get();
      await ref.delete();
      if (existing.exists) {
        await undoNewFollower(db, target.uid, existing.data()?.createdAt?.toMillis?.() ?? 0);
      }
    }
    const counts = await getSocialCounts(target.uid);
    return NextResponse.json({ ok: true, following: wantFollow, counts });
  } catch {
    return NextResponse.json(
      { error: "Couldn't update that right now." },
      { status: 500 }
    );
  }
}
