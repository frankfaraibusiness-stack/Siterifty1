import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";
const fail = (error, status = 400) => NextResponse.json({ error }, { status });
const clean = (v, max = 180) => String(v || "").replace(/[<>]/g, "").trim().slice(0, max);
const TYPES = new Set(["location", "wishlist", "vehicle", "trailer", "prediction"]);

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user?.uid || !user?.username) return fail("Log in to use the GTA 6 world hub.", 401);
  let b;
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  const db = getAdminDb();
  const users = db.collection("users");
  const userRef = users.doc(user.uid);
  const col = db.collection("gta6World");
  const action = clean(b.action, 32);

  if (action === "collect-character") {
    const character = ["lucia", "jason"].includes(b.character) ? b.character : null;
    if (!character) return fail("Choose Lucia or Jason.");
    let nextOwned = false;
    await db.runTransaction(async tx => {
      const snap = await tx.get(userRef);
      const current = snap.data()?.gta6Characters || {};
      nextOwned = current[character] !== true;
      tx.set(userRef, { gta6Characters: { [character]: nextOwned } }, { merge: true });
    });
    return NextResponse.json({ ok: true, owned: nextOwned });
  }

  if (action === "create") {
    const type = clean(b.type, 20);
    if (!TYPES.has(type)) return fail("Unknown GTA 6 feature.");
    const title = clean(b.title, 100);
    const body = clean(b.body, 1200);
    if (title.length < 3) return fail("Add a more descriptive title.");
    const data = { type, title, body, uid: user.uid, username: user.username, createdAt: Timestamp.now(), voteCount: 0, voters: [], status: "open" };
    if (type === "location") {
      data.area = clean(b.area, 60);
      data.kind = clean(b.kind, 40);
      if (!data.area || !data.kind) return fail("Choose an area and discovery type.");
    }
    if (type === "wishlist") {
      data.votes = 0; data.voters = [];
    }
    if (type === "vehicle") {
      data.vehicleType = clean(b.vehicleType, 40);
      data.ratings = {}; data.ratingTotal = 0; data.ratingCount = 0;
      if (!data.vehicleType) return fail("Choose a vehicle category.");
    }
    if (type === "trailer") {
      const frame = Number(b.frame);
      data.frame = Number.isFinite(frame) ? Math.max(0, Math.min(9999, Math.floor(frame))) : 0;
      data.trailer = clean(b.trailer, 60) || "GTA 6 trailer";
      data.trailerUrl = clean(b.trailerUrl, 300);
      if (data.trailerUrl) {
        try {
          const u = new URL(data.trailerUrl);
          if (u.protocol !== "https:" || !["youtube.com", "www.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(u.hostname)) return fail("Use a YouTube trailer link.");
        } catch { return fail("Enter a valid YouTube trailer link."); }
      }
      data.comments = 0;
    }
    if (type === "prediction") {
      const options = Array.isArray(b.options) ? b.options.map(x => clean(x, 70)).filter(Boolean).slice(0, 5) : [];
      if (options.length < 2) return fail("Add at least two prediction options.");
      data.options = [...new Set(options)];
      if (data.options.length < 2) return fail("Prediction options must be different.");
      data.votesByOption = Object.fromEntries(data.options.map(x => [x, 0]));
      data.voters = {};
      data.resolved = false;
    }
    const ref = await col.add(data);
    return NextResponse.json({ ok: true, id: ref.id });
  }

  const id = clean(b.id, 100);
  if (!id) return fail("Missing item.");
  const ref = col.doc(id);
  const snap = await ref.get();
  if (!snap.exists) return fail("That item is no longer available.", 404);
  const item = snap.data();

  if (action === "vote") {
    if (item.type === "wishlist") {
      try {
        await db.runTransaction(async tx => {
          const s = await tx.get(ref); const d = s.data(); const voters = d.voters || [];
          if (voters.includes(user.uid)) throw new Error("You already voted for this idea.");
          tx.update(ref, { voters: FieldValue.arrayUnion(user.uid), voteCount: FieldValue.increment(1) });
        });
      } catch (e) { return fail(e.message || "Your vote could not be saved.", 409); }
    } else if (item.type === "prediction") {
      const option = clean(b.option, 70);
      if (!item.options?.includes(option)) return fail("Choose a valid prediction.");
      if (item.resolved) return fail("This prediction has been resolved.");
      try {
        await db.runTransaction(async tx => {
          const s = await tx.get(ref); const d = s.data();
          if (d.voters?.[user.uid]) throw new Error("You have already made your prediction.");
          tx.update(ref, { [`voters.${user.uid}`]: option, [`votesByOption.${option}`]: FieldValue.increment(1) });
        });
      } catch (e) { return fail(e.message || "Your prediction could not be saved.", 409); }
    } else return fail("Voting isn't available for this item.");
    return NextResponse.json({ ok: true });
  }

  if (action === "rate-vehicle") {
    if (item.type !== "vehicle") return fail("Not a vehicle submission.");
    const rating = Math.max(1, Math.min(5, Math.round(Number(b.rating))));
    if (!Number.isFinite(rating)) return fail("Choose a rating from 1 to 5.");
    try {
      await db.runTransaction(async tx => {
        const s = await tx.get(ref); const d = s.data(); const ratings = d.ratings || {};
        if (ratings[user.uid]) throw new Error("You've already rated this vehicle.");
        tx.update(ref, { [`ratings.${user.uid}`]: rating, ratingTotal: FieldValue.increment(rating), ratingCount: FieldValue.increment(1) });
      });
    } catch (e) { return fail(e.message || "Your rating could not be saved.", 409); }
    return NextResponse.json({ ok: true });
  }

  if (action === "frame-comment") {
    if (item.type !== "trailer") return fail("Not a trailer discussion.");
    const text = clean(b.text, 500);
    if (text.length < 2) return fail("Write a comment first.");
    const comments = ref.collection("comments");
    await comments.add({ uid: user.uid, username: user.username, text, createdAt: Timestamp.now() });
    await ref.update({ comments: FieldValue.increment(1) });
    return NextResponse.json({ ok: true });
  }

  if (action === "resolve") {
    if (item.type !== "prediction" || item.uid !== user.uid) return fail("Only the prediction creator can resolve it.", 403);
    const winner = clean(b.winner, 70);
    if (!item.options?.includes(winner)) return fail("Choose the correct outcome.");
    if (item.resolved) return fail("This prediction is already resolved.");
    try {
      await db.runTransaction(async tx => {
        const s = await tx.get(ref); const d = s.data();
        if (d.resolved) throw new Error("Already resolved.");
        tx.update(ref, { resolved: true, winner, resolvedAt: Timestamp.now() });
        for (const [uid, choice] of Object.entries(d.voters || {})) {
          if (choice === winner) tx.set(users.doc(uid), { gta6Reputation: FieldValue.increment(10) }, { merge: true });
        }
      });
    } catch (e) { return fail(e.message || "The prediction could not be resolved.", 409); }
    return NextResponse.json({ ok: true });
  }
  return fail("Unknown action.");
}
