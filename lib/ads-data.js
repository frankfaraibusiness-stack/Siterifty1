import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/chat-social";
import { VIDEO_TYPES } from "@/lib/post-schema";
import {
  ADS_FREE_WHILE_TESTING, AD_RATES, PLACEMENT_IDS, VIDEO_MAX_MB, VIDEO_MAX_SECONDS,
  clampBudgetCents, cleanUrl, dayKey, quote, validateCopy, BUDGET,
} from "@/lib/ads";

// Firestore layout
//   ads/{adId}                 the ad + its counters (views, clicks, per-source, per-day)
//   ads/{adId}/media/0         { data: "data:image/jpeg;base64,..." }  uploaded image / video poster
//   adIndex/live               { feed: [ids], community: [ids], messages: [ids] }  ads that can serve now
//   adOrders/{orderId}         one row per payment (launch or top-up)
//   Storage: ad-videos/{uid}/{adId}    uploaded video file
//
// Serving reads the tiny adIndex/live doc (cached in memory for 30 s) and then
// ONE ad doc, so a slot costs about one read, and none when cached.

const ads = () => getAdminDb().collection("ads");
const orders = () => getAdminDb().collection("adOrders");
const indexRef = () => getAdminDb().collection("adIndex").doc("live");
const inc = (n = 1) => FieldValue.increment(n);

const IMG_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const ms = (t) => t?.toMillis?.() ?? 0;
const zeroSrc = () => ({ feed: 0, community: 0, messages: 0 });

// ---- shapes ----------------------------------------------------------------

function mediaOf(id, a) {
  const v = a.mediaV || 0;
  const src = a.hasImage ? `/ad-media/${id}?v=${v}` : a.imageUrl || "";
  if (a.type === "video") {
    return { kind: "video", src: a.hasImage ? `/ad-media/${id}?v=${v}` : "", video: `/ad-video/${id}?v=${v}`, w: a.imgW || 0, h: a.imgH || 0, duration: a.durationSec || 0 };
  }
  return { kind: "image", src, w: a.imgW || 0, h: a.imgH || 0 };
}

// What visitors receive: nothing about the owner or the money.
function publicAd(id, a) {
  return { id, type: a.type, title: a.title, description: a.description || "", cta: a.cta, link: a.link, media: mediaOf(id, a) };
}

// What the owner sees in the Ads Manager.
function ownerAd(id, a) {
  return {
    id,
    name: a.name,
    type: a.type,
    title: a.title,
    description: a.description || "",
    cta: a.cta,
    link: a.link,
    placements: a.placements || [],
    status: a.status,
    media: mediaOf(id, a),
    imageUrl: a.imageUrl || "",
    budgetCents: a.budgetCents || 0,
    viewsBought: a.viewsBought || 0,
    views: a.views || 0,
    clicks: a.clicks || 0,
    vSrc: { ...zeroSrc(), ...(a.vSrc || {}) },
    cSrc: { ...zeroSrc(), ...(a.cSrc || {}) },
    days: a.days || {},
    createdMs: ms(a.createdAt),
  };
}

function canServe(a, placement) {
  return a && a.status === "active" && (a.views || 0) < (a.viewsBought || 0) && (a.placements || []).includes(placement);
}

// ---- live index ---------------------------------------------------------------

let idxCache = { at: 0, data: null };
async function liveIndex() {
  if (idxCache.data && Date.now() - idxCache.at < 30_000) return idxCache.data;
  const snap = await indexRef().get();
  const d = snap.exists ? snap.data() : {};
  idxCache = { at: Date.now(), data: { feed: d.feed || [], community: d.community || [], messages: d.messages || [] } };
  return idxCache.data;
}

// Puts the ad into (or takes it out of) the lists for its placements.
async function syncIndex(id, placements, live) {
  const patch = {};
  for (const p of PLACEMENT_IDS) {
    patch[p] = live && placements.includes(p) ? FieldValue.arrayUnion(id) : FieldValue.arrayRemove(id);
  }
  await indexRef().set(patch, { merge: true });
  idxCache = { at: 0, data: null };
}

// ---- reading ---------------------------------------------------------------------

