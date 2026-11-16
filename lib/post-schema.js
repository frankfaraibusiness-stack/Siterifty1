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
  event: {
    id: "event",
    label: "Event",
    blurb: "Meetups, watch parties and game nights. Set the when, where and who can join.",
    a: "#ffb02e",
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
  // Events
  eventText: 1500,
  venue: 80,
  address: 160,
  spot: 140,
  bring: 300,
  rules: 500,
  link: 200,
  capacityMax: 5000,
  eventDaysAhead: 365,
  eventMaxHours: 168,
};

// Grouped by game so the composer's location picker can show a GTA VI tab
// (default) and a GTA V tab. Names are the stored value, so keep them unique.
export const LOCATION_GROUPS = [
  {
    id: "gta6",
    label: "GTA VI",
    items: [
      { name: "Somewhere in Leonida", sub: "State of Leonida" },
      { name: "Vice City", sub: "The neon-lit metropolis" },
      { name: "Leonida Keys", sub: "Island chain & beaches" },
      { name: "Grassrivers", sub: "Swamps & backcountry" },
      { name: "Port Gellhorn", sub: "Industrial port town" },
      { name: "Ambrosia", sub: "Farmland & small-town Leonida" },
    ],
  },
  {
    id: "gta5",
    label: "GTA V",
    items: [
      { name: "Somewhere in San Andreas", sub: "State of San Andreas" },
      { name: "Los Santos", sub: "The sun-bleached city" },
      { name: "Vinewood", sub: "Hills, studios & the sign" },
      { name: "Blaine County", sub: "Desert & countryside" },
      { name: "Sandy Shores", sub: "Desert trailer town" },
      { name: "Paleto Bay", sub: "Quiet coastal town" },
      { name: "Grapeseed", sub: "Farm country" },
      { name: "Harmony", sub: "Desert crossroads" },
      { name: "Chumash", sub: "Beach town" },
      { name: "Mount Chiliad", sub: "Peak & wilderness" },
      { name: "Cayo Perico", sub: "Private island" },
      { name: "North Yankton", sub: "Snowy prologue town" },
    ],
  },
];

export const LOCATIONS = LOCATION_GROUPS.flatMap((g) => g.items.map((i) => i.name));

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

// ---- Events ---------------------------------------------------------------
export const EVENT_CATEGORIES = [
  "Meetup",
  "Watch party",
  "Game night",
  "Car meet",
  "Cosplay",
  "Photo walk",
  "Tournament",
  "Other",
];

export const EVENT_MODES = [
  { value: "ingame", label: "In-game", hint: "Meet inside GTA" },
  { value: "irl", label: "Real world", hint: "Meet face to face" },
  { value: "online", label: "Online", hint: "Discord, stream or call" },
];

export const EVENT_GAME_PLATFORMS = ["PS5", "Xbox Series X|S", "PC"];
export const EVENT_ONLINE_PLATFORMS = ["Discord", "Twitch", "YouTube", "Other"];

export function eventPlatformsFor(mode) {
  return mode === "ingame" ? EVENT_GAME_PLATFORMS : mode === "online" ? EVENT_ONLINE_PLATFORMS : [];
}

// Who is allowed to RSVP.
export const EVENT_JOIN = [
  { value: "everyone", label: "Everyone", hint: "Anyone who can see the event can join" },
  { value: "friends_followers", label: "Friends and followers", hint: "Only people you’re friends with or who follow you" },
  { value: "friends", label: "Friends only", hint: "Only people you’re friends with" },
  { value: "followers", label: "Followers only", hint: "Only people who follow you" },
];

// Who is allowed to see the event at all.
export const EVENT_PRIVACY = [
  { value: "public", label: "Public", hint: "Everyone can see it in the feed, search and your profile" },
  { value: "private", label: "Private", hint: "Only your friends and followers can see it" },
];

// Turns a local date ("2026-11-21") and time ("20:00") into an ISO string.
// The browser's own time zone is used, so only call this from the composer.
export function eventISO(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return "";
  const ms = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString();
}

// An end time earlier than the start (22:00 to 02:00) means "the next day".
export function eventEndsNextDay(ev) {
  const start = Date.parse(eventISO(ev?.date, ev?.time));
  const end = Date.parse(eventISO(ev?.date, ev?.endTime));
  return !Number.isNaN(start) && !Number.isNaN(end) && end <= start;
}

// Recomputes the absolute start/end the server relies on. Call after any
// change to date, time or endTime.
export function withEventTimes(ev) {
  const startsAt = eventISO(ev.date, ev.time);
  let endsAt = ev.endTime ? eventISO(ev.date, ev.endTime) : "";
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    endsAt = new Date(Date.parse(endsAt) + 86_400_000).toISOString();
  }
  return { ...ev, startsAt, endsAt };
}

