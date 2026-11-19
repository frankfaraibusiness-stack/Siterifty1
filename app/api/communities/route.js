import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getTheme } from "@/lib/profile-themes";
import {
  FIXED_RULE, FLAIRS, LIMITS, cleanMultiline, cleanText, hasLink, normalizePermissions,
  normalizeQuestions, normalizeRules, normalizeTag, roleRank, isStaff, validateCommunity,
} from "@/lib/community-schema";
import { postingStatus } from "@/lib/community-data";

export const runtime = "nodejs";

const DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_ASSET_CHARS = 700_000;
const MAX_POST_IMAGE_CHARS = 420_000;

const fail = (error, status = 400, fields) => NextResponse.json({ error, fields }, { status });
const ok = (extra = {}) => NextResponse.json({ ok: true, ...extra });

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return fail("Log in to do that.", 401);

  let body;
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  const action = String(body?.action || "");
  const db = getAdminDb();
  const communities = db.collection("communities");
  const userRef = db.collection("users").doc(user.uid);

  // ---- create (no existing community yet) --------------------------------
  if (action === "check-slug") {
    const slug = String(body.slug || "").toLowerCase();
    const snap = await communities.where("slugLower", "==", slug).limit(1).get();
    return ok({ available: snap.empty });
  }
  if (action === "create") return create(db, communities, userRef, user, body.draft);

  // ---- everything below targets one community ----------------------------
  const cref = communities.doc(String(body.communityId || "x"));
  const csnap = await cref.get();
  if (!csnap.exists) return fail("That community doesn’t exist any more.", 404);
  const c = csnap.data();
  const perms = normalizePermissions(c.permissions);
  const mSnap = await cref.collection("members").doc(user.uid).get();
  const me = mSnap.exists ? mSnap.data() : null;
  const myRole = me?.role || null;
  const target = String(body.uid || "");
  const ctx = { db, cref, c, perms, user, userRef, me, myRole, body, target };

  const handlers = {
    join, request: requestToJoin, "cancel-request": cancelRequest, leave,
    approve: (x) => decide(x, true), decline: (x) => decide(x, false),
    "set-role": setRole, remove: removeMember, unban,
    update, post, "delete-post": deletePost, "like-post": likePost, "pin-post": pinPost,
    "transfer-owner": transferOwner, "delete-community": deleteCommunity,
  };
  const h = handlers[action];
  if (!h) return fail("Unknown action.");
  return h(ctx);
}

