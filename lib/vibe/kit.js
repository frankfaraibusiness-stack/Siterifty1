// Small builders for the answer blocks Vibe sends to the chat. The chat knows
// how to draw each kind of block (components/vibe/VibeMessage.js).
//
// Text supports **bold**, `code`, [label](/path) and {{usd:4.99}} (a price shown
// in the visitor's own currency).

export const p = (x) => ({ t: "p", x });
export const h = (x) => ({ t: "h", x });
export const ul = (...items) => ({ t: "ul", items: items.flat() });
export const steps = (...items) => ({ t: "steps", items: items.flat() });
export const callout = (tone, x) => ({ t: "callout", tone, x }); // tip | info | warn | soon | fact
export const table = (head, rows, note) => ({ t: "table", head, rows, ...(note ? { note } : {}) });
export const stats = (items) => ({ t: "stats", items }); // [{ k, v, hint? }]
export const timeline = (items) => ({ t: "timeline", items }); // [{ y, t, x, tone? }]
export const plans = (ids, highlight) => ({ t: "plans", ids, ...(highlight ? { highlight } : {}) });
export const planvals = (title, values, opts = {}) => ({ t: "planvals", title, values, ...opts });
export const perks = (ids) => ({ t: "perks", ids });
export const actions = (...items) => ({ t: "actions", items: items.flat() }); // { label, href } or { label, ask }
export const countdown = (to, label) => ({ t: "countdown", to, label });
export const meCard = (user) => ({ t: "me", user });
export const login = (x) => ({ t: "login", ...(x ? { x } : {}) });

// ---- helpers ---------------------------------------------------------------

// Breaks a long paragraph into short ones (at most ~2 sentences each) so no
// answer ever shows up as one wall of text.
export function chunk(text, max = 230) {
  const s = String(text || "").trim();
  if (s.length <= max) return [s];
  const parts = s.split(/(?<=[.!?])\s+(?=[A-Z0-9*`\[{])/);
  const out = [];
  let cur = "";
  for (const part of parts) {
    if (cur && (cur + " " + part).length > max) {
      out.push(cur);
      cur = part;
    } else {
      cur = cur ? cur + " " + part : part;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// One or many paragraphs of text -> paragraph blocks.
export function paras(textOrList) {
  const list = Array.isArray(textOrList) ? textOrList : [textOrList];
  return list.flatMap((t) => chunk(t)).map(p);
}

// "1,000 characters" -> 1000, "1 GB" -> 1024 (MB), "3 min" -> 180 (s), "Unlimited" -> Infinity.
// Used to draw the little bars on the limit answers. Returns null if it can't tell.
export function numeric(value) {
  if (value === true) return null;
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "unlimited") return Infinity;
  const m = v.match(/^([\d,.]+)\s*(characters|mb|gb|min|s|hours|days)?\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const unit = m[2] || "";
  if (unit === "gb") return n * 1024;
  if (unit === "min") return n * 60;
  if (unit === "days") return n * 24;
  return n;
}

// Percent (0..100) bars for a row of four plan values, or null when they aren't numbers.
export function pcts(values) {
  const nums = values.map(numeric);
  if (nums.some((n) => n === null)) return null;
  const finite = nums.filter((n) => Number.isFinite(n));
  const top = Math.max(...finite, 1);
  return nums.map((n) => (n === Infinity ? 100 : Math.max(6, Math.round((n / top) * (nums.includes(Infinity) ? 86 : 100)))));
}
