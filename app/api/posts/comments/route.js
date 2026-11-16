import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan } from "@/lib/user-plan";
import { getUserPerks } from "@/lib/user-perks";
import { FOREVER_PIN_UNTIL_MS, commentMax, hasPerk } from "@/lib/perks";
import { getPrefs } from "@/lib/user-prefs";
import { pinHours } from "@/lib/plans";
import {
  COMMENT_LIMIT,
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

  const now = Date.now();
  const [postSnap, newestSnap, pinnedSnap] = await Promise.all([
    postRef(db, postId).get(),
    commentsRef(db, postId)
      .orderBy("createdAt", "desc")
      .limit(COMMENT_LIMIT)
      .get(),
    // Pins still running right now, even on comments older than the newest 100.
    commentsRef(db, postId)
      .where("pinnedUntil", ">", Timestamp.fromMillis(now))
      .limit(40)
      .get(),
  ]);
  if (!postSnap.exists) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const seen = new Set();
  const docs = [];
  for (const d of [...pinnedSnap.docs, ...newestSnap.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    docs.push(d);
  }

  // Settings > Wanted Level: people you blocked don't show up in your comments.
  const viewerPrefs = user ? await getPrefs(user.uid) : null;
  const blocked = new Set(viewerPrefs?.safety.blocked || []);
  const shownDocs = blocked.size
    ? docs.filter((d) => !blocked.has(String(d.data().user || "").toLowerCase()))
    : docs;

  const postUser = postSnap.data().user;
  const profiles = await loadProfileMap(db, [
    ...shownDocs.map((d) => d.data().uid),
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
          perks: profiles.get(user.uid)?.perks || [],
          ...profileLook(user.username, profiles.get(user.uid)),
        }
      : null;

  return NextResponse.json(
    { comments: shownDocs.map((d) => mapComment(d, ctx)), viewer, serverNow: now },
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
  // Perks Shop: Essay Mode raises the limit from 500 to 1,500 characters.
  const perks = await getUserPerks(user.uid);
  const max = commentMax(perks);
  if (text.length > max) {
    return NextResponse.json(
      { error: `Comments can be at most ${max} characters.` },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const pRef = postRef(db, postId);
  const cRef = commentsRef(db, postId).doc();

  // Settings > Wanted Level: an author can close comments to everyone or
  // block specific people from commenting.
  const pre = await pRef.get();
  const authorUid = pre.exists ? pre.data().uid : null;
  if (authorUid && authorUid !== user.uid) {
    const authorPrefs = await getPrefs(authorUid);
    if (authorPrefs.safety.whoCanComment === "nobody") {
      return NextResponse.json(
        { error: "This member isn’t taking comments right now." },
        { status: 403 }
      );
    }
    if (authorPrefs.safety.blocked.includes(user.username.toLowerCase())) {
      return NextResponse.json(
        { error: "You can’t comment on this member’s posts." },
        { status: 403 }
      );
    }
  }

  // Members get their comment pinned for a time that depends on their plan.
  // The deadline is stored now; nothing has to run later to unpin it.
  const plan = await getUserPlan(user.uid);
  const hours = pinHours(plan);
  const createdAt = Timestamp.now();
  // Perks Shop: Forever Pin beats any plan pin and never runs out.
  const pin = hasPerk(perks, "forever_pin")
    ? {
        pinnedUntil: Timestamp.fromMillis(FOREVER_PIN_UNTIL_MS),
        pinPlan: null,
        pinForever: true,
      }
    : hours
    ? {
        pinnedUntil: Timestamp.fromMillis(createdAt.toMillis() + hours * 3_600_000),
        pinPlan: plan,
      }
    : { pinnedUntil: null, pinPlan: null };

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
        createdAt,
        ...pin,
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
