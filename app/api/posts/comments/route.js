import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import {
  COMMENT_LIMIT,
  MAX_COMMENT,
  commentsRef,
  loadProfileMap,
  mapComment,
  postRef,
  profileLook,
  validId,
} from "@/lib/comments-data";

const NO_STORE = { "Cache-Control": "no-store" };

// GET /api/posts/comments?postId=...  -> newest comments + the viewer
export async function GET(request) {
  const postId = new URL(request.url).searchParams.get("postId");
  if (!validId(postId)) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }

  const db = getAdminDb();
  const user = await getCurrentUser();

  const [postSnap, snap] = await Promise.all([
    postRef(db, postId).get(),
    commentsRef(db, postId)
      .orderBy("createdAt", "desc")
      .limit(COMMENT_LIMIT)
      .get(),
  ]);
  if (!postSnap.exists) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const postUser = postSnap.data().user;
  const profiles = await loadProfileMap(db, [
    ...snap.docs.map((d) => d.data().uid),
    user?.uid,
  ]);

  const ctx = {
    viewerUid: user?.uid,
    viewerUsername: user?.username,
    postUser,
    profiles,
  };

  const viewer =
    user && user.username
      ? {
          uid: user.uid,
          username: user.username,
          initial: user.username.charAt(0).toUpperCase(),
          ...profileLook(user.username, profiles.get(user.uid)),
        }
      : null;

  return NextResponse.json(
    { comments: snap.docs.map((d) => mapComment(d, ctx)), viewer },
    { headers: NO_STORE }
  );
}

// POST { postId, text } -> adds a comment and bumps the post's counter
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json(
      { error: "You need to be signed in to comment." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { postId } = body;
  const text = String(body.text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!validId(postId)) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Write something first." }, { status: 400 });
  }
  if (text.length > MAX_COMMENT) {
    return NextResponse.json(
      { error: `Comments can be at most ${MAX_COMMENT} characters.` },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const pRef = postRef(db, postId);
  const cRef = commentsRef(db, postId).doc();

  try {
    const { count, postUser } = await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists) throw new Error("NOT_FOUND");
      if (pSnap.data().settings?.comments === false) throw new Error("COMMENTS_OFF");
      const next = (pSnap.data().comments || 0) + 1;
      tx.set(cRef, {
        uid: user.uid,
        user: user.username,
        text,
        likedBy: [],
        createdAt: Timestamp.now(),
      });
      tx.update(pRef, { comments: next });
      return { count: next, postUser: pSnap.data().user };
    });

    const [saved, profiles] = await Promise.all([
      cRef.get(),
      loadProfileMap(db, [user.uid]),
    ]);
    const comment = mapComment(saved, {
      viewerUid: user.uid,
      viewerUsername: user.username,
      postUser,
      profiles,
    });
    return NextResponse.json({ ok: true, comment, count });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    if (err.message === "COMMENTS_OFF") {
      return NextResponse.json(
        { error: "The author turned comments off for this post." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Couldn't post your comment right now." },
      { status: 500 }
    );
  }
}

// DELETE { postId, commentId } -> author of the comment or of the post only
export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
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
  const pRef = postRef(db, postId);
  const cRef = commentsRef(db, postId).doc(commentId);

  try {
    const count = await db.runTransaction(async (tx) => {
      const [pSnap, cSnap] = await Promise.all([tx.get(pRef), tx.get(cRef)]);
      if (!pSnap.exists || !cSnap.exists) throw new Error("NOT_FOUND");
      const allowed =
        cSnap.data().uid === user.uid ||
        (!!user.username && pSnap.data().user === user.username);
      if (!allowed) throw new Error("FORBIDDEN");
      const next = Math.max(0, (pSnap.data().comments || 0) - 1);
      tx.delete(cRef);
      tx.update(pRef, { comments: next });
      return next;
    });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Couldn't delete that comment." },
      { status: 500 }
    );
  }
}
