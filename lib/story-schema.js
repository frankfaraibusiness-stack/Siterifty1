// Shared by the story composer (browser) and the stories API (server).
export const STORY = {
  maxSeconds: 15, // video clips can be at most this long
  secondsTolerance: 0.35, // phone clips often report 15.02s; don't reject those
  minSeconds: 1, // the shortest cut the trimmer allows
  imageSeconds: 5, // how long a photo stays on screen
  hours: 24, // how long a story stays up
  maxVideoMB: 60,
  caption: 80,
  maxActivePerUser: 10,
  reply: 200, // characters in one reply
  repliesPerPerson: 5, // replies one person can leave on one story
  repliesPerStory: 200, // replies kept on one story
};

export const STORY_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// Who can watch a story. There is deliberately no "only me": a story is meant
// to be seen. A story with no `audience` (older ones) is public.
//   connections = friends + people who follow you
export const STORY_AUDIENCES = [
  { id: "public", label: "Public", hint: "Anyone on GTAFanbase can watch." },
  { id: "connections", label: "Friends & followers", hint: "Your friends and everyone who follows you." },
  { id: "friends", label: "Friends only", hint: "Only friends you have accepted." },
  { id: "followers", label: "Followers only", hint: "Only people who follow you." },
];
export const DEFAULT_STORY_AUDIENCE = "public";

// Missing -> public (older stories). Anything unrecognised -> the strictest
// choice, so a bad value can never expose a story.
export function cleanAudience(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_STORY_AUDIENCE;
  return STORY_AUDIENCES.some((a) => a.id === value) ? value : "friends";
}

export function audienceLabel(value) {
  return STORY_AUDIENCES.find((a) => a.id === cleanAudience(value))?.label || "Public";
}

// The one rule for "may this person watch this story?", used on the server
// everywhere a story is read. `isFriend`: an accepted friendship with the
// owner. `isFollower`: the viewer follows the owner.
export function canWatchStory({ audience, isOwner, isFriend, isFollower }) {
  if (isOwner) return true;
  switch (cleanAudience(audience)) {
    case "public":
      return true;
    case "connections":
      return !!(isFriend || isFollower);
    case "friends":
      return !!isFriend;
    case "followers":
      return !!isFollower;
    default:
      return false;
  }
}

// Replies are on unless the owner turned them off.
export function repliesAreOn(data) {
  return data?.repliesOn !== false;
}