export async function listMine(uid) {
  const snap = await ads().where("ownerUid", "==", uid).get();
  return snap.docs.map((d) => ownerAd(d.id, d.data())).sort((a, b) => b.createdMs - a.createdMs);
}

export async function listOrders(uid) {
  const snap = await orders().where("ownerUid", "==", uid).get();
  return snap.docs
    .map((d) => {
      const o = d.data();
      return { id: d.id, adId: o.adId, adName: o.adName, kind: o.kind, type: o.type, budgetCents: o.budgetCents, extraCents: o.extraCents, totalCents: o.totalCents, views: o.views, mode: o.mode, createdMs: ms(o.createdAt) };
    })
    .sort((a, b) => b.createdMs - a.createdMs)
    .slice(0, 100);
}

async function ownedAd(uid, id) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(id || ""))) throw new HttpError(404, "Ad not found.");
  const ref = ads().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerUid !== uid) throw new HttpError(404, "Ad not found.");
  return { ref, data: snap.data() };
}

// ---- creative checks -----------------------------------------------------------------

function parseImage(data) {
  const m = IMG_RE.exec(String(data || ""));
  if (!m) throw new HttpError(400, "That image couldn’t be read. Use a JPG, PNG or WebP.");
  if (Buffer.byteLength(m[2], "base64") > 700_000) throw new HttpError(400, "That image is too large. Try a smaller one.");
  return data;
}

function paymentGate(totalCents) {
  if (!ADS_FREE_WHILE_TESTING && totalCents > 0) {
    throw new HttpError(402, "Payments aren’t connected yet, so ads can’t be paid for right now.");
  }
}

async function recordOrder({ uid, ad, adId, kind, q }) {
  await orders().add({
    ownerUid: uid,
    adId,
    adName: ad.name,
    kind,
    type: ad.type,
    budgetCents: q.budgetCents,
    extraCents: q.extraCents,
    totalCents: q.totalCents,
    views: q.views,
    mode: ADS_FREE_WHILE_TESTING ? "test" : "paid",
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ---- creating and editing --------------------------------------------------------------

export async function createAd(user, input) {
  const type = input.type === "video" ? "video" : "image";
  const { value, errors } = validateCopy(input);
  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], { fields: errors });

  const q = quote(type, input.budgetCents);
  if (Math.round(Number(input.budgetCents)) < BUDGET.minCents) throw new HttpError(400, "The minimum budget is $5.00.");
  paymentGate(q.totalCents);

  const doc = { ...value, type, ownerUid: user.uid, ownerName: user.username };
  let imageData = null;
  let ref;

  if (type === "image") {
    ref = ads().doc();
    if (input.imageData) {
      imageData = parseImage(input.imageData);
      doc.hasImage = true;
    } else {
      const url = cleanUrl(input.imageUrl);
      if (!url || !url.startsWith("https://")) throw new HttpError(400, "Paste a direct https:// link to the image, or upload one.");
      doc.imageUrl = url;
    }
  } else {
    const id = String(input.adId || "");
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new HttpError(400, "Upload the video first.");
    ref = ads().doc(id);
    const dur = Number(input.durationSec);
    if (!Number.isFinite(dur) || dur < 1 || dur > VIDEO_MAX_SECONDS + 0.5) throw new HttpError(400, `Video ads can be at most ${VIDEO_MAX_SECONDS} seconds.`);
    const bucket = getAdminBucket();
    if (!bucket) throw new HttpError(501, "Video uploads aren’t switched on for this site yet.");
    const file = bucket.file(`ad-videos/${user.uid}/${id}`);
    let meta;
    try { [meta] = await file.getMetadata(); } catch { throw new HttpError(400, "We couldn’t find your uploaded video. Upload it again."); }
    if (Number(meta.size) > VIDEO_MAX_MB * 1024 * 1024) throw new HttpError(400, `Videos can be at most ${VIDEO_MAX_MB} MB.`);
    doc.durationSec = Math.round(dur * 10) / 10;
    doc.videoType = VIDEO_TYPES.includes(meta.contentType) ? meta.contentType : "video/mp4";
    if (input.imageData) { imageData = parseImage(input.imageData); doc.hasImage = true; }
  }
  doc.imgW = Math.min(8000, Math.max(0, Math.round(Number(input.imgW) || 0)));
  doc.imgH = Math.min(8000, Math.max(0, Math.round(Number(input.imgH) || 0)));

  const live = {
    ...doc,
    status: "active",
    budgetCents: q.budgetCents,
    viewsBought: q.views,
    views: 0,
    clicks: 0,
    vSrc: zeroSrc(),
    cSrc: zeroSrc(),
    days: {},
    mediaV: 1,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(live);
  if (imageData) await ref.collection("media").doc("0").set({ data: imageData });
  await recordOrder({ uid: user.uid, ad: doc, adId: ref.id, kind: "launch", q });
  await syncIndex(ref.id, doc.placements, true);
  return ref.id;
}

export async function updateAd(user, id, input) {
  const { ref, data } = await ownedAd(user.uid, id);
  if (data.status === "ended") throw new HttpError(400, "Ended ads can’t be edited.");
  const { value, errors } = validateCopy(input, { partial: true });
  if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors)[0], { fields: errors });
  const patch = { ...value };
  let imageData = null;
  if (data.type === "image" || input.imageData) {
    if (input.imageData) {
      imageData = parseImage(input.imageData);
      Object.assign(patch, { hasImage: true, imageUrl: FieldValue.delete(), mediaV: (data.mediaV || 1) + 1, imgW: Math.round(Number(input.imgW) || 0), imgH: Math.round(Number(input.imgH) || 0) });
    } else if (data.type === "image" && input.imageUrl !== undefined && input.imageUrl !== data.imageUrl) {
      const url = cleanUrl(input.imageUrl);
      if (!url || !url.startsWith("https://")) throw new HttpError(400, "Paste a direct https:// link to the image, or upload one.");
      Object.assign(patch, { imageUrl: url, hasImage: false, mediaV: (data.mediaV || 1) + 1, imgW: 0, imgH: 0 });
    }
  }
  if (Object.keys(patch).length === 0) return;
  await ref.update(patch);
  if (imageData) await ref.collection("media").doc("0").set({ data: imageData });
  if (value.placements) await syncIndex(id, value.placements, data.status === "active");
  idxCache = { at: 0, data: null };
}

