// Accessibility settings (Settings > Access). Pure helpers, no imports, shared
// by the server (root layout reads the cookie so the first paint is already
// right), the browser (the panel previews changes live) and the tests.
//
// { contrast: "normal" | "high", links: boolean, targets: "default" | "large" }

export const ACCESS_COOKIE = "gta6fb_access";

export const CONTRASTS = ["normal", "high"];
export const TARGETS = ["default", "large"];

export const DEFAULT_ACCESS = Object.freeze({ contrast: "normal", links: false, targets: "default" });

const pick = (v, list, d) => (list.includes(v) ? v : d);

// Accepts anything (a cookie, a database field, a request body) and returns a
// complete, valid object. Unknown values fall back to the defaults.
export function sanitizeAccess(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    contrast: pick(r.contrast, CONTRASTS, DEFAULT_ACCESS.contrast),
    links: typeof r.links === "boolean" ? r.links : DEFAULT_ACCESS.links,
    targets: pick(r.targets, TARGETS, DEFAULT_ACCESS.targets),
  };
}

export const isDefaultAccess = (a) => {
  const s = sanitizeAccess(a);
  return s.contrast === DEFAULT_ACCESS.contrast && s.links === DEFAULT_ACCESS.links && s.targets === DEFAULT_ACCESS.targets;
};

// "high.1.large" (contrast . links . targets). Cookie-safe: letters, digits, dots.
export function accessToCookie(a) {
  const s = sanitizeAccess(a);
  return `${s.contrast}.${s.links ? 1 : 0}.${s.targets}`;
}

export function readAccessCookie(value) {
  if (typeof value !== "string" || !value) return sanitizeAccess(null);
  const [contrast, links, targets] = value.split(".");
  return sanitizeAccess({ contrast, links: links === "1", targets });
}

// The attributes set on <html>; app/access.css reads them.
export function accessAttrs(a) {
  const s = sanitizeAccess(a);
  return {
    "data-contrast": s.contrast,
    "data-links": s.links ? "on" : "off",
    "data-targets": s.targets,
  };
}

// Short text for the settings row, e.g. "High contrast, links underlined" or "Standard".
export function accessSummary(a) {
  const s = sanitizeAccess(a);
  const parts = [];
  if (s.contrast === "high") parts.push("High contrast");
  if (s.links) parts.push("Underlined links");
  if (s.targets === "large") parts.push("Big buttons");
  if (parts.length === 0) return "Standard";
  return parts.length > 2 ? `${parts.length} adjustments on` : parts.join(", ");
}

// Browser only: applies the setting right now and remembers it on this device.
export function applyAccess(a) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(accessAttrs(a))) root.setAttribute(k, v);
  document.cookie = `${ACCESS_COOKIE}=${accessToCookie(a)}; path=/; max-age=31536000; samesite=lax`;
}
