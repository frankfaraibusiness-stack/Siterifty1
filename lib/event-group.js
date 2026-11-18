// The group chat every event gets automatically (stored at eventGroups/{postId}).
// Pure rules only (no Firestore, no React), so the API, the event card and the
// composer all agree on who may see, join and write.
//
//   eventGroups/{postId}  { postId, hostUid, host, title, createdMs, rev,
//                           members:{ [uid]:{ u, r:"admin"|"member", t, l } },
//                           banned:{ [uid]:true },
//                           deleted?:true, deletedMs? }   <- the host deleted the chat
//   eventGroups/{postId}/messages/{id}  { uid, user, text, createdAt, deleted }
//
// The rules:
//   - The host is the admin from the moment the event is published.
//   - The group has as many places for guests as the event has spots (the host
//     doesn't use one). No spot limit on the event = no limit on the group.
//   - FREE event: anyone who can join the event can join the group while it
//     isn't full. Members can write; everyone else can read but not write.
//   - PAID event: locked behind the ticket. Without a ticket (an RSVP that is
//     "going") you can't read it or join it. A ticket that is given back also
//     leaves the group.
//   - If the host approves RSVPs, the group opens once they have approved you.
//   - The host can delete the group (messages are wiped, nobody can join or
//     write) and start a fresh one later. Ending the event does not touch the
//     group: people can keep chatting after it's over.

import { joinCheck } from "@/lib/event-rules";

export const GROUP_LIMITS = {
  text: 500, // characters per message
  page: 40, // messages sent to the browser at a time
  members: 2500, // keeps the group doc well under Firestore's 1 MiB cap
  cooldownMs: 1200, // between two messages from the same person
};

// How many guests the group has room for.
export function groupSlots(ev) {
  const cap = Number(ev?.capacity);
  return Number.isInteger(cap) && cap > 0 ? Math.min(cap, GROUP_LIMITS.members) : GROUP_LIMITS.members;
}

// The group doc a brand new event starts with: just the host, as admin.
export function newGroupDoc({ postId, hostUid, hostName, title, createdMs = Date.now() }) {
  return {
    postId,
    hostUid,
    host: hostName,
    title: String(title || "").slice(0, 120),
    createdMs,
    rev: 0,
    members: { [hostUid]: { u: hostName, r: "admin", t: createdMs, l: 0 } },
    banned: {},
  };
}

// What this viewer may do. `ev` is the stored event, `member` the viewer's
// entry in group.members (or null), `guests` how many non-admin members there
// are, `going` whether the viewer holds a spot / ticket on the event.
export function groupAccess({ ev, hostUid, uid, member, banned = false, guests = 0, going = false, gone = false }) {
  const price = Number(ev?.priceUsd) > 0 ? Number(ev.priceUsd) : null;
  const paid = price !== null;
  const isAdmin = !!uid && uid === hostUid;
  const isMember = isAdmin || !!member;
  const full = guests >= groupSlots(ev);
  const locked = paid && !isMember && !going;

  let canJoin = false;
  let note = "";
  if (gone) {
    note = "The host deleted this group.";
  } else if (isMember) {
    // already in
  } else if (!uid) {
    note = "Sign in to join the group.";
  } else if (banned) {
    note = "The host removed you from this group.";
  } else if (locked) {
    note = "Get a ticket to unlock the group.";
  } else if (paid) {
    canJoin = true; // a ticket holder
  } else if (ev?.approval) {
    if (going) canJoin = true;
    else note = "The host approves who joins, so the group opens once you’re in.";
  } else {
    const check = joinCheck(ev || {}, hostUid, uid);
    if (check.ok) canJoin = true;
    else note = check.note;
  }
  if (canJoin && full && !gone) {
    canJoin = false;
    note = "The group is full.";
  }

  return {
    paid,
    priceUsd: price,
    slots: ev?.capacity ?? null,
    isAdmin,
    isMember,
    gone,
    locked: locked && !gone,
    full,
    canJoin: canJoin && !gone,
    note,
    canWrite: isMember && !gone,
    readOnly: !isMember && !locked && !gone,
  };
}