export async function setStatus(user, id, action) {
  const { ref, data } = await ownedAd(user.uid, id);
  if (data.status === "ended") throw new HttpError(400, "This ad has ended.");
  if (action === "pause") {
    await ref.update({ status: "paused" });
    await syncIndex(id, data.placements, false);
  } else if (action === "resume") {
    if ((data.views || 0) >= (data.viewsBought || 0)) throw new HttpError(400, "This ad is out of balance. Add funds to keep it running.");
    await ref.update({ status: "active" });
    await syncIndex(id, data.placements, true);
  } else if (action === "end") {
    await ref.update({ status: "ended", endedAt: FieldValue.serverTimestamp() });
    await syncIndex(id, data.placements, false);
  }
}

export async function topUp(user, id, budgetCents) {
  const { ref, data } = await ownedAd(user.uid, id);
  if (data.status === "ended") throw new HttpError(400, "Ended ads can’t be topped up. Create a new ad instead.");
  if (Math.round(Number(budgetCents)) < BUDGET.minCents) throw new HttpError(400, "The minimum top-up is $5.00.");
  const q = quote(data.type, clampBudgetCents(budgetCents));
  paymentGate(q.totalCents);
  const patch = { budgetCents: inc(q.budgetCents), viewsBought: inc(q.views) };
  const revive = data.status === "exhausted";
  if (revive) patch.status = "active";
  await ref.update(patch);
  await recordOrder({ uid: user.uid, ad: data, adId: id, kind: "topup", q });
  if (revive) await syncIndex(id, data.placements, true);
}

// ---- video upload slot ---------------------------------------------------------------------

export async function videoUploadSlot(user, { size, type }) {
  const bucket = getAdminBucket();
  if (!bucket) throw new HttpError(501, "Video uploads aren’t switched on for this site yet. Use an image ad instead.");
  if (!VIDEO_TYPES.includes(type)) throw new HttpError(400, "Use an MP4, MOV or WebM video.");
  if (!Number.isFinite(size) || size <= 0 || size > VIDEO_MAX_MB * 1024 * 1024) throw new HttpError(400, `Videos can be at most ${VIDEO_MAX_MB} MB.`);
  const adId = ads().doc().id;
  const [uploadUrl] = await bucket.file(`ad-videos/${user.uid}/${adId}`).getSignedUrl({
    version: "v4", action: "write", expires: Date.now() + 20 * 60 * 1000, contentType: type,
  });
  return { adId, uploadUrl, contentType: type };
}

