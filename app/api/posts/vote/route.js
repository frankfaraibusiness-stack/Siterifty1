import { NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { buildPoll } from "@/lib/feed-data";

// POST { postId, choices: number[] } -> sets (or clears, with []) the viewer's
// vote on a poll or a theory verdict. One transaction, one vote per account.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { postId, choices } = body || {};
  if (typeof postId !== "string" || !postId || postId.includes("/") || !Array.isArray(choices)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ref = getAdminDb().collection("posts").doc(postId);
  try {
    const poll = await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data();
      const p = data.poll;
      if (!p) throw new Error("NO_POLL");
      if (data.settings?.visibility === "private" && data.uid !== user.uid) throw new Error("NOT_FOUND");
      if ((data.createdAt?.toMillis?.() ?? 0) > Date.now()) throw new Error("NOT_FOUND");
      if (p.endsAt && p.endsAt.toMillis() < Date.now()) throw new Error("ENDED");

      const picked = [...new Set(choices)];
      const valid =
        picked.length === choices.length &&
        picked.every((i) => Number.isInteger(i) && i >= 0 && i < p.options.length) &&
        (p.multi || picked.length <= 1);
      if (!valid) throw new Error("INVALID");

      const votes = { ...(data.votes || {}) };
      if (picked.length) votes[user.uid] = picked;
      else delete votes[user.uid];

      tx.update(
        ref,
        new FieldPath("votes", user.uid),
        picked.length ? picked : FieldValue.delete()
      );
      return buildPoll(p, votes, user.uid);
    });
    return NextResponse.json({ ok: true, poll });
  } catch (err) {
    const map = {
      NOT_FOUND: ["That post is gone.", 404],
      NO_POLL: ["This post has no poll.", 400],
      ENDED: ["This poll has ended.", 409],
      INVALID: ["That isn’t a valid choice.", 400],
    };
    const [msg, status] = map[err.message] || ["Couldn’t save your vote.", 500];
    return NextResponse.json({ error: msg }, { status });
  }
}
