import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { formatCount } from "@/lib/format-count";
import { learnLater } from "@/lib/interests-data";
import { noteActivity, undoActivity } from "@/lib/notifications-data";
import { rpPatch } from "@/lib/video-stats-data";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You need to be signed in to like posts." },
      { status: 401 }
    );
  }

  const { postId } = await request.json();
  if (!postId) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }

  const db = getAdminDb();
  const postRef = db.collection("posts").doc(postId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(postRef);
      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }
      const likedBy = snap.data().likedBy || [];
      const alreadyLiked = likedBy.includes(user.uid);

      // RP (rank power): a like adds some, taking it back removes it. Same write, nothing extra.
      // Your own post never earns you RP.
      const earnsRp = snap.data().uid !== user.uid;
      tx.update(postRef, {
        likedBy: alreadyLiked
          ? FieldValue.arrayRemove(user.uid)
          : FieldValue.arrayUnion(user.uid),
        ...(earnsRp ? rpPatch("like", alreadyLiked) : {}),
      });

      const newCount = alreadyLiked ? likedBy.length - 1 : likedBy.length + 1;
      return { liked: !alreadyLiked, count: newCount, post: snap.data() };
    });

    // Learn from it (server-side, after the reply is sent): the post's own tags, game and type.
    // Not for your own posts, and un-liking never teaches anything.
    if (result.liked && result.post.uid !== user.uid) learnLater(user.uid, result.post, "like");

    // Header badge for the post's author (never for liking your own post).
    if (result.post.uid && result.post.uid !== user.uid) {
      if (result.liked) {
        await noteActivity(db, result.post.uid, "likes", {
          type: "like",
          actor: { uid: user.uid, username: user.username },
          data: { pid: postId, x: result.post.title || result.post.text },
        });
      }
      else await undoActivity(db, result.post.uid, "likes");
    }

    return NextResponse.json({
      ok: true,
      liked: result.liked,
      likesCount: result.count,
      likesBase: formatCount(result.count),
    });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Couldn't update like right now." },
      { status: 500 }
    );
  }
}