// ---------------------------------------------------------------------------
async function create(db, communities, userRef, user, d) {
  if (!d || typeof d !== "object") return fail("Invalid request.");
  const slug = String(d.slug || "").toLowerCase();
  const fields = validateCommunity({ ...d, slug });
  if (!d.pledge) fields.pledge = "Confirm this community is only about GTA 6.";
  if (Object.keys(fields).length) return fail(Object.values(fields)[0], 422, fields);

  const [owned, taken, userSnap] = await Promise.all([
    communities.where("ownerUid", "==", user.uid).limit(LIMITS.owned + 1).get(),
    communities.where("slugLower", "==", slug).limit(1).get(),
    userRef.get(),
  ]);
  if (owned.size >= LIMITS.owned) return fail(`You can run up to ${LIMITS.owned} communities.`, 403);
  if (!taken.empty) return fail("That handle is taken. Try another.", 409, { slug: "That handle is taken." });
  if ((userSnap.data()?.communityIds || []).length >= LIMITS.joined) return fail("You’ve joined the maximum number of communities.", 403);

  const assets = [];
  for (const kind of ["avatar", "banner"]) {
    const data = d[kind];
    if (!data) continue;
    if (typeof data !== "string" || !DATA_URL.test(data) || data.length > MAX_ASSET_CHARS) return fail(`Your ${kind} image couldn’t be processed. Try a smaller one.`);
    assets.push({ kind, data });
  }

  const private_ = d.privacy === "private";
  const theme = getTheme(userSnap.data()?.theme);
  const ref = communities.doc();
  const batch = db.batch();
  batch.set(ref, {
    name: cleanText(d.name, LIMITS.name),
    slug, slugLower: slug,
    tagline: cleanText(d.tagline, LIMITS.tagline),
    description: cleanMultiline(d.description, LIMITS.description),
    category: d.category,
    tags: [...new Set((Array.isArray(d.tags) ? d.tags : []).map(normalizeTag).filter(Boolean))].slice(0, LIMITS.tags),
    privacy: private_ ? "private" : "public",
    listed: private_ ? d.listed !== false : true,
    questions: private_ ? normalizeQuestions(d.questions) : [],
    rules: normalizeRules(d.rules),
    theme: d.theme, scene: d.scene, icon: d.icon,
    hasAvatar: assets.some((a) => a.kind === "avatar"),
    hasBanner: assets.some((a) => a.kind === "banner"),
    assetsV: Date.now(),
    permissions: normalizePermissions(d.permissions),
    ownerUid: user.uid, ownerName: user.username,
    memberCount: 1, postCount: 0,
    createdAt: Timestamp.now(), lastPostAt: null,
  });
  for (const a of assets) batch.set(ref.collection("assets").doc(a.kind), { data: a.data });
  batch.set(ref.collection("members").doc(user.uid), {
    uid: user.uid, username: user.username, role: "owner", joinedAt: Timestamp.now(), a: theme.a, b: theme.b,
  });
  batch.set(userRef, { communityIds: FieldValue.arrayUnion(ref.id) }, { merge: true });
  await batch.commit();
  return ok({ slug, id: ref.id });
}

async function join({ db, cref, c, user, userRef, me, body }) {
  if (me) return ok();
  if (c.privacy === "private") return fail("This community needs approval to join.", 403);
  const [ban, uSnap] = await Promise.all([cref.collection("bans").doc(user.uid).get(), userRef.get()]);
  if (ban.exists) return fail("You can’t join this community.", 403);
  if ((uSnap.data()?.communityIds || []).length >= LIMITS.joined) return fail("You’ve joined the maximum number of communities.", 403);
  const theme = getTheme(uSnap.data()?.theme);
  const batch = db.batch();
  batch.set(cref.collection("members").doc(user.uid), {
    uid: user.uid, username: user.username, role: "member", joinedAt: Timestamp.now(), a: theme.a, b: theme.b,
  });
  batch.update(cref, { memberCount: FieldValue.increment(1) });
  batch.set(userRef, { communityIds: FieldValue.arrayUnion(cref.id) }, { merge: true });
  await batch.commit();
  return ok();
}

async function requestToJoin({ db, cref, c, user, userRef, me, body }) {
  if (me) return ok();
  if (c.privacy !== "private") return fail("This community is open. Just join.");
  if (!body.agreed) return fail("Agree to the community rules to continue.", 422);
  const ban = await cref.collection("bans").doc(user.uid).get();
  if (ban.exists) return fail("You can’t join this community.", 403);
  const qs = c.questions || [];
  const given = Array.isArray(body.answers) ? body.answers : [];
  const answers = [];
  for (const [i, q] of qs.entries()) {
    const a = cleanText(given[i], LIMITS.answer);
    if (q.required && a.length < 2) return fail(`Answer “${q.text}” to send your request.`, 422);
    answers.push({ q: q.text, a });
  }
  const batch = db.batch();
  batch.set(cref.collection("requests").doc(user.uid), { uid: user.uid, username: user.username, answers, createdAt: Timestamp.now() });
  batch.set(userRef, { communityPending: FieldValue.arrayUnion(cref.id) }, { merge: true });
  await batch.commit();
  return ok();
}

