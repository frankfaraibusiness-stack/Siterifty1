// Everything the messaging system shares between the server (which validates
// and stores messages) and the browser (which renders the interface): the
// custom GTA emoji ids, stickers, session / code / meet-up options, limits,
// the "who can message me" choices and the permission rules.
//
// Plain data and pure functions only. The emoji *artwork* lives in
// components/messages/GtaEmoji.js and is keyed by the ids below.

// ---------------------------------------------------------------- limits
export const CHAT_LIMITS = {
  text: 2000,
  note: 100,
  code: 64,
  label: 30,
  place: 60,
  caption: 300,
  inviteCode: 24,
  imageBytes: 620_000, // base64 payload must fit in one Firestore document
  editMinutes: 15,
  listMax: 120,
  page: 40,
};

// ------------------------------------------------- who can message me
// users/{uid}.prefs.safety.whoCanMessage. The default means "people you are
// friends with, or who follow you" -- the same as "you can message the people
// you follow and your friends".
export const MESSAGE_AUDIENCES = [
  { id: "everyone", label: "Everyone", hint: "Anyone signed in can message you." },
  { id: "friendsfollowers", label: "Friends & followers", hint: "Your friends and people who follow you." },
  { id: "friends", label: "Friends only", hint: "Only people you’ve accepted as friends." },
  { id: "followers", label: "Followers only", hint: "Only people who follow you." },
  { id: "nobody", label: "No one", hint: "Nobody can start a chat with you. People you’ve already messaged can still reply." },
];
export const MESSAGE_AUDIENCE_IDS = MESSAGE_AUDIENCES.map((a) => a.id);
export const DEFAULT_AUDIENCE = "friendsfollowers";

// Pure permission check shared by the server (which enforces it) and the UI
// (which explains it). `replyRight` = the other person already wrote to the
// sender in this chat, so a reply is always fine.
export function messagingVerdict({ setting, isFriend, senderFollowsTarget, replyRight }) {
  if (replyRight) return { ok: true };
  switch (setting) {
    case "everyone":
      return { ok: true };
    case "friendsfollowers":
      return isFriend || senderFollowsTarget
        ? { ok: true }
        : { ok: false, code: "friendsfollowers", need: ["follow", "friend"] };
    case "friends":
      return isFriend ? { ok: true } : { ok: false, code: "friends", need: ["friend"] };
    case "followers":
      return senderFollowsTarget ? { ok: true } : { ok: false, code: "followers", need: ["follow"] };
    case "nobody":
      return { ok: false, code: "nobody", need: [] };
    default:
      return { ok: false, code: "nobody", need: [] };
  }
}

export function verdictReason(code, handle) {
  const h = `@${handle}`;
  switch (code) {
    case "friendsfollowers":
      return `${h} takes messages from friends and followers. Follow them or send a friend request first.`;
    case "friends":
      return `${h} only takes messages from friends. Send a friend request first.`;
    case "followers":
      return `${h} only takes messages from followers. Follow them first.`;
    case "nobody":
      return `${h} isn’t taking new messages right now.`;
    case "youBlocked":
      return `You blocked ${h}. Unblock them to chat.`;
    case "blockedBy":
      return `${h} isn’t accepting messages from you.`;
    case "self":
      return "That’s you.";
    default:
      return "You can’t message this person.";
  }
}

// ------------------------------------------------------- custom emoji
// Our own set, drawn as SVG (no system emoji). In a message they are stored as
// :shortcodes: and drawn by <GtaEmoji>. `k` = search keywords.
export const EMOJI_CATEGORIES = [
  { id: "faces", label: "Faces" },
  { id: "vibes", label: "Vibes" },
  { id: "heist", label: "Heist" },
  { id: "rides", label: "Rides" },
  { id: "leonida", label: "Leonida" },
];

