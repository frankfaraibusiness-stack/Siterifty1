import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { conversationAction } from "@/lib/messages-data";

export const runtime = "nodejs";

// POST { convId, action: "pin" | "unpin" | "mute" | "unmute" | "delete" }
export async function POST(request) {
  try {
    const user = await requireUser();
    return ok(await conversationAction(user, await readJson(request)));
  } catch (err) {
    return fail(err);
  }
}
