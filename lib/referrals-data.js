import "server-only";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  REFERRAL_BONUS_MILLS,
  REFERRAL_XP_TARGET,
  REF_COOKIE,
  cleanRefCode,
  makeRefCode,
  refProgress,
} from "@/lib/referrals";

// Referrals on Firestore (Admin SDK only, so no rules or composite indexes are needed).
//
//   referralCodes/{CODE}          { uid }                       code -> owner
//   users/{uid}.refCode           the member's own code
//   users/{uid}.referralCount     how many accounts signed up through their link   (+1 per sign-up)
//   users/{uid}.referralPaid      how many of those reached the XP target and were paid
//   users/{uid}.referralClicks    people who opened the link (best effort, one per visitor)
//   users/{uid}.referralEarnedMills   total paid by referrals, in mills
//   users/{newUid}.referredBy     uid of whoever referred this account (set once, at sign-up)
//   referrals/{referredUid}       one doc per referred account:
//                                   { referrer, referred, referredUsername, status: "pending"|"paid",
//                                     bonusMills, createdAt, paidAt? }
//   wallet_ledger/referral_{referredUid}   the wallet credit, with a FIXED id so a retry can never pay twice
//
// The payout is decided HERE, on the server, from the referred member's real XP document
// (videoPlayers/{uid}.xp, written only by lib/videos-data.js). The browser can't raise it.
const CODES = "referralCodes";
const REFERRALS = "referrals";
const LEDGER = "wallet_ledger";
const PLAYERS = "videoPlayers";
const LIST_MAX = 200;

const mills = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

// ----------------------------------------------------------------- codes
// The member's own code, created the first time they ask for it.
export async function ensureRefCode(uid) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return "";
  const existing = cleanRefCode(snap.data().refCode);
  if (existing) return existing;

  for (let i = 0; i < 8; i++) {
    const code = makeRefCode();
    const codeRef = db.collection(CODES).doc(code);
    const won = await db.runTransaction(async (tx) => {
      const [c, u] = await Promise.all([tx.get(codeRef), tx.get(userRef)]);
      const already = cleanRefCode(u.data()?.refCode);
      if (already) return already; // another tab got there first
      if (c.exists) return ""; // that code is taken, try another
      tx.set(codeRef, { uid, createdAt: FieldValue.serverTimestamp() });
      tx.set(userRef, { refCode: code }, { merge: true });
      return code;
    });
    if (won) return won;
  }
  throw new Error("Couldn't create a referral code.");
}

export async function ownerOfCode(raw) {
  const code = cleanRefCode(raw);
  if (!code) return null;
  const snap = await getAdminDb().collection(CODES).doc(code).get();
  return snap.exists ? { code, uid: snap.data().uid } : null;
}

// One more visit to someone's link. Best effort: never throws, never blocks the redirect.
export async function countRefClick(uid) {
  try {
    await getAdminDb().collection("users").doc(uid).update({ referralClicks: FieldValue.increment(1) });
  } catch {}
}

