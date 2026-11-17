// Shared by the browser (wizard, manage panel) and the server (API, pages),
// so the rules people see are exactly the rules the server enforces.
// Everything here is GTA 6 only. There is no "general" category on purpose.

export const CATEGORIES = [
  { id: "trailers", label: "Trailers & teasers", blurb: "Frame-by-frame breakdowns, release-date hunting and trailer reactions.", a: "#ff3d7f", b: "#7b2ff7", icon: "film" },
  { id: "characters", label: "Lucia, Jason & the cast", blurb: "Story, relationships and everyone we’ve met in Leonida so far.", a: "#ff6ec7", b: "#ff9a3d", icon: "crown" },
  { id: "map", label: "Map & locations", blurb: "Vice City, the Keys, Grassrivers and every pin we can place on the map.", a: "#2de2c5", b: "#1b6fa8", icon: "pin" },
  { id: "theories", label: "Theories & easter eggs", blurb: "Evidence boards, hidden details and wild guesses with receipts.", a: "#b07bff", b: "#ff3d7f", icon: "eye" },
  { id: "leaks", label: "Leaks & rumours", blurb: "Sorting what’s credible from what’s noise, with a cool head.", a: "#ff9a3d", b: "#ff3d7f", icon: "flame" },
  { id: "news", label: "Release & news watch", blurb: "Rockstar announcements, dates, pre-orders and platform news.", a: "#cdfa4c", b: "#2de2c5", icon: "bolt" },
  { id: "art", label: "Fan art & edits", blurb: "Illustrations, wallpapers, edits and cosplay of the world of GTA 6.", a: "#ff3d7f", b: "#ff9a3d", icon: "star" },
  { id: "photo", label: "Screenshots & photo mode", blurb: "Best frames from the trailers, plus a home for photo mode on day one.", a: "#4cc9f0", b: "#7b2ff7", icon: "camera" },
  { id: "cars", label: "Cars & vehicles", blurb: "Every ride spotted in the trailers, wishlists and handling talk.", a: "#ff9a3d", b: "#cdfa4c", icon: "car" },
  { id: "music", label: "Soundtrack & radio", blurb: "Trailer tracks, radio station wishlists and playlists for Leonida.", a: "#7b2ff7", b: "#2de2c5", icon: "music" },
  { id: "crews", label: "Crews & roleplay", blurb: "Find a crew for GTA 6 Online and plan your character’s story.", a: "#9ee62c", b: "#1b6fa8", icon: "skull" },
  { id: "wishlist", label: "Wishlist & predictions", blurb: "Features, mechanics and bold predictions for launch day and beyond.", a: "#2de2c5", b: "#cdfa4c", icon: "palm" },
  { id: "memes", label: "Memes & humour", blurb: "Waiting-for-the-trailer energy. Keep it about GTA 6.", a: "#ff3d7f", b: "#cdfa4c", icon: "bolt" },
];
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) || null;

// Colour themes (banner + accent). `id` is stored on the community.
export const COMMUNITY_THEMES = [
  { id: "vice", label: "Vice", a: "#ff3d7f", b: "#7b2ff7" },
  { id: "neon", label: "Neon", a: "#2de2c5", b: "#1b6fa8" },
  { id: "sunset", label: "Sunset", a: "#ff9a3d", b: "#ff3d7f" },
  { id: "lime", label: "Lime", a: "#cdfa4c", b: "#2de2c5" },
  { id: "night", label: "Night", a: "#7b2ff7", b: "#1b6fa8" },
  { id: "flamingo", label: "Flamingo", a: "#ff6ec7", b: "#ff9a3d" },
  { id: "gator", label: "Gator", a: "#9ee62c", b: "#1b6fa8" },
  { id: "port", label: "Port", a: "#4cc9f0", b: "#7b2ff7" },
];
export const getCommunityTheme = (id) => COMMUNITY_THEMES.find((t) => t.id === id) || COMMUNITY_THEMES[0];

export const SCENES = [
  { id: "sunset", label: "Strip sunset" },
  { id: "neon", label: "Neon grid" },
  { id: "lagoon", label: "Keys lagoon" },
  { id: "hills", label: "Grassrivers dusk" },
];
export const ICON_IDS = ["car", "pin", "camera", "bolt", "palm", "music", "star", "crown", "film", "flame", "eye", "skull"];

