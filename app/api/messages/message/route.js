import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { messageAction } from "@/lib/messages-data";

export const runtime = "nodejs";

// POST { convId, id, action: "react" | "edit" | "delete", emoji?, text?, scope?: "me" | "all" }
export async function POST(request) {
  try {
    const user = await requireUser();
    return ok(await messageAction(user, await readJson(request)));
  } catch (err) {
    return fail(err);
  }
}
