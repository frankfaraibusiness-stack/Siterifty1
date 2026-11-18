import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { cleanText } from "@/lib/post-schema";
import { STORY, STORY_AUDIENCES } from "@/lib/story-schema";
import { getUserPerks } from "@/lib/user-perks";
import { storyHours } from "@/lib/perks";

export const runtime = "nodejs";

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 900_000; // Firestore documents are capped at 1 MiB

function fail(error, status = 400) {
  return NextResponse.json({ error }, { status });
}

// POST { kind: "image", image, caption?, audience?, replies? }
//   or { kind: "video", storyId, seconds, poster, caption?, audience?, replies? }
//   audience: "public" (default) | "connections" | "friends" | "followers"
//   replies: boolean, on by default
// Creates stories/{id} (+ stories/{id}/media/0 holding the photo or poster).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return fail("Sign in to add a story.", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid request.");

  const kind = body.kind;
  if (kind !== "image" && kind !== "video") return fail("Invalid story type.");
  const caption = cleanText(body.caption, STORY.caption).replace(/\n+/g, " ");

  const audience = body.audience === undefined ? "public" : body.audience;
  if (!STORY_AUDIENCES.some((a) => a.id === audience)) return fail("Pick who can see this story.");
  if (body.replies !== undefined && typeof body.replies !== "boolean") return fail("Invalid request.");
  const repliesOn = body.replies !== false;

  const image = kind === "image" ? body.image : body.poster;
  if (typeof image !== "string" || !DATA_URL.test(image) || image.length > MAX_IMAGE_CHARS) {
    return fail(kind === "image" ? "That photo couldn’t be processed. Try a smaller one." : "Couldn’t read a preview frame from that clip.");
  }

  const db = getAdminDb();
  const now = Date.now();

  // Keep one account from flooding the rail.
  const mine = await db.collection("stories").where("uid", "==", user.uid).limit(50).get();
  const active = mine.docs.filter((d) => (d.data().expiresAt?.toMillis?.() ?? 0) > now).length;
  if (active >= STORY.maxActivePerUser) {
    return fail(`You can have up to ${STORY.maxActivePerUser} stories up at once. Delete one to add another.`, 429);
  }

  const hours = storyHours(await getUserPerks(user.uid), STORY.hours);

  let ref;
  let seconds = STORY.imageSeconds;
  if (kind === "video") {
    if (!/^[A-Za-z0-9]{20}$/.test(body.storyId || "")) return fail("Invalid upload.");
    const length = Number(body.seconds);
    if (!Number.isFinite(length) || length <= 0 || length > STORY.maxSeconds + STORY.secondsTolerance) {
      return fail(`Story clips can be ${STORY.maxSeconds} seconds or less.`);
    }
    seconds = Math.min(STORY.maxSeconds, Math.round(length * 10) / 10);

    const bucket = getAdminBucket();
    if (!bucket) return fail("Video uploads aren’t enabled on this server.", 501);
    const file = bucket.file(`stories/${user.uid}/${body.storyId}`);
    const [exists] = await file.exists();
    if (!exists) return fail("We couldn’t find your uploaded clip. Upload it again.");
    const [meta] = await file.getMetadata();
    if (Number(meta.size) > STORY.maxVideoMB * 1024 * 1024) {
      await file.delete({ ignoreNotFound: true });
      return fail(`Story clips can be at most ${STORY.maxVideoMB} MB.`);
    }
    ref = db.collection("stories").doc(body.storyId);
    if ((await ref.get()).exists) return fail("That clip was already shared.");
  } else {
    ref = db.collection("stories").doc();
  }

  await ref.set({
    uid: user.uid,
    username: user.username,
    kind,
    seconds,
    caption,
    audience,
    repliesOn,
    createdAt: Timestamp.fromMillis(now),
    // Set a Firestore TTL policy on `expiresAt` to have old stories cleaned up.
    // Perks Shop: Story Extender keeps stories up 72 hours instead of 24.
    expiresAt: Timestamp.fromMillis(now + hours * 3_600_000),
  });
  await ref.collection("media").doc("0").set({ data: image });

  return NextResponse.json({ ok: true, id: ref.id });
}

// PATCH { id, replies: boolean } -> turns replies on or off for one of your own stories.
export async function PATCH(request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const { id, replies } = (await request.json().catch(() => ({}))) || {};
  if (typeof id !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(id) || typeof replies !== "boolean") return fail("Invalid request.");

  const ref = getAdminDb().collection("stories").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return fail("That story is gone.", 404);
  if (snap.data().uid !== user.uid) return fail("That isn’t your story.", 403);
  await ref.update({ repliesOn: replies });
  return NextResponse.json({ ok: true, replies });
}

// DELETE { id } -> removes one of your own stories.
export async function DELETE(request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const { id } = (await request.json().catch(() => ({}))) || {};
  if (typeof id !== "string" || !/^[A-Za-z0-9]{1,40}$/.test(id)) return fail("Invalid request.");

  const ref = getAdminDb().collection("stories").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: true });
  const data = snap.data();
  if (data.uid !== user.uid) return fail("That isn’t your story.", 403);

  if (data.kind === "video") {
    const bucket = getAdminBucket();
    await bucket?.file(`stories/${user.uid}/${id}`).delete({ ignoreNotFound: true }).catch(() => {});
  }
  await ref.collection("media").doc("0").delete().catch(() => {});
  await ref.delete();
  return NextResponse.json({ ok: true });
}