export const EMOJI = [
  { id: "grin", c: "faces", n: "Grin", k: "happy smile haha" },
  { id: "lol", c: "faces", n: "Dying", k: "laugh lmao funny cry tears" },
  { id: "wink", c: "faces", n: "Wink", k: "flirt joke" },
  { id: "cool", c: "faces", n: "Cool", k: "shades sunglasses chill" },
  { id: "love", c: "faces", n: "Love", k: "heart eyes crush" },
  { id: "shock", c: "faces", n: "Shocked", k: "wow omg surprise no way" },
  { id: "think", c: "faces", n: "Thinking", k: "hmm confused wonder" },
  { id: "sleepy", c: "faces", n: "Sleepy", k: "tired zzz afk bored" },
  { id: "sad", c: "faces", n: "Sad", k: "cry upset down" },
  { id: "angry", c: "faces", n: "Mad", k: "rage furious" },

  { id: "fire", c: "vibes", n: "Fire", k: "hot lit flame" },
  { id: "heart", c: "vibes", n: "Heart", k: "love like" },
  { id: "hundred", c: "vibes", n: "100", k: "perfect facts real" },
  { id: "bolt", c: "vibes", n: "Bolt", k: "fast quick energy lightning" },
  { id: "star", c: "vibes", n: "Star", k: "wanted level favourite" },
  { id: "thumbs", c: "vibes", n: "Thumbs up", k: "ok yes good like agree" },
  { id: "eyes", c: "vibes", n: "Eyes", k: "look watching see" },
  { id: "gg", c: "vibes", n: "GG", k: "good game win" },
  { id: "six", c: "vibes", n: "Six", k: "gta6 hype leonida" },
  { id: "trophy", c: "vibes", n: "Trophy", k: "win champion first" },
  { id: "crown", c: "vibes", n: "Crown", k: "king queen boss" },
  { id: "diamond", c: "vibes", n: "Diamond", k: "gem rich rare" },

  { id: "skull", c: "heist", n: "Skull", k: "dead wasted dying lol" },
  { id: "mask", c: "heist", n: "Mask", k: "heist robber crew job" },
  { id: "siren", c: "heist", n: "Siren", k: "cops police wanted busted" },
  { id: "bag", c: "heist", n: "Loot", k: "money bag cash score" },
  { id: "cash", c: "heist", n: "Cash", k: "money dollars bills" },
  { id: "target", c: "heist", n: "Target", k: "aim mission objective" },

  { id: "car", c: "rides", n: "Car", k: "drive ride race supercar" },
  { id: "bike", c: "rides", n: "Bike", k: "motorcycle ride" },
  { id: "heli", c: "rides", n: "Chopper", k: "helicopter air" },
  { id: "boat", c: "rides", n: "Speedboat", k: "boat jetski water" },
  { id: "plane", c: "rides", n: "Plane", k: "fly jet air" },

  { id: "palm", c: "leonida", n: "Palm", k: "beach tree vice" },
  { id: "sunset", c: "leonida", n: "Sunset", k: "sun beach evening" },
  { id: "gator", c: "leonida", n: "Gator", k: "alligator grassrivers swamp" },
  { id: "flamingo", c: "leonida", n: "Flamingo", k: "pink bird vice" },
  { id: "pin", c: "leonida", n: "Pin", k: "place map location meet" },
  { id: "controller", c: "leonida", n: "Controller", k: "game play console" },
];
export const EMOJI_IDS = new Set(EMOJI.map((e) => e.id));
export const QUICK_REACTIONS = ["fire", "heart", "lol", "skull", "thumbs", "shock"];

export const SHORTCODE_RE = /:([a-z0-9]{2,12}):/g;

// ---------------------------------------------------------- stickers
// Big chunky word badges. Sent as their own message type.
export const STICKERS = [
  { id: "letsgo", t: "LET’S GO", a: "#ff3d7f", b: "#7b2ff7" },
  { id: "omw", t: "ON MY WAY", a: "#2de2c5", b: "#1b6fa8" },
  { id: "gg", t: "GG", a: "#cdfa4c", b: "#2de2c5" },
  { id: "backup", t: "BACKUP!", a: "#ff4d4d", b: "#ff9a3d" },
  { id: "heist", t: "HEIST TIME", a: "#7b2ff7", b: "#ff3d7f" },
  { id: "noway", t: "NO WAY", a: "#ffb347", b: "#ff3d7f" },
  { id: "wasted", t: "WASTED", a: "#3a3550", b: "#ff3d4f" },
  { id: "busted", t: "BUSTED", a: "#2a62e0", b: "#ff3d4f" },
  { id: "staylow", t: "STAY LOW", a: "#1b6fa8", b: "#2de2c5" },
  { id: "passed", t: "MISSION PASSED", a: "#9ee62c", b: "#2de2c5" },
  { id: "hype", t: "HYPE", a: "#ff9a3d", b: "#ff3d7f" },
  { id: "brb", t: "BRB", a: "#6a3de8", b: "#2a62e0" },
];
export const STICKER_IDS = new Set(STICKERS.map((s) => s.id));

// One-tap openers for the Quick tab.
export const QUICK_REPLIES = [
  "Online tonight? :controller:",
  "Join my lobby? :fire:",
  "Which platform you on?",
  "Send me the code :eyes:",
  "Add me, I’ll invite you :thumbs:",
  "Heist at 9? :mask:",
  "Meet at the beach? :palm:",
  "GG! :trophy:",
  "On my way :car:",
  "Give me 5 min :sleepy:",
  "Let’s run it back :bolt:",
  "Free roam? :sunset:",
];

// ----------------------------------------------- GTA message options
export const PLATFORMS = [
  { id: "ps5", label: "PS5" },
  { id: "xbox", label: "Xbox Series" },
  { id: "pc", label: "PC" },
];
export const GAME_MODES = [
  { id: "freeroam", label: "Free Roam" },
  { id: "heist", label: "Heist" },
  { id: "race", label: "Street Race" },
  { id: "deathmatch", label: "Deathmatch" },
  { id: "meet", label: "Car Meet" },
  { id: "cruise", label: "Cruise" },
  { id: "custom", label: "Custom" },
];
export const REGIONS = [
  { id: "vice", label: "Vice City" },
  { id: "keys", label: "Leonida Keys" },
  { id: "grass", label: "Grassrivers" },
  { id: "port", label: "Port Gellhorn" },
  { id: "ambrosia", label: "Ambrosia" },
  { id: "other", label: "Somewhere else" },
];
export const CODE_KINDS = [
  { id: "lobby", label: "Lobby code" },
  { id: "crew", label: "Crew code" },
  { id: "gamerid", label: "Gamer ID" },
  { id: "promo", label: "Promo code" },
  { id: "other", label: "Other" },
];
export const MESSAGE_TYPES = ["text", "sticker", "image", "invite", "code", "meetup"];

