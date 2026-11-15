import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getTheme } from "@/lib/profile-themes";
import {
  LIMITS,
  VERDICT_OPTIONS,
  cleanText,
  normalizeTag,
  validateDraft,
} from "@/lib/post-schema";

export const runtime = "nodejs";

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 900_000; // Firestore documents are capped at 1 MiB
const COOLDOWN_MS = 8_000;

function fail(error, status = 400, fields) {
  return NextResponse.json({ error, fields }, { status });
}

// POST { draft, videoId? } -> creates posts/{id} (+ posts/{id}/media/{n}).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return fail("You need to be signed in to post.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.");
  }
  const d = body?.draft;
  if (!d || typeof d !== "object") return fail("Invalid request.");

  const fields = validateDraft({
    ...d,
    video: d.video && { ...d.video, status: "ready" }, // uploads are verified below
  });
  if (Object.keys(fields).length) return fail(Object.values(fields)[0], 422, fields);

  const type = d.type;
  const title = cleanText(d.title, d.type === "poll" ? LIMITS.question : LIMITS.title);
  const text = cleanText(d.text, type === "theory" ? LIMITS.theory : LIMITS.text);
  const tags = [...new Set((d.tags || []).map(normalizeTag).filter(Boolean))].slice(0, LIMITS.tags);

  // --- images (also the poster frame for uploaded videos) -------------------
  const rawImages = Array.isArray(d.images) ? d.images : [];
  const maxImages = type === "theory" ? LIMITS.evidence : type === "video" ? 1 : LIMITS.images;
  if (type === "poll" && rawImages.length) return fail("Polls can’t have photos.");
  if (rawImages.length > maxImages) return fail(`Too many images (max ${maxImages}).`);
  const images = [];
  for (const img of rawImages) {
    if (typeof img?.data !== "string" || !DATA_URL.test(img.data) || img.data.length > MAX_IMAGE_CHARS) {
      return fail("One of your images couldn’t be processed. Try a smaller one.");
    }
    images.push({ data: img.data, alt: cleanText(img.alt, LIMITS.alt) });
  }

  const db = getAdminDb();
  const postRef =
    type === "video" && d.video?.kind === "storage" && /^[A-Za-z0-9]{20}$/.test(d.video.storageId || "")
      ? db.collection("posts").doc(d.video.storageId)
      : db.collection("posts").doc();

  // --- media descriptor -----------------------------------------------------
  let media = null;
  if (type === "post" || type === "theory") {
    if (images.length) {
      media = { type: "images", count: images.length, alts: images.map((i) => i.alt) };
    }
  } else if (type === "video") {
    if (d.video.kind === "youtube") {
      media = { type: "video", kind: "youtube", ytId: d.video.ytId };
    } else {
      const bucket = getAdminBucket();
      if (!bucket) return fail("Video uploads aren’t enabled on this server.", 501);
      const file = bucket.file(`videos/${user.uid}/${postRef.id}`);
      const [exists] = await file.exists();
      if (!exists) return fail("We couldn’t find your uploaded video. Upload it again.");
      const [meta] = await file.getMetadata();
      if (Number(meta.size) > LIMITS.videoMB * 1024 * 1024) {
        await file.delete({ ignoreNotFound: true });
        return fail(`Videos can be at most ${LIMITS.videoMB} MB.`);
      }
      media = {
        type: "video",
        kind: "storage",
        hasPoster: images.length > 0,
        seconds: Math.min(LIMITS.videoSeconds * 10, Math.round(Number(d.video.duration) || 0)),
      };
    }
  }

  // --- poll / theory verdict ------------------------------------------------
  const hours = [1, 24, 72, 168].includes(d.poll?.hours) ? d.poll.hours : 24;
  const publishAtMs = d.publishAt ? Date.parse(d.publishAt) : Date.now();
  const createdAt = Timestamp.fromMillis(Math.max(publishAtMs, Date.now() - 1000));
  let poll = null;
  if (type === "poll") {
    const options = (d.poll.options || [])
      .map((o) => cleanText(o, LIMITS.option))
      .filter(Boolean)
      .slice(0, LIMITS.pollOptions);
    poll = {
      kind: "poll",
      options,
      multi: !!d.poll.multi && options.length > 2,
      endsAt: Timestamp.fromMillis(createdAt.toMillis() + hours * 3_600_000),
    };
  } else if (type === "theory") {
    poll = { kind: "verdict", options: VERDICT_OPTIONS, multi: false, endsAt: null };
  }

  const s = d.settings || {};
  const settings = {
    visibility: s.visibility === "private" ? "private" : "public",
    comments: s.comments !== false,
    hideLikes: !!s.hideLikes,
    allowShare: s.allowShare !== false && s.visibility !== "private",
    spoiler: !!s.spoiler && type !== "poll",
    resultsFirst: !!s.resultsFirst && type === "poll",
    pinned: !!s.pinned,
  };

  // --- cooldown + author look ----------------------------------------------
  const userRef = db.collection("users").doc(user.uid);
  const userSnap = await userRef.get();
  const last = userSnap.data()?.lastPostAt?.toMillis?.() ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    return fail("Slow down a little. Try again in a few seconds.", 429);
  }
  const theme = getTheme(userSnap.data()?.theme);

  const doc = {
    uid: user.uid,
    user: user.username,
    type,
    title,
    text,
    tags,
    tag: tags.length ? tags.map((t) => `#${t}`).join(" ") : null,
    avatarA: theme.a,
    avatarB: theme.b,
    location: d.location,
    media,
    poll,
    votes: {},
    theory: type === "theory" ? { confidence: Math.min(100, Math.max(0, Math.round(Number(d.theory?.confidence) || 0))) } : null,
    settings,
    likedBy: [],
    savedBy: [],
    comments: 0,
    shares: 0,
    createdAt,
  };

  const batch = db.batch();
  batch.set(postRef, doc);
  images.forEach((img, i) => batch.set(postRef.collection("media").doc(String(i)), img));
  batch.set(userRef, { lastPostAt: Timestamp.now() }, { merge: true });
  await batch.commit();

  return NextResponse.json({
    ok: true,
    id: postRef.id,
    scheduled: createdAt.toMillis() > Date.now() + 30_000,
    goesLiveAt: createdAt.toMillis(),
  });
}
