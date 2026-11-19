import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { HttpError, findActorByHandle, loadActor } from "@/lib/chat-social";
import { commentsRef, postRef } from "@/lib/comments-data";
import { timeAgo } from "@/lib/feed-data";
import {
  NOTE_MAX,
  cleanContext,
  INFINITE_WALLET,
  TEST_WALLET_MILLS,
  formatMills,
  getGame,
  getGift,
  giftQuote,
} from "@/lib/gifts";

// Everything about sending a gift happens HERE, on the server. The browser only
// says WHICH gift, WHO (or which comment / post / profile) and an idempotency
// key. Prices, fees, the receiver and the wallet check are all decided below.
//
// Firestore layout (Admin SDK only, so no security rules or indexes are needed):
//
//   users/{uid}.walletMills        integer, the wallet balance in mills ($0.001).
//                                  Missing = $0.000. Nothing on the site can
//                                  raise it yet (no top-up page). While
//                                  INFINITE_WALLET (lib/gifts.js) is true this
//                                  field is ignored and never charged.
//   users/{uid}.giftsSent          counter
//   users/{uid}.giftsReceived      counter
//   gifts/{fromUid}_{requestId}    the permanent record of one gift, with the
//                                  full price breakdown and WHERE it was sent
//                                  from (comment / post / profile / shop)
//   wallet_ledger/{same id}        one line per wallet movement (-total)
//   users/{toUid}/gifts_received/{same id}   what the receiver's profile shows
//   posts/{postId}[/comments/{commentId}].giftCount   counter, when sent from one
//   posts/{postId}/gifts/{same id} the PUBLIC copy shown in the comments (gift,
//                                  sender, note, which comment). It holds no
//                                  money details; those stay in gifts/{id}.
export const GIFTS = "gifts";
export const LEDGER = "wallet_ledger";
export const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

// Whole mills only, never negative.
export function cleanMills(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function getWalletMills(uid) {
  if (!uid) return 0;
  if (INFINITE_WALLET) return TEST_WALLET_MILLS;
  const snap = await getAdminDb().collection("users").doc(uid).get();
  return snap.exists ? cleanMills(snap.data().walletMills) : 0;
}

export function cleanNote(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, NOTE_MAX);
}

// What the browser may know about the person receiving the gift.
export function publicRecipient(actor) {
  const p = actor.person;
  return {
    username: p.username,
    displayName: p.displayName,
    a: p.a,
    b: p.b,
    hasAvatar: p.hasAvatar,
    avatarV: p.avatarV,
  };
}

function isBlockedEitherWay(sender, receiver) {
  const s = sender.username.toLowerCase();
  const r = receiver.username.toLowerCase();
  return (
    sender.prefs.safety.blocked.includes(r) || receiver.prefs.safety.blocked.includes(s)
  );
}

// Throws a clear HttpError when `sender` may not gift `receiver`.
export function assertCanGift(sender, receiver) {
  if (!receiver) throw new HttpError(404, "We couldn’t find that member.");
  if (receiver.uid === sender.uid) throw new HttpError(400, "You can’t send a gift to yourself.");
  if (isBlockedEitherWay(sender, receiver)) {
    throw new HttpError(403, "You can’t send a gift to this member.");
  }
}

// Works out who a gift is for. A comment or post points at its AUTHOR (read from
// the database, never from the browser); a profile or the shop uses the typed
// handle. Returns the receiver's actor, or throws.
export async function resolveReceiver(db, ctxRaw, handleRaw) {
  const ctx = cleanContext({ ...ctxRaw, to: ctxRaw?.to || handleRaw });
  if (ctx.type === "comment") {
    const snap = await commentsRef(db, ctx.postId).doc(ctx.commentId).get();
    if (!snap.exists) throw new HttpError(404, "That comment is gone.");
    const actor = await loadActor(db, String(snap.data().uid || ""));
    if (!actor) throw new HttpError(404, "We couldn’t find that member.");
    return { ctx, actor };
  }
  if (ctx.type === "post") {
    const snap = await postRef(db, ctx.postId).get();
    if (!snap.exists) throw new HttpError(404, "That post is gone.");
    const actor = await loadActor(db, String(snap.data().uid || ""));
    if (!actor) throw new HttpError(404, "We couldn’t find that member.");
    return { ctx, actor };
  }
  const handle = ctx.to || handleRaw;
  const actor = await findActorByHandle(db, handle);
  if (!actor) throw new HttpError(404, `We couldn’t find @${String(handle || "").replace(/^@/, "") || "that member"}.`);
  return { ctx: { ...ctx, to: actor.username }, actor };
}