export const FLAIRS = [
  { id: "discussion", label: "Discussion" },
  { id: "official", label: "Official" },
  { id: "leak", label: "Leak" },
  { id: "theory", label: "Theory" },
  { id: "art", label: "Fan art" },
  { id: "question", label: "Question" },
  { id: "meme", label: "Meme" },
];

export const LIMITS = {
  name: 40,
  slugMin: 3,
  slug: 30,
  tagline: 90,
  description: 700,
  tags: 5,
  questions: 5,
  question: 120,
  answer: 400,
  rules: 7,
  ruleTitle: 60,
  ruleBody: 220,
  post: 800,
  postImages: 2,
  owned: 5,
  joined: 60,
  reason: 300,
};

export const FIXED_RULE = {
  title: "Keep it GTA 6",
  body: "Everything here is about Grand Theft Auto VI and its world. Off-topic posts get removed.",
};

export const RULE_PRESETS = [
  { title: "No spoiler dumps without a cover", body: "Mark leaks and story details with the Leak flair so people can choose to look." },
  { title: "Credit your sources", body: "Link or name where a claim, clip or artwork came from." },
  { title: "No fake leaks", body: "Posting made-up leaks as real gets you removed. Label speculation as a theory." },
  { title: "Be good to each other", body: "Disagree with the take, not the person. No harassment, no slurs." },
  { title: "No self-promo spam", body: "Share your own work sparingly and never repeat the same post." },
  { title: "Stay SFW", body: "No sexual or graphic gore content. Fan art included." },
];

export const QUESTION_PRESETS = [
  "How long have you been following GTA 6 news?",
  "Which GTA 6 character or location are you most hyped for?",
  "What would you like to share or discuss in this community?",
  "Where did you hear about us?",
  "Do you agree to keep everything about GTA 6?",
];

export const DEFAULT_PERMISSIONS = {
  whoCanPost: "everyone", // everyone | mods | admins   ("lock chat")
  links: "everyone", // everyone | staff | off
  images: "everyone", // everyone | staff | off
  leakPolicy: "labelled", // open | labelled | banned
  slowMode: 0, // seconds between posts for regular members
  newMemberWait: 0, // hours a new member waits before posting
  modsCanApprove: true,
  showMembers: true,
};

export const PERMISSION_CHOICES = {
  whoCanPost: ["everyone", "mods", "admins"],
  links: ["everyone", "staff", "off"],
  images: ["everyone", "staff", "off"],
  leakPolicy: ["open", "labelled", "banned"],
  slowMode: [0, 10, 30, 60, 300],
  newMemberWait: [0, 1, 24, 72],
};

export const ROLES = ["owner", "admin", "mod", "member"];
export const roleRank = (r) => ({ owner: 4, admin: 3, mod: 2, member: 1 }[r] || 0);
export const isStaff = (r) => roleRank(r) >= 2;
export const ROLE_LABEL = { owner: "Owner", admin: "Admin", mod: "Moderator", member: "Member" };

const RESERVED = new Set(["new", "manage", "admin", "api", "edit", "settings", "search", "explore", "gta6", "rockstar"]);

export function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}

export function cleanText(v, max) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
export function cleanMultiline(v, max) {
  return String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}
