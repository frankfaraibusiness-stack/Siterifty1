// Story defaults (Settings > Stories): what the Story Maker starts with.
// Pure helpers. { audience: "public" | "connections" | "friends" | "followers", replies: boolean }
import { DEFAULT_STORY_AUDIENCE, cleanAudience } from "./story-schema.js";

export const DEFAULT_STORIES = Object.freeze({ audience: DEFAULT_STORY_AUDIENCE, replies: true });

// A missing audience is the default; an unrecognised one becomes the strictest
// choice (same rule as cleanAudience), so a bad value never exposes a story.
export function sanitizeStories(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    audience: cleanAudience(r.audience),
    replies: typeof r.replies === "boolean" ? r.replies : DEFAULT_STORIES.replies,
  };
}
