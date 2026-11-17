import { NextResponse } from "next/server";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import {
  eventPhase,
  joinCheck,
  planApprove,
  planJoin,
  promote,
  serializeEvent,
} from "@/lib/event-rules";

export const runtime = "nodejs";

const ACTIONS = new Set(["join", "leave", "approve", "decline", "remove"]);
const HOST_ACTIONS = new Set(["approve", "decline", "remove"]);
const UID = /^[A-Za-z0-9_-]{1,128}$/;

class Refusal extends Error {
  constructor(code, note) {
    super(code);
    this.code = code;
    this.note = note;
  }
}

// POST { postId, action, plusOne?, targetUid? } -> the event as the viewer now
// sees it. One transaction per call, so spots can never be oversold.
//   join / leave          the signed-in viewer's own RSVP
//   approve / decline / remove   host only, on targetUid
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Sign in to join events." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { postId, action, plusOne, targetUid } = body || {};
  if (
    typeof postId !== "string" || !postId || postId.includes("/") ||
    !ACTIONS.has(action) ||
    (HOST_ACTIONS.has(action) && !UID.test(String(targetUid || "")))
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("posts").doc(postId);
  try {
    const event = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Refusal("NOT_FOUND");
      const data = snap.data();
      const ev = data.type === "event" ? data.event : null;
      if (!ev) throw new Refusal("NOT_FOUND");
      const isHost = data.uid === user.uid;
      if (data.settings?.visibility === "private" && !isHost) throw new Refusal("NOT_FOUND");
      if ((data.createdAt?.toMillis?.() ?? 0) > Date.now() && !isHost) throw new Refusal("NOT_FOUND");

      const startMs = ev.startsAt.toMillis();
      const endMs = ev.endsAt?.toMillis?.() ?? null;
      const ended = eventPhase(startMs, endMs) === "ended";

      const rsvps = { ...(ev.rsvps || {}) };
      const writes = []; // [uid, entry | null]

      if (action === "join") {
        if (ended) throw new Refusal("ENDED");
        const check = joinCheck(ev, data.uid, user.uid);
        if (!check.ok) throw new Refusal(isHost ? "HOST" : "BLOCKED", check.note);
        const plan = planJoin({ ev, rsvps, uid: user.uid, username: user.username, plusOne: !!plusOne });
        if (plan.error) throw new Refusal(plan.error);
        writes.push([user.uid, plan.entry]);
      } else if (action === "leave") {
        if (rsvps[user.uid]) writes.push([user.uid, null]);
      } else {
        if (!isHost) throw new Refusal("NOT_HOST");
        if (ended && action === "approve") throw new Refusal("ENDED");
        if (rsvps[targetUid]) {
          if (action === "approve") {
            const plan = planApprove({ ev, rsvps, targetUid });
            if (plan.error) throw new Refusal(plan.error);
            writes.push([targetUid, plan.entry]);
          } else {
            writes.push([targetUid, null]);
          }
        }
      }

      for (const [uid, entry] of writes) {
        if (entry) rsvps[uid] = entry;
        else delete rsvps[uid];
      }
      // A freed spot goes to the next person waiting.
      if (action === "leave" || action === "remove" || (action === "join" && writes[0]?.[1]?.p === 0)) {
        for (const [uid, entry] of promote(ev, rsvps)) {
          rsvps[uid] = entry;
          writes.push([uid, entry]);
        }
      }

      if (writes.length) {
        tx.update(
          ref,
          ...writes.flatMap(([uid, entry]) => [
            new FieldPath("event", "rsvps", uid),
            entry ?? FieldValue.delete(),
          ])
        );
      }
      return serializeEvent({ ...data, event: { ...ev, rsvps } }, { uid: user.uid, isOwner: isHost });
    });
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const map = {
      NOT_FOUND: ["That event is gone.", 404],
      ENDED: ["This event has ended.", 409],
      HOST: [err.note, 409],
      BLOCKED: [err.note, 403],
      NOT_HOST: ["Only the host can do that.", 403],
      FULL: ["This event is full.", 409],
      NO_ROOM: ["There’s no room left. Turn on the waitlist or raise the spots.", 409],
      NO_ROOM_PLUS_ONE: ["There isn’t room for a +1.", 409],
      ENTRIES: ["This event can’t take more RSVPs.", 409],
      GONE: ["That request is gone.", 404],
    };
    const [msg, status] = map[err.code] || ["Couldn’t update your RSVP.", 500];
    return NextResponse.json({ error: msg }, { status });
  }
}
