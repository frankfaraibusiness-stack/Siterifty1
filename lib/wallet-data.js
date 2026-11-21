import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { personFrom } from "@/lib/chat-social";
import { cleanMills } from "@/lib/gifts-data";
import { activityKind } from "@/lib/wallet";

// Everything the Wallet page (/wallet) shows, read on the server for the signed-in member only.
//
//   users/{uid}.walletMills          the REAL balance in mills. (lib/gifts.js INFINITE_WALLET only affects gift
//                                    checkout; this page always shows what is really stored, $0.000 if nothing.)
//   users/{uid}.depositedMills       lifetime money the member deposited. Nothing writes it yet: the payment
//                                    code should do `depositedMills: FieldValue.increment(x)` next to the
//                                    wallet credit and write a wallet_ledger row with type "deposit".
//   users/{uid}.referralEarnedMills  lifetime referral bonuses (written by lib/referrals-data.js)
//   creatorEarnings/{uid}.micros     lifetime ad revenue, in micro-dollars (lib/instream-ads-data.js)
//   users/{uid}/gifts_received/*     gifts the member received; their creatorMills (the 30% share) are summed
//   wallet_ledger/*  {uid,type,amountMills,createdAt,status?}   the activity log. Types: see lib/wallet.js.
//
// Every query uses a single equality or no filter, so no composite index is needed; sorting is in memory.

const GIFT_SUM_LIMIT = 2000;
const LOG_LIMIT = 60;
const STRIP_SHOWN = 6;

const toDate = (t) => t?.toDate?.() ?? null;
const fmtDate = (d) =>
  d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";

async function giftsReceivedMills(db, uid) {
  try {
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("gifts_received")
      .select("creatorMills")
      .limit(GIFT_SUM_LIMIT)
      .get();
    return snap.docs.reduce((s, d) => s + cleanMills(d.data().creatorMills), 0);
  } catch {
    return 0;
  }
}

async function adMicros(db, uid) {
  try {
    const snap = await db.collection("creatorEarnings").doc(uid).get();
    return Math.max(0, Number(snap.data()?.micros) || 0);
  } catch {
    return 0;
  }
}

async function activityLog(db, uid) {
  try {
    const snap = await db.collection("wallet_ledger").where("uid", "==", uid).limit(300).get();
    return snap.docs
      .map((doc) => {
        const d = doc.data();
        const at = toDate(d.createdAt);
        const kind = activityKind(d.type);
        return {
          id: doc.id,
          label: kind.label,
          group: kind.group,
          amountMills: Math.trunc(Number(d.amountMills) || 0),
          status: typeof d.status === "string" ? d.status.slice(0, 20) : "",
          at: at ? at.getTime() : 0,
          dateText: fmtDate(at),
          test: d.testWallet === true,
        };
      })
      // Test-mode gifts the member SENT moved no money (0 mills), so they are not worth a row.
      // Test-mode credits they RECEIVED did add to the balance, so those stay.
      .filter((r) => !(r.test && r.amountMills === 0))
      .sort((a, b) => b.at - a.at)
      .slice(0, LOG_LIMIT);
  } catch {
    return [];
  }
}

// REAL members for the stacked-profiles strip: nobody is invented, the "+N more" is the real member count.
// No live/online tracking, just public members.
async function crowd(db, viewerUid) {
  const out = { people: [], more: 0, total: 0 };
  try {
    const countSnap = await db.collection("users").count().get();
    out.total = Number(countSnap.data().count) || 0;

    const seen = new Set();
    const people = [];
    const take = (uid, d) => {
      if (people.length >= STRIP_SHOWN || seen.has(uid) || uid === viewerUid) return;
      if (!d || !d.username || d.prefs?.account?.isPrivate === true) return;
      seen.add(uid);
      const p = personFrom(uid, d);
      people.push({ username: p.username, displayName: p.displayName, a: p.a, b: p.b, hasAvatar: p.hasAvatar, avatarV: p.avatarV });
    };

    if (people.length < STRIP_SHOWN) {
      const snap = await db.collection("users").limit(40).get();
      for (const s of snap.docs) take(s.id, s.data());
    }
    out.people = people;
    // The viewer is a member too but is never shown in their own strip.
    out.more = Math.max(0, out.total - (viewerUid ? 1 : 0) - people.length);
  } catch {
    // The strip is a bonus; the wallet works without it.
  }
  return out;
}

export async function getWalletOverview(user) {
  const db = getAdminDb();
  const uid = user.uid;
  const [userSnap, ads, gifts, log, people] = await Promise.all([
    db.collection("users").doc(uid).get(),
    adMicros(db, uid),
    giftsReceivedMills(db, uid),
    activityLog(db, uid),
    crowd(db, uid),
  ]);
  const d = userSnap.exists ? userSnap.data() : {};
  return {
    displayName: d.displayName || user.username,
    username: user.username,
    gender: d.gender === "male" || d.gender === "female" ? d.gender : null,
    balanceMills: cleanMills(d.walletMills),
    sources: {
      depositsMills: cleanMills(d.depositedMills),
      adsMills: Math.floor(ads / 1000), // micro-dollars -> mills
      adsMicros: ads,
      giftsMills: gifts,
      referralMills: cleanMills(d.referralEarnedMills),
    },
    log,
    crowd: people,
  };
}
