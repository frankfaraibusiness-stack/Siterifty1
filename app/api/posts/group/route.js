import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  GroupError,
  deleteGroup,
  deleteGroupMessage,
  endEvent,
  joinGroup,
  leaveGroup,
  readGroup,
  removeGroupMember,
  sendGroupMessage,
  startNewGroup,
} from "@/lib/event-group-data";

export const runtime = "nodejs";

const POST_ID = /^[A-Za-z0-9]{1,64}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ACTIONS = new Set(["join", "leave", "send", "delete", "remove", "endEvent", "deleteGroup", "newGroup"]);

function fail(err) {
  if (err instanceof GroupError) return NextResponse.json({ error: err.message }, { status: err.status });
  return NextResponse.json({ error: "Something went wrong with the group. Try again." }, { status: 500 });
}

// GET ?postId= -> the event's group chat as this viewer sees it (signed-out
// visitors can read a free event's group but not write).
export async function GET(request) {
  const postId = new URL(request.url).searchParams.get("postId") || "";
  if (!POST_ID.test(postId)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const user = await getCurrentUser();
  try {
    return NextResponse.json({ ok: true, ...(await readGroup(user?.uid || null, postId)) });
  } catch (err) {
    return fail(err);
  }
}

// POST { postId, action, text?, messageId?, targetUid? } -> the fresh group.
//   join / leave / send   the signed-in member
//   delete                the message's author, or the admin
//   remove                admin only, on targetUid
//   endEvent              host only: the event is over, right now
//   deleteGroup           host only: wipes the chat and closes the group
//   newGroup              host only: opens a fresh group after deleting
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return NextResponse.json({ error: "Sign in to use the group." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { postId, action, text, messageId, targetUid } = body || {};
  if (
    !POST_ID.test(String(postId || "")) ||
    !ACTIONS.has(action) ||
    (action === "delete" && !/^[A-Za-z0-9]{1,64}$/.test(String(messageId || ""))) ||
    (action === "remove" && !UID.test(String(targetUid || "")))
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (action === "join") await joinGroup(user, postId);
    else if (action === "leave") await leaveGroup(user, postId);
    else if (action === "send") await sendGroupMessage(user, postId, text);
    else if (action === "delete") await deleteGroupMessage(user, postId, messageId);
    else if (action === "endEvent") await endEvent(user, postId);
    else if (action === "deleteGroup") await deleteGroup(user, postId);
    else if (action === "newGroup") await startNewGroup(user, postId);
    else await removeGroupMember(user, postId, targetUid);
    return NextResponse.json({ ok: true, ...(await readGroup(user.uid, postId)) });
  } catch (err) {
    return fail(err);
  }
}