export function emptyEvent(defaults = null) {
  const v = defaults?.visibility;
  return {
    category: "Meetup",
    mode: "ingame",
    date: "", // YYYY-MM-DD in the host's time zone
    time: "", // HH:MM
    endTime: "", // HH:MM, optional
    tz: "",
    startsAt: "", // ISO, derived by withEventTimes
    endsAt: "",
    venue: "",
    address: "",
    pin: null, // { lat, lng, label }
    spot: "", // exact meeting spot
    hideSpot: false, // real-world only: hide the pin until someone RSVPs
    platforms: [],
    link: "",
    join: "everyone",
    privacy: v === "private" ? "private" : v === "ask" ? "" : "public",
    capacity: "",
    waitlist: false,
    approval: false,
    plusOnes: false,
    showGuests: true,
    bring: "",
    rules: "",
  };
}

function isHttpUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const oneLine = (value, max) => cleanText(value, max * 2).replace(/\s*\n\s*/g, " ").slice(0, max);

// Trusted copy of the event fields: the server stores exactly this.
export function cleanEvent(ev = {}) {
  const mode = EVENT_MODES.some((m) => m.value === ev.mode) ? ev.mode : "ingame";
  const allowed = eventPlatformsFor(mode);
  const cap = Number(ev.capacity);
  const capacity = ev.capacity !== "" && Number.isInteger(cap) && cap >= 2 && cap <= LIMITS.capacityMax ? cap : null;
  const lat = Number(ev.pin?.lat);
  const lng = Number(ev.pin?.lng);
  const pin =
    mode === "irl" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, label: oneLine(ev.pin?.label, LIMITS.address) }
      : null;
  const tz = /^[A-Za-z][A-Za-z0-9_+\-]*(?:\/[A-Za-z0-9_+\-]+){0,2}$/.test(ev.tz || "") ? String(ev.tz).slice(0, 64) : "";
  return {
    category: EVENT_CATEGORIES.includes(ev.category) ? ev.category : "Other",
    mode,
    startsAt: new Date(Date.parse(ev.startsAt)).toISOString(),
    endsAt: ev.endsAt ? new Date(Date.parse(ev.endsAt)).toISOString() : null,
    tz,
    venue: mode === "irl" ? oneLine(ev.venue, LIMITS.venue) : "",
    address: mode === "irl" ? oneLine(ev.address, LIMITS.address) : "",
    pin,
    spot: oneLine(ev.spot, LIMITS.spot),
    hideSpot: mode === "irl" && !!ev.hideSpot,
    platforms: [...new Set(Array.isArray(ev.platforms) ? ev.platforms : [])].filter((p) => allowed.includes(p)),
    link: isHttpUrl(ev.link) ? String(ev.link).trim().slice(0, LIMITS.link) : "",
    join: EVENT_JOIN.some((j) => j.value === ev.join) ? ev.join : "everyone",
    privacy: ev.privacy === "private" ? "private" : "public",
    capacity,
    waitlist: !!ev.waitlist && capacity !== null,
    approval: !!ev.approval,
    plusOnes: !!ev.plusOnes,
    showGuests: ev.showGuests !== false,
    bring: cleanText(ev.bring, LIMITS.bring),
    rules: cleanText(ev.rules, LIMITS.rules),
  };
}

// The post's location label in the feed header.
export function eventLocationLabel(d, ev) {
  if (ev.mode === "irl") return ev.venue || ev.address || "Real world";
  if (ev.mode === "online") return "Online";
  return d.location;
}

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

// `defaults` are the member's Stash settings (Settings > The Stash). A
// visibility of "ask" starts unset, and validateDraft makes them choose.
export function emptyDraft(type = null, defaults = null) {
  const c = defaults || {};
  const visibility = c.visibility === "private" || c.visibility === "ask" ? c.visibility : "public";
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
    event: emptyEvent(c),
    settings: {
      visibility,
      comments: c.comments !== false,
      hideLikes: !!c.hideLikes,
      allowShare: c.allowShare !== false && visibility !== "private",
      spoiler: !!c.spoiler,
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
  // Events pick their audience in their own form (ev.privacy / ev.join).
  if (t !== "event" && d.settings?.visibility === "ask") e.visibility = "Choose who can see this post.";

  const title = cleanText(d.title, 500);
  const text = cleanText(d.text, 5000);

  if (!title) e.title = t === "poll" ? "Write your question." : t === "event" ? "Name your event." : "Add a title.";
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
  } else if (t === "event") {
    if (text.length < 20) e.text = "Tell people what it’s about in at least 20 characters.";
    else if (text.length > LIMITS.eventText) e.text = `Keep it under ${LIMITS.eventText} characters.`;
  } else if (text.length > LIMITS.text) {
    e.text = `Keep it under ${LIMITS.text} characters.`;
  }

  if (t === "event") validateEvent(d, e);

  if ((d.tags || []).length > LIMITS.tags) e.tags = `Up to ${LIMITS.tags} tags.`;
  if ((t !== "event" || d.event?.mode === "ingame") && !LOCATIONS.includes(d.location)) {
    e.location = "Pick a location from the list.";
  }

  if (d.publishAt) {
    const ms = Date.parse(d.publishAt);
    const now = Date.now();
    if (Number.isNaN(ms)) e.publishAt = "That date isn’t valid.";
    else if (ms < now - 60_000) e.publishAt = "Pick a time in the future.";
    else if (ms > now + LIMITS.scheduleDays * 86_400_000) {
      e.publishAt = `You can schedule up to ${LIMITS.scheduleDays} days ahead.`;
    } else if (t === "event" && d.event?.startsAt && ms >= Date.parse(d.event.startsAt)) {
      e.publishAt = "Schedule it to go live before the event starts.";
    }
  }
  return e;
}

