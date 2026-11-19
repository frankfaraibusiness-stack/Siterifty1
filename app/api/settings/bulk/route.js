import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getContentStats } from "@/lib/user-prefs";

export const runtime = "nodejs";

// One-tap changes to every post you've made.
const ACTIONS = {
  all_private: { "settings.visibility": "private", "settings.allowShare": false },
  all_public: { "settings.visibility": "public" },
  comments_off: { "settings.comments": false },
  comments_on: { "settings.comments": true },
  likes_hidden: { "settings.hideLikes": true },
  likes_shown: { "settings.hideLikes": false },
};

// POST { action } -> applies it to all of your posts and returns fresh counts.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user?.username) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fields = ACTIONS[body?.action];
  if (!fields) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const db = getAdminDb();
  const [byUid, byName] = await Promise.all([
    db.collection("posts").where("uid", "==", user.uid).limit(1000).get(),
    // The oldest posts only stored the handle.
    db.collection("posts").where("user", "==", user.username).limit(1000).get(),
  ]);

  const refs = new Map();
  for (const doc of byUid.docs) refs.set(doc.id, doc.ref);
  for (const doc of byName.docs) {
    const d = doc.data();
    if (!d.uid || d.uid === user.uid) refs.set(doc.id, doc.ref);
  }

  try {
    const list = [...refs.values()];
    for (let i = 0; i < list.length; i += 400) {
      const batch = db.batch();
      for (const ref of list.slice(i, i + 400)) batch.update(ref, fields);
      await batch.commit();
    }
    return NextResponse.json({
      ok: true,
      count: list.length,
      stats: await getContentStats(user.uid),
    });
  } catch {
    return NextResponse.json({ error: "Couldn’t update your posts right now." }, { status: 500 });
  }
}
