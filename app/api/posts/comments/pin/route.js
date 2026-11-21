import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { commentsRef, postRef, validId } from "@/lib/comments-data";

// POST { postId, commentId, pinned } -> the post's creator pins (or unpins) one of their audience's comments.
// A post has at most one creator pin: pinning another comment moves the pin. Only top-level comments can be pinned.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { postId, commentId } = body;
  const pinned = body.pinned !== false;
  if (!validId(postId) || !validId(commentId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const pRef = postRef(db, postId);
  const cRef = commentsRef(db, postId).doc(commentId);

  try {
    const unpinnedIds = await db.runTransaction(async (tx) => {
      const [pSnap, cSnap] = await Promise.all([tx.get(pRef), tx.get(cRef)]);
      if (!pSnap.exists || !cSnap.exists) throw new Error("NOT_FOUND");
      // Only the creator of the post controls its comments.
      if (pSnap.data().uid !== user.uid) throw new Error("FORBIDDEN");
      if (cSnap.data().parentId) throw new Error("REPLY");

      if (!pinned) {
        if (cSnap.data().authorPinned === true) tx.update(cRef, { authorPinned: false, authorPinnedAt: null });
        return [];
      }

      // Move the pin: any comment pinned before is let go in the same write.
      const olderSnap = await tx.get(commentsRef(db, postId).where("authorPinned", "==", true).limit(10));
      const moved = [];
      for (const d of olderSnap.docs) {
        if (d.id === commentId) continue;
        tx.update(d.ref, { authorPinned: false, authorPinnedAt: null });
        moved.push(d.id);
      }
      tx.update(cRef, { authorPinned: true, authorPinnedAt: Timestamp.now() });
      return moved;
    });
    return NextResponse.json({ ok: true, pinned, unpinnedIds });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Only the post's creator can pin comments." }, { status: 403 });
    }
    if (err.message === "REPLY") {
      return NextResponse.json({ error: "Only comments can be pinned, not replies." }, { status: 400 });
    }
    return NextResponse.json({ error: "Couldn't update the pin right now." }, { status: 500 });
  }
}
