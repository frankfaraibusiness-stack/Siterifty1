import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { commentsRef, validId } from "@/lib/comments-data";
import { noteActivity, undoActivity } from "@/lib/notifications-data";

// POST { postId, commentId } toggles the viewer's like on a comment.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You need to be signed in to like comments." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { postId, commentId } = body;
  if (!validId(postId) || !validId(commentId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const cRef = commentsRef(db, postId).doc(commentId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(cRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const likedBy = snap.data().likedBy || [];
      const already = likedBy.includes(user.uid);
      tx.update(cRef, {
        likedBy: already
          ? FieldValue.arrayRemove(user.uid)
          : FieldValue.arrayUnion(user.uid),
      });
      return {
        liked: !already,
        likes: likedBy.length + (already ? -1 : 1),
        owner: snap.data().uid || null,
        text: snap.data().text || "",
      };
    });
    // Header badge for the comment's author (never for liking your own comment).
    const { owner, text, ...out } = result;
    if (owner && owner !== user.uid) {
      if (out.liked) {
        await noteActivity(db, owner, "likes", {
          type: "clike",
          actor: { uid: user.uid, username: user.username },
          data: { pid: postId, cid: commentId, x: text },
        });
      }
      else await undoActivity(db, owner, "likes");
    }
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Couldn't update like right now." },
      { status: 500 }
    );
  }
}