function validateEvent(d, e) {
  const ev = d.event || {};
  const now = Date.now();

  if (!EVENT_CATEGORIES.includes(ev.category)) e.category = "Pick what kind of event this is.";

  // When
  const start = Date.parse(ev.startsAt || "");
  if (!ev.date) e.date = "Pick a date.";
  else if (!ev.time) e.time = "Pick a start time.";
  else if (Number.isNaN(start)) e.date = "That date or time isn’t valid.";
  else if (start < now + 5 * 60_000) e.date = "Pick a start time in the future.";
  else if (start > now + LIMITS.eventDaysAhead * 86_400_000) {
    e.date = `Events can be planned up to ${LIMITS.eventDaysAhead} days ahead.`;
  }
  if (ev.endsAt && !e.date && !e.time) {
    const end = Date.parse(ev.endsAt);
    if (Number.isNaN(end) || end <= start) e.endTime = "The end has to be after the start.";
    else if (end - start > LIMITS.eventMaxHours * 3_600_000) e.endTime = "Events can run for 7 days at most.";
  }

  // Where
  if (!EVENT_MODES.some((m) => m.value === ev.mode)) {
    e.mode = "Choose where it’s happening.";
  } else {
    const spot = cleanText(ev.spot, 500);
    const allowed = eventPlatformsFor(ev.mode);
    const picked = (ev.platforms || []).filter((p) => allowed.includes(p));
    if (spot.length > LIMITS.spot) e.spot = `Keep it under ${LIMITS.spot} characters.`;
    if (ev.mode === "ingame") {
      if (!spot) e.spot = "Say where in the world to meet, e.g. the Vice Beach pier.";
      if (!picked.length) e.platforms = "Pick at least one platform.";
    } else if (ev.mode === "irl") {
      const lat = Number(ev.pin?.lat);
      const lng = Number(ev.pin?.lng);
      if (!ev.pin || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        e.pin = "Drop a pin so people can find you.";
      }
      const venue = cleanText(ev.venue, 500);
      if (!venue) e.venue = "Name the place, e.g. a cafe or park.";
      else if (venue.length > LIMITS.venue) e.venue = `Keep it under ${LIMITS.venue} characters.`;
      if (cleanText(ev.address, 500).length > LIMITS.address) e.address = `Keep it under ${LIMITS.address} characters.`;
      if (!spot) e.spot = "Tell people exactly where to find the group.";
    } else if (ev.mode === "online" && !picked.length && !String(ev.link || "").trim()) {
      e.platforms = "Pick a platform or add a link.";
    }
  }
  const link = String(ev.link || "").trim();
  if (link && (link.length > LIMITS.link || !isHttpUrl(link))) {
    e.link = link.length > LIMITS.link ? `Keep it under ${LIMITS.link} characters.` : "Use a full link starting with https://";
  }

  // Who
  const cap = ev.capacity;
  if (cap !== "" && cap != null) {
    const n = Number(cap);
    if (!Number.isInteger(n) || n < 2 || n > LIMITS.capacityMax) {
      e.capacity = `Use a whole number from 2 to ${LIMITS.capacityMax}, or leave it empty.`;
    }
  }
  if (!EVENT_JOIN.some((j) => j.value === ev.join)) e.join = "Choose who can join.";
  if (!EVENT_PRIVACY.some((p) => p.value === ev.privacy)) e.privacy = "Choose public or private.";

  // Extras
  if (cleanText(ev.bring, 1000).length > LIMITS.bring) e.bring = `Keep it under ${LIMITS.bring} characters.`;
  if (cleanText(ev.rules, 1000).length > LIMITS.rules) e.rules = `Keep it under ${LIMITS.rules} characters.`;
}
