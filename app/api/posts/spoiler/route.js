import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { canCarrySpoiler, toggleFlag } from "@/lib/spoilers";

export const runtime = "nodejs";

class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// POST { postId }               -> "this needs a spoiler cover" (a second call takes it back)
// POST { postId, clear: true }  -> the author lifts a cover the community added
// Enough different members flagging a post covers it for everyone (see lib/spoilers.js).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to flag spoilers." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) || {};
  const { postId } = body;
  if (typeof postId !== "string" || !postId || postId.includes("/")) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("posts").doc(postId);

  try {
    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Refusal(404, "Post not found.");
      const data = snap.data();
      const mine = data.uid ? data.uid === user.uid : data.user === user.username;

      if (!canCarrySpoiler(data.type || "post")) {
        throw new Refusal(400, "Polls and events can’t have a spoiler cover.");
      }

      if (body.clear === true) {
        if (!mine) throw new Refusal(403, "That isn’t your post.");
        tx.update(ref, { spoilerFlags: [] });
        return { cleared: true };
      }

      if (mine) throw new Refusal(400, "Use the Spoiler cover switch on your own posts.");
      // Private posts are invisible to everyone but the author.
      if (data.settings?.visibility === "private") throw new Refusal(404, "Post not found.");
      // The author already covered it: nothing to add.
      if (data.settings?.spoiler) return { flagged: false, alreadyCovered: true };

      const { flags, flagged } = toggleFlag(data.spoilerFlags, user.uid);
      tx.update(ref, { spoilerFlags: flags });
      return { flagged };
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    if (err instanceof Refusal) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Couldn’t update the spoiler cover right now." }, { status: 500 });
  }
}
