import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { sendMessage } from "@/lib/messages-data";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST { to: handle, type, text | sticker | invite | code | meetup | data,w,h,
//        replyTo?: messageId, clientId? }
// Enforces the recipient's "Who can message you" setting and blocks on the
// server, whatever the browser thinks.
export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    return ok(await sendMessage(user, body));
  } catch (err) {
    return fail(err);
  }
}
