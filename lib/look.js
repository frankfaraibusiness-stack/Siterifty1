// "City Look": the site-wide appearance. Pure helpers shared by the server
// (root layout reads the cookie so the first paint is already themed) and the
// browser (the Appearance panel previews changes live).
//
// A look is stored as concrete values, so a preset can be tweaked freely:
// { preset, a, b, c, hue, depth, glow, size, motion }

export const LOOK_COOKIE = "gta6fb_look";

// "Never show the floating AI bubble again". A cookie that only exists while the
// bubble is hidden, so the server can leave it out of the very first paint. The
// same choice is saved on the account as look.aiBubble ("show" | "hide").
export const AI_BUBBLE_COOKIE = "gta6fb_aibubble";

// s / l = saturation and lightness (%) of the page background; the hue comes
// from the look so the "Night tint" slider can shift any preset.
export const PRESETS = [
  { id: "vice", name: "Vice City Neon", blurb: "Hot pink, cyan and a violet night.", hue: 252, s: 19, l: 12.5, a: "#ff3d7f", b: "#2de2c5", c: "#cdfa4c" },
  { id: "ocean", name: "Ocean Drive", blurb: "Art deco aqua under deep navy.", hue: 208, s: 36, l: 10.5, a: "#ff5fa2", b: "#22d3ee", c: "#8ff5df" },
  { id: "sunset", name: "Sunset Strip", blurb: "Coral and amber on a warm dusk.", hue: 8, s: 26, l: 11.5, a: "#ff4d6d", b: "#ffb347", c: "#ffe27a" },
  { id: "grass", name: "Grassrivers", blurb: "Swamp greens and gator-hide gold.", hue: 152, s: 26, l: 9.5, a: "#d9f35a", b: "#3dd6a0", c: "#e6ff8a" },
  { id: "keys", name: "Leonida Keys", blurb: "Turquoise water, coral and sand.", hue: 190, s: 40, l: 11.5, a: "#ff7e6b", b: "#37e8d0", c: "#ffe9a8" },
  { id: "port", name: "Port Gellhorn", blurb: "Steel blue docks and amber floodlights.", hue: 222, s: 20, l: 11, a: "#ffab2e", b: "#5ab0ff", c: "#ffd479" },
];

const IDS = PRESETS.map((p) => p.id);
const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v, list, d) => (list.includes(v) ? v : d);

export const DEPTHS = ["deep", "standard", "lifted"];
export const GLOWS = ["off", "soft", "strong"];
export const SIZES = ["small", "default", "large"];

export function lookFromPreset(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
  return {
    preset: p.id,
    a: p.a,
    b: p.b,
    c: p.c,
    hue: p.hue,
    depth: "standard",
    glow: "soft",
    size: "default",
    motion: "full",
    aiBubble: "show",
  };
}

export const defaultLook = () => lookFromPreset("vice");

// Accepts anything (a cookie, a database field, a request body) and returns a
// safe, complete look. Colours are strict hex so nothing odd reaches the CSS.
export function sanitizeLook(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const preset = r.preset === "custom" ? "custom" : pick(r.preset, IDS, "vice");
  const base = lookFromPreset(preset === "custom" ? "vice" : preset);
  const hue = Number.isFinite(Number(r.hue)) ? Math.round(Number(r.hue)) : base.hue;
  return {
    preset,
    a: HEX.test(r.a) ? r.a.toLowerCase() : base.a,
    b: HEX.test(r.b) ? r.b.toLowerCase() : base.b,
    c: HEX.test(r.c) ? r.c.toLowerCase() : base.c,
    hue: Math.min(359, Math.max(0, hue)),
    depth: pick(r.depth, DEPTHS, "standard"),
    glow: pick(r.glow, GLOWS, "soft"),
    size: pick(r.size, SIZES, "default"),
    motion: pick(r.motion, ["full", "reduced"], "full"),
    aiBubble: pick(r.aiBubble, ["show", "hide"], "show"),
  };
}

export function readLookCookie(value) {
  if (!value) return defaultLook();
  for (const text of [value, safeDecode(value)]) {
    try {
      return sanitizeLook(JSON.parse(text));
    } catch {
      // try the next form
    }
  }
  return defaultLook();
}

function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return "";
  }
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

const toHex = (rgb) => "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

const DEPTH_SHIFT = { deep: -2.5, standard: 0, lifted: 3.5 };
const GLOW_OPACITY = { off: 0, soft: 0.65, strong: 1 };
const SIZE_ZOOM = { small: 0.94, default: 1, large: 1.08 };

// CSS variables for a look. Used as the <html> style (server) and applied to
// document.documentElement (browser).
export function lookToVars(look) {
  const p = PRESETS.find((x) => x.id === look.preset) || PRESETS[0];
  const l = p.l + DEPTH_SHIFT[look.depth];
  const h = look.hue;
  const s = p.s;
  const step = (d, ds = 1) => hslToRgb(h, Math.min(100, s + ds), l + d);
  const bg = step(0, 0);
  const [r, g, b] = hexToRgb(look.c);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return {
    "--bg": toHex(bg),
    "--bg-rgb": bg.join(", "),
    "--surface": toHex(step(4)),
    "--surface-raised": toHex(step(8.5)),
    "--surface-hover": toHex(step(13.5)),
    "--border": toHex(step(13.5, 0)),
    "--text": `hsl(${h} 40% 97%)`,
    "--text-dim": `hsl(${h} 14% 69%)`,
    "--accent-pink": look.a,
    "--accent-cyan": look.b,
    "--accent-lime": look.c,
    "--accent-lime-2": toHex([Math.round(r * 0.77), Math.round(g * 0.92), Math.round(b * 0.58)]),
    "--on-accent": lum > 140 ? "#10140a" : "#ffffff",
    "--wash": String(GLOW_OPACITY[look.glow]),
    "--ui-zoom": String(SIZE_ZOOM[look.size]),
  };
}

// Browser only: paints a look immediately and remembers it in a cookie so the
// server can render the next page already themed.
export function applyLook(look) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(lookToVars(look))) root.style.setProperty(k, v);
  root.dataset.motion = look.motion;
  // aiBubble has its own cookie (setAiBubble below), so it is left out here.
  const saved = JSON.stringify({ ...look, aiBubble: undefined });
  document.cookie = `${LOOK_COOKIE}=${encodeURIComponent(saved)}; path=/; max-age=31536000; samesite=lax`;
}

export function hasLookCookie() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${LOOK_COOKIE}=`));
}

// Browser only: shows or hides the floating AI bubble right now and remembers it
// on this device. The server reads the cookie to render the next page the same way.
export function setAiBubble(mode) {
  const hide = mode === "hide";
  document.documentElement.dataset.aiBubble = hide ? "hide" : "show";
  document.cookie = hide
    ? `${AI_BUBBLE_COOKIE}=hide; path=/; max-age=31536000; samesite=lax`
    : `${AI_BUBBLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function isAiBubbleHidden() {
  return document.cookie.split("; ").some((c) => c === `${AI_BUBBLE_COOKIE}=hide`);
}