// For the checkout page: the receiver a context points at, or null. Never throws.
export async function previewReceiver(viewer, ctxRaw) {
  try {
    const db = getAdminDb();
    const ctx = cleanContext(ctxRaw);
    if (ctx.type === "shop" && !ctx.to) return { ctx, receiver: null, problem: "" };
    const { ctx: fixed, actor } = await resolveReceiver(db, ctx, ctx.to);
    if (!viewer?.uid) return { ctx: fixed, receiver: publicRecipient(actor), problem: "" };
    const me = await loadActor(db, viewer.uid);
    try {
      if (me) assertCanGift(me, actor);
    } catch (err) {
      return { ctx: fixed, receiver: publicRecipient(actor), problem: err.message };
    }
    return { ctx: fixed, receiver: publicRecipient(actor), problem: "" };
  } catch (err) {
    if (err instanceof HttpError) return { ctx: cleanContext({ ...ctxRaw, to: "" }), receiver: null, problem: err.message };
    return { ctx: cleanContext(ctxRaw), receiver: null, problem: "" };
  }
}

// ----------------------------------------------------------------- sending
export async function sendGift(user, input) {
  const db = getAdminDb();

  const gift = getGift(input?.giftId);
  if (!gift) throw new HttpError(400, "That gift doesn’t exist.");
  const requestId = String(input?.requestId || "");
  if (!REQUEST_ID_RE.test(requestId)) throw new HttpError(400, "Invalid request.");
  const note = cleanNote(input?.note);

  const sender = await loadActor(db, user.uid);
  if (!sender) throw new HttpError(404, "Account not found.");

  const { ctx, actor: receiver } = await resolveReceiver(db, input?.context, input?.to);
  assertCanGift(sender, receiver);

  const quote = giftQuote(gift);
  const id = `${user.uid}_${requestId}`;
  const giftRef = db.collection(GIFTS).doc(id);
  const ledgerRef = db.collection(LEDGER).doc(id);
  const senderRef = db.collection("users").doc(user.uid);
  const receiverRef = db.collection("users").doc(receiver.uid);
  const inboxRef = receiverRef.collection("gifts_received").doc(id);
  const targetRef =
    ctx.type === "comment"
      ? commentsRef(db, ctx.postId).doc(ctx.commentId)
      : ctx.type === "post"
        ? postRef(db, ctx.postId)
        : null;

  const result = await db.runTransaction(async (tx) => {
    // All reads first.
    const [existing, senderSnap, targetSnap] = await Promise.all([
      tx.get(giftRef),
      tx.get(senderRef),
      targetRef ? tx.get(targetRef) : Promise.resolve(null),
    ]);

    // Same request sent twice (double tap, retry): answer with the first result
    // and do NOT charge again.
    if (existing.exists) {
      const d = existing.data();
      return { duplicate: true, balanceMills: cleanMills(d.balanceAfterMills), totalMills: d.totalMills };
    }
    if (!senderSnap.exists) throw new HttpError(404, "Account not found.");

    // TEST MODE: the wallet is unlimited and never charged (see INFINITE_WALLET).
    const balance = INFINITE_WALLET ? TEST_WALLET_MILLS : cleanMills(senderSnap.data().walletMills);
    if (!INFINITE_WALLET && balance < quote.total) {
      throw new HttpError(
        402,
        `Your wallet is short by ${formatMills(quote.total - balance)}.`,
        { balanceMills: balance, neededMills: quote.total }
      );
    }
    const charged = INFINITE_WALLET ? 0 : quote.total;
    const after = balance - charged;
    const now = FieldValue.serverTimestamp();
    const context = { type: ctx.type, postId: ctx.postId || null, commentId: ctx.commentId || null };

    tx.set(giftRef, {
      giftId: gift.id,
      giftName: gift.name,
      game: gift.game,
      category: gift.category,
      kind: gift.kind,
      priceMills: quote.price,
      flatFeeMills: quote.flat,
      percentFeeMills: quote.percent,
      feeMills: quote.fee,
      totalMills: quote.total,
      balanceAfterMills: after,
      ...(INFINITE_WALLET ? { testWallet: true } : {}),
      from: user.uid,
      fromUsername: sender.username,
      to: receiver.uid,
      toUsername: receiver.username,
      note,
      context,
      status: "sent",
      createdAt: now,
    });
    tx.set(ledgerRef, {
      uid: user.uid,
      type: "gift_send",
      amountMills: -charged,
      balanceAfterMills: after,
      ...(INFINITE_WALLET ? { testWallet: true } : {}),
      giftId: gift.id,
      to: receiver.uid,
      createdAt: now,
    });
    tx.update(
      senderRef,
      INFINITE_WALLET
        ? { giftsSent: FieldValue.increment(1) }
        : { walletMills: after, giftsSent: FieldValue.increment(1) }
    );
    tx.update(receiverRef, { giftsReceived: FieldValue.increment(1) });
    tx.set(inboxRef, {
      giftId: gift.id,
      name: gift.name,
      emoji: gift.emoji,
      game: gift.game,
      category: gift.category,
      priceMills: quote.price,
      from: user.uid,
      fromUsername: sender.username,
      note,
      context,
      createdAt: now,
    });
    if (targetRef && targetSnap?.exists) {
      tx.update(targetRef, { giftCount: FieldValue.increment(1) });
      // The gift shows up in that post's comments (under the comment it was
      // sent from, or in the post's own gift strip).
      tx.set(postRef(db, ctx.postId).collection("gifts").doc(id), {
        giftId: gift.id,
        name: gift.name,
        emoji: gift.emoji,
        game: gift.game,
        from: user.uid,
        fromUsername: sender.username,
        to: receiver.uid,
        toUsername: receiver.username,
        commentId: ctx.type === "comment" ? ctx.commentId : null,
        note,
        createdAt: now,
      });
    }
    return { duplicate: false, balanceMills: after, totalMills: quote.total };
  });

  return {
    ok: true,
    duplicate: result.duplicate,
    receiptId: id,
    gift: { id: gift.id, name: gift.name, emoji: gift.emoji, game: gift.game },
    quote,
    balanceMills: result.balanceMills,
    to: publicRecipient(receiver),
    context: ctx,
  };
}