export async function videoFile(id) {
  const bucket = getAdminBucket();
  if (!bucket || !/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  const snap = await ads().doc(id).get();
  const a = snap.data();
  if (!a || a.type !== "video") return null;
  return bucket.file(`ad-videos/${a.ownerUid}/${id}`);
}

export async function imageBytes(id) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  const snap = await ads().doc(id).collection("media").doc("0").get();
  const m = snap.exists && IMG_RE.exec(snap.data().data || "");
  return m ? { mime: m[1], buffer: Buffer.from(m[2], "base64") } : null;
}

// ---- serving ----------------------------------------------------------------------------------

const adCache = new Map(); // id -> { at, ad }
function cached(id) {
  const c = adCache.get(id);
  return c && Date.now() - c.at < 45_000 ? c.ad : null;
}

// ONE random live ad for a placement. `exclude` = ids this visitor just saw.
export async function serveAd(placement, exclude = []) {
  if (!PLACEMENT_IDS.includes(placement)) return null;
  const idx = await liveIndex();
  let pool = (idx[placement] || []).filter((id) => !exclude.includes(id));
  if (pool.length === 0) {
    // Everything was shown already: start over, but never repeat the very last one if there is a choice.
    const all = idx[placement] || [];
    const last = exclude[exclude.length - 1];
    pool = all.length > 1 ? all.filter((id) => id !== last) : all;
  }
  for (let tries = 0; tries < 3 && pool.length; tries += 1) {
    const i = Math.floor(Math.random() * pool.length);
    const id = pool.splice(i, 1)[0];
    let a = cached(id);
    if (!a) {
      const snap = await ads().doc(id).get();
      a = snap.exists ? snap.data() : null;
      if (a) adCache.set(id, { at: Date.now(), ad: a });
    }
    if (canServe(a, placement)) return publicAd(id, a);
    // Stale entry (paused, out of balance, removed): drop it from the index for next time.
    if (!a || a.status !== "active") syncIndex(id, PLACEMENT_IDS, false).catch(() => {});
  }
  return null;
}

// ---- tracking ------------------------------------------------------------------------------------

const recent = new Map(); // dedupe key -> time
function seenRecently(key, windowMs) {
  const now = Date.now();
  const t = recent.get(key);
  if (t && now - t < windowMs) return true;
  recent.set(key, now);
  if (recent.size > 5000) for (const [k, at] of recent) if (now - at > 60_000) recent.delete(k);
  return false;
}

// Counts one view or click. Views are only counted while the ad still has
// balance, so an advertiser is never charged for more than they bought.
// The owner's own views and clicks are never counted.
export async function track({ adId, source, event, viewerUid, viewerKey }) {
  if (!PLACEMENT_IDS.includes(source) || !["view", "click"].includes(event)) return;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(adId || ""))) return;
  if (seenRecently(`${adId}|${viewerKey}|${source}|${event}`, event === "view" ? 20_000 : 3_000)) return;

  const ref = ads().doc(adId);
  const day = dayKey();
  const outcome = await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const a = snap.data();
    if (viewerUid && viewerUid === a.ownerUid) return null;
    if (event === "view") {
      if (a.status !== "active" || (a.views || 0) >= (a.viewsBought || 0)) return null;
      const patch = { views: inc(), vSrc: { [source]: inc() }, days: { [day]: { v: inc() } } };
      const done = (a.views || 0) + 1 >= (a.viewsBought || 0);
      if (done) patch.status = "exhausted";
      tx.set(ref, patch, { merge: true });
      return done ? { exhausted: a.placements || [] } : {};
    }
    if (a.status === "ended") return null;
    tx.set(ref, { clicks: inc(), cSrc: { [source]: inc() }, days: { [day]: { c: inc() } } }, { merge: true });
    return {};
  });
  if (outcome?.exhausted) {
    adCache.delete(adId);
    await syncIndex(adId, outcome.exhausted, false);
  }
}