async function cancelRequest({ db, cref, user, userRef }) {
  const batch = db.batch();
  batch.delete(cref.collection("requests").doc(user.uid));
  batch.set(userRef, { communityPending: FieldValue.arrayRemove(cref.id) }, { merge: true });
  await batch.commit();
  return ok();
}

async function leave({ db, cref, me, myRole, user, userRef }) {
  if (!me) return ok();
  if (myRole === "owner") return fail("Owners can’t leave. Transfer ownership or delete the community first.", 403);
  const batch = db.batch();
  batch.delete(cref.collection("members").doc(user.uid));
  batch.update(cref, { memberCount: FieldValue.increment(-1) });
  batch.set(userRef, { communityIds: FieldValue.arrayRemove(cref.id) }, { merge: true });
  await batch.commit();
  return ok();
}

async function decide({ db, cref, perms, myRole, target }, approve) {
  const allowed = roleRank(myRole) >= 3 || (myRole === "mod" && perms.modsCanApprove);
  if (!allowed) return fail("You can’t review join requests here.", 403);
  const reqRef = cref.collection("requests").doc(target);
  const req = await reqRef.get();
  if (!req.exists) return fail("That request is already handled.", 404);
  const tUserRef = db.collection("users").doc(target);
  const batch = db.batch();
  batch.delete(reqRef);
  batch.set(tUserRef, { communityPending: FieldValue.arrayRemove(cref.id) }, { merge: true });
  if (approve) {
    const tSnap = await tUserRef.get();
    const theme = getTheme(tSnap.data()?.theme);
    batch.set(cref.collection("members").doc(target), {
      uid: target, username: req.data().username, role: "member", joinedAt: Timestamp.now(), a: theme.a, b: theme.b,
    });
    batch.update(cref, { memberCount: FieldValue.increment(1) });
    batch.set(tUserRef, { communityIds: FieldValue.arrayUnion(cref.id) }, { merge: true });
  }
  await batch.commit();
  return ok();
}

async function setRole({ cref, myRole, body, target }) {
  const role = body.role;
  if (!["admin", "mod", "member"].includes(role)) return fail("Invalid role.");
  const t = await cref.collection("members").doc(target).get();
  if (!t.exists) return fail("That person isn’t a member.", 404);
  const tRole = t.data().role;
  if (tRole === "owner") return fail("The owner’s role can’t be changed.", 403);
  if (myRole === "owner") { /* may set anything */ }
  else if (myRole === "admin") {
    if (roleRank(tRole) >= 3 || role === "admin") return fail("Only the owner can manage admins.", 403);
  } else return fail("You can’t change roles here.", 403);
  await t.ref.update({ role });
  return ok();
}

async function removeMember({ db, cref, myRole, user, body, target }) {
  if (!isStaff(myRole)) return fail("You can’t remove people here.", 403);
  if (target === user.uid) return fail("Use Leave to remove yourself.");
  const t = await cref.collection("members").doc(target).get();
  if (!t.exists) return fail("That person isn’t a member.", 404);
  const tRole = t.data().role;
  if (roleRank(tRole) >= roleRank(myRole)) return fail("You can only remove people below your role.", 403);
  const batch = db.batch();
  batch.delete(t.ref);
  batch.update(cref, { memberCount: FieldValue.increment(-1) });
  batch.set(db.collection("users").doc(target), { communityIds: FieldValue.arrayRemove(cref.id) }, { merge: true });
  if (body.ban) batch.set(cref.collection("bans").doc(target), { uid: target, username: t.data().username, createdAt: Timestamp.now() });
  await batch.commit();
  return ok();
}

async function unban({ cref, myRole, target }) {
  if (roleRank(myRole) < 3) return fail("Only admins can lift a ban.", 403);
  await cref.collection("bans").doc(target).delete();
  return ok();
}