// ------------------------------------------------------------ for profiles
// The newest gifts a member has received (for their profile page).
export async function listReceivedGifts(uid, limit = 12) {
  if (!uid) return [];
  try {
    const snap = await getAdminDb()
      .collection("users")
      .doc(uid)
      .collection("gifts_received")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      const cat = getGift(d.giftId);
      return {
        id: doc.id,
        giftId: d.giftId,
        name: cat?.name || d.name || "Gift",
        emoji: cat?.emoji || d.emoji || "🎁",
        game: getGame(cat?.game || d.game).id,
        fromUsername: d.fromUsername || "",
        note: d.note || "",
        timeAgo: timeAgo(d.createdAt?.toDate?.() ?? null),
      };
    });
  } catch {
    return [];
  }
}

// ------------------------------------------------------ for the comments
// Gifts sent from a post or from its comments, newest first, for the comments
// sheet. `blocked` (lower-case handles the viewer blocked) are left out, like
// their comments. Never throws: gifts are a bonus on top of the comments.
export async function listPostGifts(postId, blocked = new Set(), limit = 200) {
  try {
    const snap = await postRef(getAdminDb(), postId)
      .collection("gifts")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data();
        const cat = getGift(d.giftId);
        const created = d.createdAt?.toDate?.() ?? null;
        return {
          id: doc.id,
          giftId: d.giftId,
          name: cat?.name || d.name || "Gift",
          emoji: cat?.emoji || d.emoji || "🎁",
          game: getGame(cat?.game || d.game).id,
          from: d.fromUsername || "",
          to: d.toUsername || "",
          commentId: typeof d.commentId === "string" ? d.commentId : null,
          note: d.note || "",
          timeAgo: timeAgo(created),
        };
      })
      .filter((g) => g.from && !blocked.has(g.from.toLowerCase()));
  } catch {
    return [];
  }
}
