import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { setTyping } from "@/lib/messages-data";

export const runtime = "nodejs";

// POST { convId } -> "I'm typing" (valid for a few seconds).
export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    await setTyping(user, String(body.convId || ""));
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
