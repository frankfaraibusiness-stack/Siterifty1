// Shared by the composer (browser) and the create-post API (server), so the
// rules a user sees are exactly the rules the server enforces.

export const TYPES = {
  post: {
    id: "post",
    label: "Photo post",
    blurb: "Screenshots, fan art and map finds. Up to 4 photos with a story.",
    a: "#ff3d7f",
    b: "#ff9a3d",
  },
  video: {
    id: "video",
    label: "Video clip",
    blurb: "Trailer breakdowns, gameplay edits and reactions. Upload or link YouTube.",
    a: "#2de2c5",
    b: "#1b6fa8",
  },
  poll: {
    id: "poll",
    label: "Poll",
    blurb: "Ask the fanbase anything. Real votes, live results and a timer.",
    a: "#cdfa4c",
    b: "#2de2c5",
  },
  theory: {
    id: "theory",
    label: "Theory",
    blurb: "Lay out your evidence, rate your confidence and let the crew call it.",
    a: "#b07bff",
    b: "#ff3d7f",
  },
};

export const LIMITS = {
  title: 90,
  text: 600,
  theory: 1500,
  question: 140,
  option: 48,
  alt: 140,
  tags: 5,
  tagLength: 24,
  images: 4,
  evidence: 2,
  videoMB: 60,
  videoSeconds: 180,
  pollOptions: 6,
  scheduleDays: 30,
};

export const LOCATIONS = [
  "Somewhere in Leonida",
  "Vice City",
  "Leonida Keys",
  "Grassrivers",
  "Port Gellhorn",
  "Ambrosia",
];

export const SUGGESTED_TAGS = [
  "Trailer2",
  "ViceCity",
  "Lucia",
  "Jason",
  "LeonidaKeys",
  "Map",
  "FanArt",
  "PhotoMode",
  "Soundtrack",
  "Cars",
];

export const POLL_LENGTHS = [
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

export const VERDICT_OPTIONS = ["Facts", "Cap"];

export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export function confidenceLabel(c) {
  if (c < 25) return "Pure cap";
  if (c < 50) return "Maybe";
  if (c < 75) return "Pretty sure";
  return "Basically confirmed";
}

export function cleanText(value, max = 5000) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function normalizeTag(value) {
  return String(value ?? "")
    .replace(/^#+/, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, LIMITS.tagLength);
}

// Accepts youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID.
export function parseYouTube(input) {
  try {
    const raw = String(input || "").trim();
    if (!raw) return null;
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(u.pathname);
        id = m && m[1];
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function emptyDraft(type = null) {
  return {
    type,
    title: "",
    text: "",
    tags: [],
    location: LOCATIONS[0],
    images: [], // [{ data, alt }] resized JPEG data URLs (browser only until publish)
    video: null, // { kind: "storage" | "youtube", ... }
    poll: { options: ["", ""], multi: false, hours: 24 },
    theory: { confidence: 60 },
    settings: {
      visibility: "public",
      comments: true,
      hideLikes: false,
      allowShare: true,
      spoiler: false,
      resultsFirst: false,
      pinned: false,
    },
    publishAt: "", // ISO string, or "" for right now
  };
}

// Returns { field: message }. An empty object means the draft can be published.
export function validateDraft(d) {
  const e = {};
  const t = d?.type;
  if (!TYPES[t]) return { type: "Pick a format first." };

  const title = cleanText(d.title, 500);
  const text = cleanText(d.text, 5000);

  if (!title) e.title = t === "poll" ? "Write your question." : "Add a title.";
  else if (title.length > (t === "poll" ? LIMITS.question : LIMITS.title)) {
    e.title = `Keep it under ${t === "poll" ? LIMITS.question : LIMITS.title} characters.`;
  }

  if (t === "post") {
    if (!d.images?.length) e.media = "Add at least one photo.";
    else if (d.images.length > LIMITS.images) e.media = `Up to ${LIMITS.images} photos.`;
  }

  if (t === "video") {
    const v = d.video;
    if (!v) e.media = "Upload a video or paste a YouTube link.";
    else if (v.kind === "youtube" && !/^[\w-]{11}$/.test(v.ytId || "")) {
      e.media = "That doesn’t look like a YouTube link.";
    } else if (v.kind === "storage") {
      if (v.status === "uploading") e.media = "Your video is still uploading.";
      else if (v.status !== "ready") e.media = "Your video didn’t upload. Try again.";
    }
  }

  if (t === "poll") {
    const opts = (d.poll?.options || []).map((o) => cleanText(o, 200)).filter(Boolean);
    if (opts.length < 2) e.options = "Add at least two options.";
    else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) {
      e.options = "Every option needs to be different.";
    } else if (opts.some((o) => o.length > LIMITS.option)) {
      e.options = `Options can be at most ${LIMITS.option} characters.`;
    }
  }

  if (t === "theory") {
    if (text.length < 40) e.text = "Explain the theory in at least 40 characters.";
    else if (text.length > LIMITS.theory) e.text = `Keep it under ${LIMITS.theory} characters.`;
  } else if (text.length > LIMITS.text) {
    e.text = `Keep it under ${LIMITS.text} characters.`;
  }

  if ((d.tags || []).length > LIMITS.tags) e.tags = `Up to ${LIMITS.tags} tags.`;
  if (!LOCATIONS.includes(d.location)) e.location = "Pick a location from the list.";

  if (d.publishAt) {
    const ms = Date.parse(d.publishAt);
    const now = Date.now();
    if (Number.isNaN(ms)) e.publishAt = "That date isn’t valid.";
    else if (ms < now - 60_000) e.publishAt = "Pick a time in the future.";
    else if (ms > now + LIMITS.scheduleDays * 86_400_000) {
      e.publishAt = `You can schedule up to ${LIMITS.scheduleDays} days ahead.`;
    }
  }
  return e;
}
