// Turns whatever someone typed into the one "keyword" that search rank counts,
// or "" when it should not be counted at all. Shared by the server (what gets
// stored) and kept free of server-only code so it can be unit-tested.
//
//   "  GTA   6 Trailer!! "  ->  "gta 6 trailer"
//   "#gta6"                 ->  "gta6"
//   "@someone"              ->  ""   (looking up a person is not a topic)
//   "https://x.com/y"       ->  ""   (links never become trending)

export const KEYWORD_MIN = 2;
export const KEYWORD_MAX = 40;
const MAX_WORDS = 5;

export function normalizeKeyword(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text.startsWith("@")) return "";
  if (/(https?:|www\.|\.com\b|\.net\b|\.org\b|\S+@\S+\.\S+)/i.test(text)) return "";

  const key = text
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N}_.'-]+/gu, " ")
    .replace(/(^|\s)[._'-]+|[._'-]+(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (key.length < KEYWORD_MIN || key.length > KEYWORD_MAX) return "";
  if (key.split(" ").length > MAX_WORDS) return "";
  if (!/\p{L}/u.test(key) && key.length > 6) return ""; // long digit strings: phone numbers etc.
  if (/^(.)\1{3,}$/u.test(key.replace(/\s/g, ""))) return ""; // "aaaaaa"
  return key;
}