export function normalizeTag(v) {
  return String(v ?? "").replace(/^#+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 24);
}

export const URL_RE = /(?:https?:\/\/|www\.)[^\s<]+|\b[a-z0-9-]+\.(?:com|net|org|io|gg|tv|me|co|ly|app|xyz|link)\b[^\s<]*/gi;
export const hasLink = (text) => new RegExp(URL_RE.source, "i").test(text || "");

// A deliberately small guard rail so "GTA 6 only" is more than a promise.
// It catches the obvious (other games, dating) — moderators handle the rest.
const OFF_TOPIC = /\b(dating|hook\s?-?ups?|singles|onlyfans|nsfw|fortnite|minecraft|roblox|valorant|warzone|call of duty|fifa|apex legends|league of legends|genshin|pokemon|crypto|forex|betting)\b/i;
export function offTopicReason(...texts) {
  const m = OFF_TOPIC.exec(texts.filter(Boolean).join(" "));
  return m ? `“${m[0]}” isn’t what this place is for. Communities here are only about GTA 6.` : null;
}

export function normalizePermissions(p = {}) {
  const out = { ...DEFAULT_PERMISSIONS };
  for (const key of Object.keys(PERMISSION_CHOICES)) {
    if (PERMISSION_CHOICES[key].includes(p[key])) out[key] = p[key];
  }
  out.modsCanApprove = p.modsCanApprove !== false;
  out.showMembers = p.showMembers !== false;
  return out;
}

export function normalizeQuestions(list) {
  return (Array.isArray(list) ? list : [])
    .map((q, i) => ({ id: `q${i + 1}`, text: cleanText(q?.text, LIMITS.question), required: q?.required !== false }))
    .filter((q) => q.text)
    .slice(0, LIMITS.questions);
}
export function normalizeRules(list) {
  return (Array.isArray(list) ? list : [])
    .map((r) => ({ title: cleanText(r?.title, LIMITS.ruleTitle), body: cleanText(r?.body, LIMITS.ruleBody) }))
    .filter((r) => r.title)
    .slice(0, LIMITS.rules);
}

// Returns { field: message }. Empty object = valid. `sections` limits what is
// checked so the manage panel can validate one tab at a time.
export function validateCommunity(d, sections = ["focus", "identity", "look", "access", "rules", "permissions"]) {
  const e = {};
  const has = (s) => sections.includes(s);
  const tagList = Array.isArray(d.tags) ? d.tags : [];
  if (has("focus")) {
    if (!getCategory(d.category)) e.category = "Pick the part of GTA 6 your community is about.";
    if (tagList.length > LIMITS.tags) e.tags = `Up to ${LIMITS.tags} tags.`;
  }
  if (has("identity")) {
    const name = cleanText(d.name, LIMITS.name);
    if (name.length < 3) e.name = "Give it a name with at least 3 characters.";
    const tagline = cleanText(d.tagline, LIMITS.tagline);
    if (tagline.length < 8) e.tagline = "Add a short line that says what it’s about (8+ characters).";
    const desc = cleanMultiline(d.description, LIMITS.description);
    if (desc.length < 30) e.description = "Tell people what to expect, at least a couple of sentences.";
    const off = offTopicReason(name, tagline, desc, tagList.join(" "));
    if (off && !e.name) e.name = off;
    if (d.slug !== undefined) {
      const slug = String(d.slug || "");
      if (slug.length < LIMITS.slugMin) e.slug = `The handle needs at least ${LIMITS.slugMin} characters.`;
      else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) e.slug = "Use lowercase letters, numbers and single hyphens.";
      else if (RESERVED.has(slug)) e.slug = "That handle is reserved. Try another.";
    }
  }
  if (has("look")) {
    if (!COMMUNITY_THEMES.some((t) => t.id === d.theme)) e.theme = "Pick a colour theme.";
    if (!SCENES.some((s) => s.id === d.scene)) e.scene = "Pick a banner scene.";
    if (!ICON_IDS.includes(d.icon)) e.icon = "Pick an icon.";
  }
  if (has("access")) {
    if (!["public", "private"].includes(d.privacy)) e.privacy = "Choose who can join.";
    if (d.privacy === "private") {
      const qs = normalizeQuestions(d.questions);
      if (qs.length === 0) e.questions = "Private communities need at least one question for applicants.";
    }
  }
  if (has("rules")) {
    for (const r of Array.isArray(d.rules) ? d.rules : []) {
      if (cleanText(r?.title, 1) === "" && cleanText(r?.body, 1) !== "") {
        e.rules = "Every rule needs a title.";
        break;
      }
    }
  }
  return e;
}

export function emptyCommunityDraft() {
  return {
    category: "",
    tags: [],
    name: "",
    slug: "",
    slugTouched: false,
    tagline: "",
    description: "",
    theme: "vice",
    scene: "sunset",
    icon: "bolt",
    avatar: null,
    banner: null,
    privacy: "public",
    listed: true,
    questions: [],
    rules: [],
    permissions: { ...DEFAULT_PERMISSIONS },
  };
}
