// Everything the Lobby shares between the server (which validates and stores
// it) and the browser (which renders it): statuses, the official rooms, session
// topics, crew-finder options, limits and the plan rules.
//
// Plain data and pure functions only, so it is safe to import anywhere and is
// covered by tests/lobby.test.mjs.
// ---------------------------------------------------------------- timing
export const PRESENCE_MS = 45_000; // "in the lobby" = checked in within this long
export const PING_MS = 15_000; // how often the open lobby checks in
export const CHAT_POLL_MS = 3_000; // how often an open room asks for new messages
export const ROOM_IDLE_MS = 6 * 3_600_000; // a member session with no chat for this long disappears
export const CREW_TTL_MS = 48 * 3_600_000; // a crew-finder post lasts two days
export const MESSAGE_KEEP_MS = 48 * 3_600_000; // room chat older than this is purged
export const SEND_GAP_MS = 1_200; // minimum gap between two messages from one member

// ---------------------------------------------------------------- limits
export const LOBBY_LIMITS = {
  title: 50,
  desc: 120,
  text: 400,
  note: 200,
  page: 50,
  since: 60,
  wavers: 20,
};

// ---------------------------------------------------------------- statuses
// What you are up to right now, shown next to your name in "Who's here".
export const STATUSES = [
  { id: "cruising", label: "Cruising", hint: "Just hanging out" },
  { id: "crew", label: "Looking for crew", hint: "Open to squad invites" },
  { id: "trailers", label: "Watching trailers", hint: "Frame by frame" },
  { id: "theories", label: "Theorycrafting", hint: "Deep in the lore" },
  { id: "laying-low", label: "Laying low", hint: "Here, but quiet" },
];
export const STATUS_IDS = STATUSES.map((s) => s.id);
export const DEFAULT_STATUS = "cruising";
export const statusLabel = (id) => (STATUSES.find((s) => s.id === id) || STATUSES[0]).label;

// ---------------------------------------------------------------- rooms
// Official rooms always exist. Their ids are stored with this prefix so they
// can never collide with a member-created session id.
export const OFFICIAL_PREFIX = "official-";
export const OFFICIAL_ROOMS = [
  { id: "main", title: "Main Lobby", desc: "Everyone starts here. Say hi, ask anything.", tone: "cyan" },
  { id: "trailers", title: "Trailer Watch", desc: "Frames, details and “did you see that?” moments.", tone: "pink" },
  { id: "theories", title: "Theory Room", desc: "Leaks, lore and wild predictions. Keep it fun.", tone: "violet" },
  { id: "newcomers", title: "Fresh Off the Bus", desc: "New here? Ask the locals, no question is too small.", tone: "lime" },
  { id: "garage", title: "Garage Talk", desc: "Cars, bikes, boats and everything with an engine.", tone: "orange" },
  { id: "boardwalk", title: "The Boardwalk", desc: "Off-topic. Games, music, life, whatever.", tone: "gold" },
];

export const officialRoomId = (id) => `${OFFICIAL_PREFIX}${id}`;
export const isOfficialRoomId = (roomId) =>
  typeof roomId === "string" && roomId.startsWith(OFFICIAL_PREFIX) && OFFICIAL_ROOMS.some((r) => officialRoomId(r.id) === roomId);
export const getOfficialRoom = (roomId) => OFFICIAL_ROOMS.find((r) => officialRoomId(r.id) === roomId) || null;

// Firestore auto-ids are 20 letters/digits; this keeps junk out of document paths.
export const isRoomId = (roomId) => isOfficialRoomId(roomId) || (typeof roomId === "string" && /^[A-Za-z0-9]{16,24}$/.test(roomId));

export const ROOM_TOPICS = ["Chill hangout", "Trailer watch", "Theories", "Heist planning", "Racing & cars", "Roleplay", "Trading tips", "Newcomers"];

// Sessions members can start. Higher plans can run more of them, and bigger.
export const SESSION_RULES = {
  drifter: { active: 1, max: 10 },
  wheelman: { active: 2, max: 20 },
  mastermind: { active: 3, max: 35 },
  kingpin: { active: 5, max: 50 },
  creatorplus: { active: 5, max: 50 },
};
export function sessionRules(planId) {
  return SESSION_RULES[planId] || SESSION_RULES.drifter;
}
// The sizes offered in the "start a session" sheet for a plan.
export function sessionSizes(planId) {
  const top = sessionRules(planId).max;
  return [5, 10, 20, 35, 50].filter((n) => n <= top);
}
// Which plan unlocks a bigger session (for the upsell line), or null at the top.
// Plans that don't add more sessions or a bigger size (Creator Plus matches Kingpin) are skipped.
const PLAN_ORDER = ["drifter", "wheelman", "mastermind", "kingpin", "creatorplus"];
export function nextSessionPlan(planId) {
  const at = Math.max(0, PLAN_ORDER.indexOf(planId));
  const mine = sessionRules(planId);
  return (
    PLAN_ORDER.slice(at + 1).find((id) => {
      const r = sessionRules(id);
      return r.active > mine.active || r.max > mine.max;
    }) || null
  );
}

// ---------------------------------------------------------------- crew finder
export const PLATFORMS = ["PlayStation 5", "Xbox Series X|S", "PC (when it lands)", "Any / undecided"];
export const PLAYSTYLES = ["Story & exploring", "Heists & money", "Racing & cars", "Roleplay", "Chill hangs", "Competitive"];
export const REGIONS = ["Americas", "Europe", "Asia", "Oceania", "Africa", "Anywhere"];
export const CREW_SIZES = [2, 3, 4, 5, 6, 8];

// ---------------------------------------------------------------- cleaning
// One line of chat: control characters gone, whitespace collapsed, angle
// brackets removed, trimmed and cut to length. Returns "" for nothing usable.
export function cleanText(raw, max = LOBBY_LIMITS.text) {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export const oneOf = (v, list, fallback = null) => (list.includes(v) ? v : fallback);

// ---------------------------------------------------------------- presence
export const isPresent = (activeAt, now = Date.now()) => typeof activeAt === "number" && now - activeAt < PRESENCE_MS;

// True when either member has blocked the other: they never see each other in
// the lobby, in room chat or on the crew board.
export function blockedEitherWay(viewer, other) {
  const mine = viewer?.blocked || [];
  const theirs = other?.blocked || [];
  const a = String(viewer?.username || "").toLowerCase();
  const b = String(other?.username || "").toLowerCase();
  return (!!b && mine.includes(b)) || (!!a && theirs.includes(a));
}

// "in 2h 10m", "in 3d", "now" -- for the Starting soon strip.
export function untilLabel(startMs, now = Date.now()) {
  const diff = startMs - now;
  if (diff <= 0) return "now";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `in ${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}
