import "server-only";
import { after } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { WEIGHTS, interestDelta, mergeDeltas, readInterests, signalsOf } from "@/lib/interests";

// interests/{uid}: what a member's activity says they like (hashtags, game, post type, authors).
// Written ONLY by the server, from posts the server itself loaded, with plain increments: one
// write and no read per interaction. See lib/interests.js for the shape and the time decay.

const ref = (uid) => getAdminDb().collection("interests").doc(uid);
const MAX_KEYS = 300; // a profile bigger than this gets its weakest entries dropped

const toPatch = (d) => {
  const inc = FieldValue.increment;
  const out = { w: inc(d.w), n: inc(d.n), at: Date.now() };
  for (const k of ["t", "g", "ty", "au"]) {
    const keys = Object.keys(d[k]);
    if (keys.length) out[k] = Object.fromEntries(keys.map((x) => [x, inc(d[k][x])]));
  }
  return out;
};

// Learn from an interaction ("like" | "save" | "comment" | "click") with a post.
// `post` is a mapped post (or any object with tags/title/text/type/user). Never throws.
export async function learn(uid, post, kind) {
  try {
    if (!uid || !post || post.isOwner || !WEIGHTS[kind]) return;
    await ref(uid).set(toPatch(interestDelta(signalsOf(post), WEIGHTS[kind])), { merge: true });
  } catch (err) {
    console.error("[interests] learn failed", err);
  }
}

// Same, but already-verified signals (from a signed tracking token), several at once -> one write.
export async function learnFromSignals(uid, signalList, kind) {
  try {
    if (!uid || !signalList.length || !WEIGHTS[kind]) return;
    const d = mergeDeltas(signalList.map((s) => interestDelta(s, WEIGHTS[kind])));
    await ref(uid).set(toPatch(d), { merge: true });
  } catch (err) {
    console.error("[interests] learnFromSignals failed", err);
  }
}

// Runs after the response has been sent, so a like never waits for it.
export function learnLater(uid, post, kind) {
  const run = () => learn(uid, post, kind);
  try { after(run); } catch { run(); }
}

// One read. Returns the de-inflated profile, or null for a signed-out visitor / brand-new member.
export async function loadInterests(uid) {
  if (!uid) return null;
  try {
    const snap = await ref(uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    const keys = ["t", "au"].reduce((n, k) => n + Object.keys(data[k] || {}).length, 0);
    if (keys > MAX_KEYS) pruneLater(uid, data);
    return readInterests(data);
  } catch (err) {
    console.error("[interests] load failed", err);
    return null;
  }
}

function pruneLater(uid, data) {
  const run = async () => {
    const patch = {};
    for (const k of ["t", "au"]) {
      const entries = Object.entries(data[k] || {}).sort((a, b) => b[1] - a[1]);
      if (entries.length > MAX_KEYS / 2) patch[k] = Object.fromEntries(entries.slice(MAX_KEYS / 2).map(([x]) => [x, FieldValue.delete()]));
    }
    if (Object.keys(patch).length) await ref(uid).set(patch, { merge: true });
  };
  try { after(() => run().catch(() => {})); } catch { /* skip */ }
}