// Settings are saved one section at a time from the manage panel.
async function update({ db, cref, c, myRole, body }) {
  if (roleRank(myRole) < 3) return fail("Only admins can change community settings.", 403);
  const d = body.data || {};
  const section = body.section;
  const patch = {};
  if (section === "profile") {
    const fields = validateCommunity({ ...d, slug: undefined }, ["focus", "identity"]);
    if (Object.keys(fields).length) return fail(Object.values(fields)[0], 422, fields);
    Object.assign(patch, {
      name: cleanText(d.name, LIMITS.name), tagline: cleanText(d.tagline, LIMITS.tagline),
      description: cleanMultiline(d.description, LIMITS.description), category: d.category,
      tags: [...new Set((Array.isArray(d.tags) ? d.tags : []).map(normalizeTag).filter(Boolean))].slice(0, LIMITS.tags),
    });
  } else if (section === "look") {
    const fields = validateCommunity(d, ["look"]);
    if (Object.keys(fields).length) return fail(Object.values(fields)[0], 422, fields);
    Object.assign(patch, { theme: d.theme, scene: d.scene, icon: d.icon });
    const writes = [];
    for (const kind of ["avatar", "banner"]) {
      const v = d[kind];
      if (v === null) { writes.push([kind, null]); patch[kind === "avatar" ? "hasAvatar" : "hasBanner"] = false; }
      else if (v) {
        if (typeof v !== "string" || !DATA_URL.test(v) || v.length > MAX_ASSET_CHARS) return fail(`Your ${kind} image couldn’t be processed. Try a smaller one.`);
        writes.push([kind, v]); patch[kind === "avatar" ? "hasAvatar" : "hasBanner"] = true;
      }
    }
    if (writes.length) {
      patch.assetsV = Date.now();
      const batch = db.batch();
      for (const [kind, v] of writes) {
        const r = cref.collection("assets").doc(kind);
        v ? batch.set(r, { data: v }) : batch.delete(r);
      }
      await batch.commit();
    }
  } else if (section === "access") {
    const fields = validateCommunity(d, ["access"]);
    if (Object.keys(fields).length) return fail(Object.values(fields)[0], 422, fields);
    const priv = d.privacy === "private";
    Object.assign(patch, { privacy: d.privacy, listed: priv ? d.listed !== false : true, questions: priv ? normalizeQuestions(d.questions) : [] });
  } else if (section === "rules") {
    patch.rules = normalizeRules(d.rules);
  } else if (section === "permissions") {
    patch.permissions = normalizePermissions(d);
  } else return fail("Unknown settings section.");
  await cref.update(patch);
  return ok();
}

async function post({ db, cref, c, perms, me, myRole, user, body }) {
  if (!me) return fail("Join to post here.", 403);
  const v = { role: myRole, joinedMs: me.joinedAt?.toMillis?.() ?? 0 };
  const status = postingStatus({ permissions: perms }, v);
  if (!status.ok) return fail(status.reason, 403);

  const text = cleanMultiline(body.text, LIMITS.post);
  const imgs = Array.isArray(body.images) ? body.images : [];
  if (text.length < 1 && imgs.length < 1) return fail("Write something first.", 422);
  const flair = FLAIRS.some((f) => f.id === body.flair) ? body.flair : "discussion";
  const staff = isStaff(myRole);

  if (hasLink(text) && perms.links !== "everyone" && !(perms.links === "staff" && staff)) {
    return fail(perms.links === "off" ? "Links aren’t allowed in this community." : "Only moderators and admins can post links here.", 403);
  }
  if (imgs.length) {
    if (perms.images !== "everyone" && !(perms.images === "staff" && staff)) {
      return fail(perms.images === "off" ? "Images aren’t allowed in this community." : "Only moderators and admins can post images here.", 403);
    }
    if (imgs.length > LIMITS.postImages) return fail(`Up to ${LIMITS.postImages} images per post.`);
    for (const i of imgs) if (typeof i !== "string" || !DATA_URL.test(i) || i.length > MAX_POST_IMAGE_CHARS) return fail("One of your images couldn’t be processed. Try a smaller one.");
  }
  if (flair === "leak" && perms.leakPolicy === "banned") return fail("Leaks aren’t allowed in this community.", 403);

  if (!staff && perms.slowMode) {
    const last = me.lastPostAt?.toMillis?.() ?? 0;
    const wait = perms.slowMode * 1000 - (Date.now() - last);
    if (wait > 0) return fail(`Slow mode is on. Try again in ${Math.ceil(wait / 1000)}s.`, 429);
  } else if (Date.now() - (me.lastPostAt?.toMillis?.() ?? 0) < 3000) {
    return fail("Slow down a little.", 429);
  }

  const pref = cref.collection("posts").doc();
  const batch = db.batch();
  batch.set(pref, {
    uid: user.uid, user: user.username, role: myRole, a: me.a || "#ff3d7f", b: me.b || "#7b2ff7",
    text, flair, imageCount: imgs.length, likedBy: [], pinned: false, createdAt: Timestamp.now(),
  });
  imgs.forEach((data, n) => batch.set(pref.collection("media").doc(String(n)), { data }));
  batch.update(cref.collection("members").doc(user.uid), { lastPostAt: Timestamp.now() });
  batch.update(cref, { postCount: FieldValue.increment(1), lastPostAt: Timestamp.now() });
  await batch.commit();
  return ok({ id: pref.id });
}

