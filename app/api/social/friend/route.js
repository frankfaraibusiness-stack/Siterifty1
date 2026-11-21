import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import {
  FRIENDSHIPS,
  findUserByUsername,
  friendState,
  friendshipId,
  getSocialCounts,
  now,
} from "@/lib/social-data";
import { notify } from "@/lib/notif-pool-data";

const ACTIONS = new Set(["request", "cancel", "accept", "decline", "remove"]);

class Refusal extends Error {
  constructor(note, status = 400) {
    super(note);
    this.note = note;
    this.status = status;
  }
}

// POST { username, action } -> friend requests between the viewer and a member.
//   request   send one (or accept theirs, if they already asked you)
//   cancel    take back a request you sent
//   accept    accept a request they sent you
//   decline   turn down a request they sent you
//   remove    end an existing friendship
// Answers with the new state: "none" | "pending_out" | "pending_in" | "friends".
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Log in to add friends." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const action = body?.action;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const target = await findUserByUsername(db, body?.username);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.uid === user.uid) {
    return NextResponse.json({ error: "That's you." }, { status: 400 });
  }

  const ref = db.collection(FRIENDSHIPS).doc(friendshipId(user.uid, target.uid));
  try {
    // Set inside the transaction (and reset if it retries): what, if anything, to tell the other member.
    let tell = null;
    const friend = await db.runTransaction(async (tx) => {
      tell = null;
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;
      const state = friendState(data, user.uid);

      if (action === "request") {
        if (state === "friends") return "friends";
        if (state === "pending_out") return "pending_out";
        if (state === "pending_in") {
          // They already asked: asking back means yes.
          tx.update(ref, { status: "accepted", acceptedAt: now() });
          tell = "friend_ok";
          return "friends";
        }
        const blocked = target.prefs?.safety?.blocked;
        if (Array.isArray(blocked) && blocked.includes(user.username.toLowerCase())) {
          throw new Refusal("You can’t send this member a friend request.", 403);
        }
        tx.set(ref, {
          uids: [user.uid, target.uid],
          from: user.uid,
          to: target.uid,
          fromUsername: user.username,
          status: "pending",
          createdAt: now(),
        });
        tell = "friend";
        return "pending_out";
      }

      if (action === "cancel") {
        if (state === "pending_out") tx.delete(ref);
        return state === "pending_out" ? "none" : state;
      }
      if (action === "accept") {
        if (state === "pending_in") {
          tx.update(ref, { status: "accepted", acceptedAt: now() });
          tell = "friend_ok";
          return "friends";
        }
        return state;
      }
      if (action === "decline") {
        if (state === "pending_in") tx.delete(ref);
        return state === "pending_in" ? "none" : state;
      }
      // remove
      if (state === "friends") tx.delete(ref);
      return state === "friends" ? "none" : state;
    });

    // "sent you a friend request" / "accepted your friend request" in their Notifications chat.
    if (tell) await notify(db, target.uid, tell, { uid: user.uid, username: user.username });
    const counts = await getSocialCounts(target.uid);
    return NextResponse.json({ ok: true, friend, counts });
  } catch (err) {
    if (err instanceof Refusal) {
      return NextResponse.json({ error: err.note }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Couldn't update that right now." },
      { status: 500 }
    );
  }
}