// ----------------------------------------------------------------- sign-up
// Called right after a brand-new account is created. Reads the referral cookie, records the link on the
// new account and adds +1 to the referrer. Never throws: a referral problem must never break a sign-up.
export async function claimReferral({ uid, username }) {
  try {
    const cookieStore = await cookies();
    const code = cleanRefCode(cookieStore.get(REF_COOKIE)?.value);
    if (!code) return false;
    cookieStore.delete(REF_COOKIE); // one link, one account

    const db = getAdminDb();
    const owner = await ownerOfCode(code);
    if (!owner || owner.uid === uid) return false;

    const referredRef = db.collection("users").doc(uid);
    const referrerRef = db.collection("users").doc(owner.uid);
    const refDoc = db.collection(REFERRALS).doc(uid);

    return await db.runTransaction(async (tx) => {
      const [done, referrer, referred] = await Promise.all([tx.get(refDoc), tx.get(referrerRef), tx.get(referredRef)]);
      if (done.exists || !referrer.exists) return false; // already counted, or the referrer is gone
      if (referred.exists && referred.data().referredBy) return false;
      tx.set(refDoc, {
        referrer: owner.uid,
        referred: uid,
        referredUsername: username || "",
        code,
        status: "pending",
        bonusMills: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(referredRef, { referredBy: owner.uid }, { merge: true });
      tx.update(referrerRef, { referralCount: FieldValue.increment(1) });
      return true;
    });
  } catch (err) {
    console.error("[referrals] claim failed", err);
    return false;
  }
}

// ----------------------------------------------------------------- payout
// Pays the referrer ONCE, when the referred member's XP has reached the target. Safe to call as often
// as you like: it does nothing unless there is a pending referral whose XP is high enough, and the
// ledger line has a fixed id, so the same person can never be paid twice.
export async function settleReferral(referredUid) {
  const db = getAdminDb();
  const refDoc = db.collection(REFERRALS).doc(referredUid);
  const playerRef = db.collection(PLAYERS).doc(referredUid);

  return db.runTransaction(async (tx) => {
    const [ref, player] = await Promise.all([tx.get(refDoc), tx.get(playerRef)]);
    if (!ref.exists || ref.data().status === "paid") return { paid: false };
    const xp = Math.floor(Number(player.data()?.xp) || 0);
    if (xp < REFERRAL_XP_TARGET) return { paid: false };

    const referrerUid = ref.data().referrer;
    const referrerRef = db.collection("users").doc(referrerUid);
    const ledgerRef = db.collection(LEDGER).doc(`referral_${referredUid}`);
    const [referrer, ledger] = await Promise.all([tx.get(referrerRef), tx.get(ledgerRef)]);
    if (!referrer.exists || ledger.exists) return { paid: false };

    const after = mills(referrer.data().walletMills) + REFERRAL_BONUS_MILLS;
    const now = FieldValue.serverTimestamp();
    tx.update(refDoc, { status: "paid", bonusMills: REFERRAL_BONUS_MILLS, paidAt: now, xpAtPayout: xp });
    tx.set(ledgerRef, {
      uid: referrerUid,
      type: "referral_bonus",
      amountMills: REFERRAL_BONUS_MILLS,
      balanceAfterMills: after,
      referred: referredUid,
      createdAt: now,
    });
    tx.update(referrerRef, {
      walletMills: after,
      referralPaid: FieldValue.increment(1),
      referralEarnedMills: FieldValue.increment(REFERRAL_BONUS_MILLS),
    });
    return { paid: true, referrer: referrerUid, mills: REFERRAL_BONUS_MILLS };
  });
}

// ----------------------------------------------------------------- dashboard
const ms = (t) => t?.toMillis?.() ?? 0;

export async function getReferralDashboard(user) {
  const db = getAdminDb();
  const code = await ensureRefCode(user.uid);

  const snap = await db.collection(REFERRALS).where("referrer", "==", user.uid).limit(LIST_MAX).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // XP of everyone referred (one batched read, XP only).
  const players = rows.length
    ? await db.getAll(...rows.map((r) => db.collection(PLAYERS).doc(r.id)), { fieldMask: ["xp"] })
    : [];
  const xpOf = new Map(players.map((p) => [p.id, Math.floor(Number(p.data()?.xp) || 0)]));

  // Catch-up: anyone already at the target but not yet paid (for example a payout that was interrupted)
  // is settled now, so the dashboard never shows a stale "in progress".
  const due = rows.filter((r) => r.status !== "paid" && (xpOf.get(r.id) || 0) >= REFERRAL_XP_TARGET);
  const paidNow = new Set();
  await Promise.all(
    due.map(async (r) => {
      const res = await settleReferral(r.id).catch(() => ({ paid: false }));
      if (res.paid) paidNow.add(r.id);
    })
  );

  const userSnap = await db.collection("users").doc(user.uid).get();
  const u = userSnap.data() || {};

  const referrals = rows
    .map((r) => {
      const xp = xpOf.get(r.id) || 0;
      const paid = r.status === "paid" || paidNow.has(r.id);
      return {
        uid: r.id,
        username: r.referredUsername || "member",
        joinedMs: ms(r.createdAt),
        xp: Math.min(xp, REFERRAL_XP_TARGET),
        pct: paid ? 100 : refProgress(xp),
        paid,
        paidMs: ms(r.paidAt),
      };
    })
    // In progress first (closest to the payout on top), then the ones already paid, newest payout first.
    .sort((a, b) => Number(a.paid) - Number(b.paid) || (a.paid ? b.paidMs - a.paidMs : b.xp - a.xp || b.joinedMs - a.joinedMs));

  const paidCount = referrals.filter((r) => r.paid).length;
  return {
    code,
    totals: {
      joined: Math.max(mills(u.referralCount), referrals.length),
      paid: Math.max(mills(u.referralPaid), paidCount),
      inProgress: referrals.length - paidCount,
      clicks: mills(u.referralClicks),
      earnedMills: mills(u.referralEarnedMills),
      pendingMills: (referrals.length - paidCount) * REFERRAL_BONUS_MILLS,
    },
    referrals,
    serverNow: Date.now(),
  };
}