const ids = (list) => new Set(list.map((x) => x.id));
const PLATFORM_IDS = ids(PLATFORMS);
const MODE_IDS = ids(GAME_MODES);
const REGION_IDS = ids(REGIONS);
const KIND_IDS = ids(CODE_KINDS);

// ------------------------------------------------------- sanitizers
export function cleanLine(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanBlock(value, max) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, max);
}

const futureMs = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const now = Date.now();
  // Between "a minute ago" and one year ahead; anything else is dropped.
  return n > now - 60_000 && n < now + 366 * 86_400_000 ? Math.round(n) : null;
};

// Turns whatever the browser sent into a clean message body, or an error.
// Returns { ok: true, type, fields } where fields are merged into the doc.
export function sanitizeMessage(input) {
  const body = input && typeof input === "object" ? input : {};
  const type = MESSAGE_TYPES.includes(body.type) ? body.type : "text";

  if (type === "text") {
    const text = cleanBlock(body.text, CHAT_LIMITS.text);
    if (!text) return { ok: false, error: "Write something first." };
    return { ok: true, type, fields: { text } };
  }

  if (type === "sticker") {
    if (!STICKER_IDS.has(body.sticker)) return { ok: false, error: "Unknown sticker." };
    return { ok: true, type, fields: { sticker: body.sticker } };
  }

  if (type === "image") {
    const caption = cleanBlock(body.text, CHAT_LIMITS.caption);
    const w = Math.round(Number(body.w));
    const h = Math.round(Number(body.h));
    const data = String(body.data || "");
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!m) return { ok: false, error: "That photo couldn’t be read." };
    if (m[1].length > CHAT_LIMITS.imageBytes) return { ok: false, error: "That photo is too big." };
    if (!(w > 0 && w <= 4000 && h > 0 && h <= 4000)) return { ok: false, error: "That photo couldn’t be read." };
    return { ok: true, type, fields: { text: caption, media: { w, h } }, image: m[1] };
  }

  if (type === "invite") {
    const i = body.invite && typeof body.invite === "object" ? body.invite : {};
    const code = cleanLine(i.code, CHAT_LIMITS.inviteCode);
    const slots = i.slots === "open" ? "open" : Math.min(16, Math.max(2, Math.round(Number(i.slots)) || 4));
    return {
      ok: true,
      type,
      fields: {
        invite: {
          platform: PLATFORM_IDS.has(i.platform) ? i.platform : "ps5",
          mode: MODE_IDS.has(i.mode) ? i.mode : "freeroam",
          code,
          slots,
          note: cleanLine(i.note, CHAT_LIMITS.note),
          startsAt: futureMs(i.startsAt),
        },
      },
    };
  }

  if (type === "code") {
    const c = body.code && typeof body.code === "object" ? body.code : {};
    const code = cleanLine(c.code, CHAT_LIMITS.code);
    if (!code) return { ok: false, error: "Add the code you want to share." };
    return {
      ok: true,
      type,
      fields: {
        code: {
          kind: KIND_IDS.has(c.kind) ? c.kind : "lobby",
          label: cleanLine(c.label, CHAT_LIMITS.label),
          code,
          hidden: c.hidden === true,
        },
      },
    };
  }

  // meetup
  const p = body.meetup && typeof body.meetup === "object" ? body.meetup : {};
  const place = cleanLine(p.place, CHAT_LIMITS.place);
  if (!place) return { ok: false, error: "Where are you meeting?" };
  return {
    ok: true,
    type: "meetup",
    fields: {
      meetup: {
        region: REGION_IDS.has(p.region) ? p.region : "vice",
        place,
        note: cleanLine(p.note, CHAT_LIMITS.note),
        startsAt: futureMs(p.startsAt),
      },
    },
  };
}

// One-line description used for chat-list previews and reply quotes.
export function snippetFor(type, fields) {
  const clip = (s, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  switch (type) {
    case "text":
      return clip(String(fields.text || "").replace(/\s+/g, " "));
    case "sticker":
      return STICKERS.find((s) => s.id === fields.sticker)?.t || "Sticker";
    case "image":
      return fields.text ? `Photo · ${clip(fields.text, 60)}` : "Photo";
    case "invite":
      return `Session invite · ${GAME_MODES.find((m) => m.id === fields.invite?.mode)?.label || "Game"}`;
    case "code":
      return `${CODE_KINDS.find((k) => k.id === fields.code?.kind)?.label || "Code"} shared`;
    case "meetup":
      return `Meet-up · ${fields.meetup?.place || "pin"}`;
    default:
      return "Message";
  }
}

export const labelOf = (list, id) => list.find((x) => x.id === id)?.label || "";
