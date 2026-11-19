import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { HttpError } from "@/lib/chat-social";
import {
  checkIn, closeRoom, createRoom, deleteMessage, getLive, getMessages, leaveLobby, postCrew, removeCrew, sendMessage, waveCrew,
} from "@/lib/lobby-data";
import { isRoomId } from "@/lib/lobby-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roomOf = (v) => {
  if (!isRoomId(v)) throw new HttpError(400, "Unknown room.");
  return v;
};

// GET /api/lobby                       the live lobby (people, rooms, crew board), read-only
// GET /api/lobby?room=ID[&since=MS]    a room's chat: the latest page, or only what's newer than `since`
export async function GET(request) {
  try {
    const user = await requireUser();
    const sp = new URL(request.url).searchParams;
    const room = sp.get("room");
    if (room) return ok(await getMessages(user, roomOf(room), { since: Math.max(0, Number(sp.get("since")) || 0) }));
    return ok(await getLive(user));
  } catch (err) {
    return fail(err);
  }
}

// POST /api/lobby { action, ... }
//   ping          { status?, roomId? }  check in (every ~15s); `roomId: null` leaves the room
//   leave         {}                    closing the tab: drop off the list now
//   send          { roomId, text }
//   delete        { roomId, id }
//   create-room   { title, topic, max }
//   close-room    { roomId }
//   crew-post     { platform, style, region, size, note }
//   crew-remove   {}
//   crew-wave     { id }
export async function POST(request) {
  try {
    const user = await requireUser();
    const b = await readJson(request);
    switch (String(b.action || "")) {
      case "ping":
        return ok(await checkIn(user, { status: b.status, roomId: b.roomId === null ? null : b.roomId ? roomOf(b.roomId) : undefined }));
      case "leave":
        return ok(await leaveLobby(user));
      case "send":
        return ok(await sendMessage(user, roomOf(b.roomId), b.text));
      case "delete":
        return ok(await deleteMessage(user, roomOf(b.roomId), b.id));
      case "create-room":
        return ok(await createRoom(user, b));
      case "close-room":
        return ok(await closeRoom(user, roomOf(b.roomId)));
      case "crew-post":
        return ok(await postCrew(user, b));
      case "crew-remove":
        return ok(await removeCrew(user));
      case "crew-wave":
        return ok(await waveCrew(user, b.id));
      default:
        throw new HttpError(400, "Unknown action.");
    }
  } catch (err) {
    return fail(err);
  }
}
