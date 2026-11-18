import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan } from "@/lib/user-plan";
import { getUserPerks } from "@/lib/user-perks";
import { FOREVER_PIN_UNTIL_MS, commentMax, hasPerk } from "@/lib/perks";
import { getPrefs } from "@/lib/user-prefs";
import { listPostGifts } from "@/lib/gifts-data";
import { learnLater } from "@/lib/interests-data";
import { pinHours } from "@/lib/plans";
import {
  COMMENT_FETCH,
  COMMENT_LIMIT,
  REPLY_LIMIT,
  commentsRef,
  loadProfileMap,
  mapComment,
  postRef,
  profileLook,
  validId,
} from "@/lib/comments-data";

const NO_STORE = { "Cache-Control": "no-store" };

// Builds the JSON rows for a set of comment docs: hides blocked people and adds
// each author's look (avatar colours, plan, flair).
async function present(db, user, post, docs) {
  // Settings > Wanted Level: people you blocked don't show up in your comments.
  const viewerPrefs = user ? await getPrefs(user.uid) : null;
  const blocked = new Set(viewerPrefs?.safety.blocked || []);
  const shownDocs = blocked.size
    ? docs.filter((d) => !blocked.has(String(d.data().user || "").toLowerCase()))
    : docs;

  const profiles = await loadProfileMap(db, [
    ...shownDocs.map((d) => d.data().uid),
    user?.uid,
  ]);

  const ctx = {
    viewerUid: user?.uid,
    viewerUsername: user?.username,
    postUser: post.user,
    postUid: post.uid,
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
  return { comments: shownDocs.map((d) => mapComment(d, ctx)), viewer, blocked };
}

// GET /api/posts/comments?postId=...  -> newest comments, their replies and the viewer
// GET /api/posts/comments?postId=...&parentId=... -> every reply to one comment
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const postId = params.get("postId");
  const parentId = params.get("parentId");
  if (!validId(postId)) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }
  if (parentId !== null && !validId(parentId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const user = await getCurrentUser();
  const now = Date.now();

  if (parentId) {
    const [postSnap, repliesSnap] = await Promise.all([
      postRef(db, postId).get(),
      commentsRef(db, postId).where("parentId", "==", parentId).limit(REPLY_LIMIT).get(),
    ]);
    if (!postSnap.exists) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    const docs = [...repliesSnap.docs].sort(
      (a, b) =>
        (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0)
    );
    const { comments } = await present(db, user, postSnap.data(), docs);
    return NextResponse.json({ comments, serverNow: now }, { headers: NO_STORE });
  }

  const [postSnap, newestSnap, pinnedSnap] = await Promise.all([
    postRef(db, postId).get(),
    commentsRef(db, postId)
      .orderBy("createdAt", "desc")
      .limit(COMMENT_FETCH)
      .get(),
    // Pins still running right now, even on comments older than the newest ones.
    commentsRef(db, postId)
      .where("pinnedUntil", ">", Timestamp.fromMillis(now))
      .limit(40)
      .get(),
  ]);
  if (!postSnap.exists) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const seen = new Set();
  const tops = [];
  const replies = [];
  let newestTops = 0;
  const pinnedIds = new Set(pinnedSnap.docs.map((d) => d.id));
  for (const d of [...pinnedSnap.docs, ...newestSnap.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    if (d.data().parentId) {
      replies.push(d);
    } else if (pinnedIds.has(d.id) || newestTops < COMMENT_LIMIT) {
      if (!pinnedIds.has(d.id)) newestTops += 1;
      tops.push(d);
    }
  }
  // A reply is only worth sending when its comment is on the page.
  const topIds = new Set(tops.map((d) => d.id));
  const docs = [...tops, ...replies.filter((d) => topIds.has(d.data().parentId))];

  const { comments, viewer, blocked } = await present(db, user, postSnap.data(), docs);
  // Gifts people sent from this post or its comments (shown in the sheet).
  const gifts = await listPostGifts(postId, blocked);
  return NextResponse.json(
    { comments, viewer, gifts, serverNow: now },
    { headers: NO_STORE }
  );
}

// POST { postId, text, parentId? } -> adds a comment (or a reply to one) and
// bumps the post's counter
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
  const parentId = body.parentId == null || body.parentId === "" ? null : body.parentId;
  const text = String(body.text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!validId(postId)) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }
  if (parentId !== null && !validId(parentId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
  const pin = parentId
    ? { pinnedUntil: null, pinPlan: null }
    : hasPerk(perks, "forever_pin")
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
    const { count, postUser, postUid, post } = await db.runTransaction(async (tx) => {
      const pSnap = await tx.get(pRef);
      if (!pSnap.exists) throw new Error("NOT_FOUND");
      if (pSnap.data().settings?.comments === false) throw new Error("COMMENTS_OFF");

      // Replies hang off a top-level comment. Answering a reply files the new one
      // under the same top-level comment and remembers who it was aimed at.
      let rootRef = null;
      let rootSnap = null;
      let replyToUser = null;
      if (parentId) {
        const clickedSnap = await tx.get(commentsRef(db, postId).doc(parentId));
        if (!clickedSnap.exists) throw new Error("PARENT_GONE");
        const clicked = clickedSnap.data();
        if (clicked.parentId) {
          rootRef = commentsRef(db, postId).doc(clicked.parentId);
          rootSnap = await tx.get(rootRef);
          if (!rootSnap.exists) throw new Error("PARENT_GONE");
          replyToUser = clicked.user || null;
        } else {
          rootRef = clickedSnap.ref;
          rootSnap = clickedSnap;
        }
      }

      const next = (pSnap.data().comments || 0) + 1;
      tx.set(cRef, {
        uid: user.uid,
        user: user.username,
        text,
        likedBy: [],
        createdAt,
        ...pin,
        ...(rootRef ? { parentId: rootRef.id, ...(replyToUser ? { replyToUser } : null) } : null),
      });
      if (rootRef) {
        tx.update(rootRef, { replyCount: (Number(rootSnap.data().replyCount) || 0) + 1 });
      }
      tx.update(pRef, { comments: next });
      return { count: next, postUser: pSnap.data().user, postUid: pSnap.data().uid, post: pSnap.data() };
    });

    const [saved, profiles] = await Promise.all([
      cRef.get(),
      loadProfileMap(db, [user.uid]),
    ]);
    const comment = mapComment(saved, {
      viewerUid: user.uid,
      viewerUsername: user.username,
      postUser,
      postUid,
      profiles,
    });
    // Commenting is the strongest sign of interest: learn its tags, game and type (server-side).
    if (postUid !== user.uid) learnLater(user.uid, post, "comment");
    return NextResponse.json({ ok: true, comment, count });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    if (err.message === "PARENT_GONE") {
      return NextResponse.json(
        { error: "That comment was deleted, so you can't reply to it." },
        { status: 404 }
      );
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
    const { count, removed } = await db.runTransaction(async (tx) => {
      const [pSnap, cSnap] = await Promise.all([tx.get(pRef), tx.get(cRef)]);
      if (!pSnap.exists || !cSnap.exists) throw new Error("NOT_FOUND");
      const c = cSnap.data();
      const allowed =
        c.uid === user.uid ||
        (!!user.username && pSnap.data().user === user.username);
      if (!allowed) throw new Error("FORBIDDEN");

      // Reads first: a top-level comment takes its replies with it; a reply
      // lowers its comment's reply count.
      let replySnaps = [];
      let rootSnap = null;
      if (c.parentId) {
        const snap = await tx.get(commentsRef(db, postId).doc(c.parentId));
        if (snap.exists) rootSnap = snap;
      } else {
        const q = await tx.get(
          commentsRef(db, postId).where("parentId", "==", commentId).limit(450)
        );
        replySnaps = q.docs;
      }

      const gone = 1 + replySnaps.length;
      const next = Math.max(0, (pSnap.data().comments || 0) - gone);
      for (const r of replySnaps) tx.delete(r.ref);
      tx.delete(cRef);
      if (rootSnap) {
        tx.update(rootSnap.ref, {
          replyCount: Math.max(0, (Number(rootSnap.data().replyCount) || 0) - 1),
        });
      }
      tx.update(pRef, { comments: next });
      return { count: next, removed: gone };
    });
    return NextResponse.json({ ok: true, count, removed });
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

// PATCH { postId, commentId, text } -> the comment's own author edits its text
export async function PATCH(request) {
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
  const text = String(body.text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!validId(postId) || !validId(commentId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "A comment can't be empty." }, { status: 400 });
  }
  const perks = await getUserPerks(user.uid);
  const max = commentMax(perks);
  if (text.length > max) {
    return NextResponse.json(
      { error: `Comments can be at most ${max} characters.` },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const cRef = commentsRef(db, postId).doc(commentId);
  try {
    const snap = await cRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }
    if (snap.data().uid !== user.uid) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    if (snap.data().text !== text) {
      await cRef.update({ text, editedAt: Timestamp.now() });
    }
    return NextResponse.json({ ok: true, text, edited: true });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save that edit right now." },
      { status: 500 }
    );
  }
}