async function deletePost({ db, cref, myRole, user, body }) {
  const pref = cref.collection("posts").doc(String(body.postId || "x"));
  const p = await pref.get();
  if (!p.exists) return ok();
  if (p.data().uid !== user.uid && !isStaff(myRole)) return fail("You can’t delete this post.", 403);
  await db.recursiveDelete(pref);
  await cref.update({ postCount: FieldValue.increment(-1) });
  return ok();
}

async function likePost({ db, cref, me, user, body }) {
  if (!me) return fail("Join to react.", 403);
  const pref = cref.collection("posts").doc(String(body.postId || "x"));
  await db.runTransaction(async (tx) => {
    const p = await tx.get(pref);
    if (!p.exists) return;
    const liked = (p.data().likedBy || []).includes(user.uid);
    tx.update(pref, { likedBy: liked ? FieldValue.arrayRemove(user.uid) : FieldValue.arrayUnion(user.uid) });
  });
  return ok();
}

async function pinPost({ db, cref, myRole, body }) {
  if (!isStaff(myRole)) return fail("Only moderators and admins can pin.", 403);
  const pref = cref.collection("posts").doc(String(body.postId || "x"));
  const p = await pref.get();
  if (!p.exists) return fail("Post not found.", 404);
  const pin = !p.data().pinned;
  const batch = db.batch();
  if (pin) {
    const pinned = await cref.collection("posts").where("pinned", "==", true).get();
    pinned.docs.forEach((d) => batch.update(d.ref, { pinned: false }));
  }
  batch.update(pref, { pinned: pin });
  await batch.commit();
  return ok({ pinned: pin });
}

async function transferOwner({ db, cref, myRole, user, target }) {
  if (myRole !== "owner") return fail("Only the owner can transfer ownership.", 403);
  const t = await cref.collection("members").doc(target).get();
  if (!t.exists) return fail("Pick a current member.", 404);
  const batch = db.batch();
  batch.update(t.ref, { role: "owner" });
  batch.update(cref.collection("members").doc(user.uid), { role: "admin" });
  batch.update(cref, { ownerUid: target, ownerName: t.data().username });
  await batch.commit();
  return ok();
}

async function deleteCommunity({ db, cref, c, myRole, body }) {
  if (myRole !== "owner") return fail("Only the owner can delete a community.", 403);
  if (String(body.confirm || "").toLowerCase() !== c.slugLower) return fail("Type the community handle to confirm.", 422);
  await db.recursiveDelete(cref);
  return ok();
}
