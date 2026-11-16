// Single source of truth for the Perks Shop (/perks). Safe to import from
// server and client code. Perks are ONE-TIME purchases: buy once, keep forever.
// They are stored on users/{uid}.perks (an array of the ids below).

// While true, "buying" a perk costs $0 and needs no payment, so every perk can
// be tried for real. Flip to false once checkout exists: app/api/perks then
// refuses to unlock paid perks until you add the payment step there.
export const PERKS_FREE_WHILE_TESTING = true;

// How long a comment from a Forever Pin owner stays pinned. Far in the future
// (year 2100) so it works with the same "pinnedUntil" check as plan pins.
export const FOREVER_PIN_UNTIL_MS = Date.UTC(2100, 0, 1);

// Essay Mode raises the comment length from 500 to this.
export const ESSAY_COMMENT_MAX = 1500;

// Story Extender keeps stories up this long (normal stories: 24 hours).
export const EXTENDED_STORY_HOURS = 72;

// Exclusive profile accents unlocked by the Vice City Pack live in
// lib/profile-themes.js (PERK_THEMES).

// Each perk: id, name, price (USD, one time; shown in the visitor's currency, see lib/currency.js), a/b gradient, tagline (card),
// summary (one line in the sheet), description (paragraphs), how (steps shown
// in the sheet), and `fine` print.
export const PERKS = [
  {
    id: "forever_pin",
    name: "Forever Pin",
    price: 4.99,
    a: "#ffd36b",
    b: "#ff7a59",
    icon: "pin",
    flagship: true,
    tagline: "Every comment you write stays pinned on top. Forever.",
    summary: "Your comments always sit at the top of the thread.",
    description: [
      "Most comments get buried in minutes. With Forever Pin, every comment you post on any post is pinned above the rest, and it never runs out.",
      "Your pinned comments get a gold frame and a “Pinned forever” tag so people notice them first.",
    ],
    how: [
      "Unlock it once. It is yours for good.",
      "Comment on any post as usual.",
      "Your comment is pinned to the top of that thread automatically.",
    ],
    fine: "Applies to comments you post after unlocking. If several people have pinned comments, they show together at the top, newest first.",
  },
  {
    id: "essay_mode",
    name: "Essay Mode",
    price: 2.99,
    a: "#2de2c5",
    b: "#1b6fa8",
    icon: "text",
    tagline: "Write comments three times longer: 1,500 characters.",
    summary: "Comments up to 1,500 characters instead of 500.",
    description: [
      "Got a whole theory, a breakdown of the trailer, or a long reply that does not fit in 500 characters? Essay Mode lifts your comment limit to 1,500 characters.",
      "The comment box shows your new limit and a live counter, so you always know how much room is left.",
    ],
    how: [
      "Unlock it once.",
      "Open the comments on any post.",
      "Type away. Your box now holds up to 1,500 characters.",
    ],
    fine: "Only you get the longer limit. Everyone can still read your long comments in full.",
  },
  {
    id: "neon_glow",
    name: "Neon Glow",
    price: 1.99,
    a: "#ff3d7f",
    b: "#7b2ff7",
    icon: "glow",
    tagline: "Your comments glow in your profile colours.",
    summary: "A glowing neon frame around every comment you post.",
    description: [
      "Stand out without saying a word. Neon Glow wraps every comment you post in a soft animated glow that matches your profile accent.",
      "Change your accent colour in your profile and your glow changes with it.",
    ],
    how: [
      "Unlock it once.",
      "Comment on any post.",
      "Your comment shows with a neon frame in your accent colour.",
    ],
    fine: "Works on all of your comments, including older ones.",
  },
  {
    id: "vice_pack",
    name: "Vice City Pack",
    price: 3.99,
    a: "#b07bff",
    b: "#ff3d7f",
    icon: "palette",
    tagline: "Three exclusive profile accents nobody else can pick.",
    summary: "Unlocks 3 exclusive accents: Miami Sunset, Ocean Drive and Gold Rush.",
    description: [
      "Give your profile a look of its own. The Vice City Pack adds three exclusive accent themes: Miami Sunset, Ocean Drive and Gold Rush.",
      "The accent colours your banner, avatar ring and the picture beside your posts and comments.",
    ],
    how: [
      "Unlock it once.",
      "Open Edit profile, or Settings and Character.",
      "Pick one of the three new accents and save.",
    ],
    fine: "The exclusive accents show locked until you own the pack. If you ever lose the pack your accent falls back to a standard one.",
  },
  {
    id: "story_extender",
    name: "Story Extender",
    price: 3.99,
    a: "#cdfa4c",
    b: "#2de2c5",
    icon: "clock",
    tagline: "Your stories stay up for 72 hours instead of 24.",
    summary: "Stories you share last 3 days instead of 1.",
    description: [
      "Normal stories vanish after a day. With Story Extender, every story you share stays on the rail for 72 hours, so more people see it.",
      "Perfect for trailer reactions, announcements and anything you want to stay around over a weekend.",
    ],
    how: [
      "Unlock it once.",
      "Share a story from Your story, as usual.",
      "It stays up for 72 hours.",
    ],
    fine: "Applies to stories you share after unlocking. Stories already up keep their original time.",
  },
  {
    id: "big_bio",
    name: "Big Bio",
    price: 1.99,
    a: "#a18cd1",
    b: "#fbc2eb",
    icon: "user",
    tagline: "Room to tell your whole story: a 400-character bio.",
    summary: "Bio up to 400 characters instead of 160.",
    description: [
      "160 characters is a tweet. Big Bio gives you 400, enough for your favourite theories, what you play, and what you are waiting for most.",
      "Your longer bio shows on your profile and in search results, and the editor counts down as you type.",
    ],
    how: [
      "Unlock it once.",
      "Open Edit profile, or Settings and Character.",
      "Write up to 400 characters in your bio and save.",
    ],
    fine: "If you already have a bio it stays as it is. Only you get the longer limit; everyone can read the full bio.",
  },
  {
    id: "supporter_badge",
    name: "Supporter Badge",
    price: 2.49,
    a: "#ffd36b",
    b: "#ff3d7f",
    icon: "badge",
    tagline: "A golden star next to your name, everywhere you show up.",
    summary: "A gold Supporter star beside your name on posts, comments and your profile.",
    description: [
      "Show you back the fanbase. The Supporter Badge puts a small gold star next to your name on your posts, your comments, your profile and in search.",
      "It sits alongside any plan badge you have, so you can stack them.",
    ],
    how: [
      "Unlock it once.",
      "Look at your profile, or post or comment anywhere.",
      "The gold star appears next to your name for everyone to see.",
    ],
    fine: "The badge is visible to everyone, so people can tell you own it. It shows on older posts and comments too.",
  },
  {
    id: "gradient_name",
    name: "Gradient Name",
    price: 2.99,
    a: "#5ee7df",
    b: "#b490ca",
    icon: "type",
    tagline: "Your name shimmers in your profile colours.",
    summary: "Your name becomes a slowly moving gradient in your accent colours.",
    description: [
      "Plain white names are everywhere. With Gradient Name, yours flows through your two accent colours on posts, comments and your profile.",
      "Switch your accent in your profile and the gradient follows. Pairs well with the Vice City and Neon Nights accents.",
    ],
    how: [
      "Unlock it once.",
      "Pick an accent you like in Edit profile.",
      "Your name shimmers in those colours wherever it appears.",
    ],
    fine: "Colours are lightened a little so your name stays easy to read. The movement stops for people who use reduced motion.",
  },
  {
    id: "halo_avatar",
    name: "Halo Avatar",
    price: 2.49,
    a: "#89f7fe",
    b: "#66a6ff",
    icon: "halo",
    tagline: "A softly pulsing glow around your profile picture.",
    summary: "Your avatar gets an animated glowing halo in your accent colours.",
    description: [
      "Make your picture the one people spot first. Halo Avatar wraps your avatar in a gentle pulsing glow that cycles through your accent colours.",
      "It shows on your profile, your posts, your comments and in search.",
    ],
    how: [
      "Unlock it once.",
      "Open your profile or post something.",
      "Your avatar glows with its own halo.",
    ],
    fine: "Works with or without a profile picture. The pulse stops for people who use reduced motion.",
  },
  {
    id: "neon_pack",
    name: "Neon Nights Pack",
    price: 3.99,
    a: "#8a5cff",
    b: "#00e5ff",
    icon: "palette",
    wide: true,
    tagline: "Three more exclusive accents: Midnight Drive, Laser Lime and Cherry Cola.",
    summary: "Unlocks 3 more exclusive accents: Midnight Drive, Laser Lime and Cherry Cola.",
    description: [
      "A second set of exclusive accents for people who want their profile to glow after dark: Midnight Drive, Laser Lime and Cherry Cola.",
      "Like every accent, they colour your banner, avatar ring and the picture beside your posts and comments. They also power Gradient Name and Neon Glow if you own those.",
    ],
    how: [
      "Unlock it once.",
      "Open Edit profile, or Settings and Character.",
      "Pick one of the three new accents and save.",
    ],
    fine: "Works on its own or together with the Vice City Pack. The new accents show locked until you own this pack.",
  },
];

export const PERK_IDS = PERKS.map((p) => p.id);

export function isPerkId(id) {
  return typeof id === "string" && PERK_IDS.includes(id);
}

export function getPerk(id) {
  return PERKS.find((p) => p.id === id) || null;
}

// Cleans whatever is stored on a user document into a list of valid perk ids.
export function cleanPerks(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPerkId))];
}

export function hasPerk(perks, id) {
  return Array.isArray(perks) && perks.includes(id);
}

export function commentMax(perks) {
  return hasPerk(perks, "essay_mode") ? ESSAY_COMMENT_MAX : 500;
}

export function storyHours(perks, baseHours) {
  return hasPerk(perks, "story_extender") ? EXTENDED_STORY_HOURS : baseHours;
}

// Bio length: 160 normally, 400 with Big Bio.
export const BIO_MAX = 160;
export const BIO_MAX_PERK = 400;
export function bioMax(perks) {
  return hasPerk(perks, "big_bio") ? BIO_MAX_PERK : BIO_MAX;
}

// Cosmetic perks other people can see on this person's name, avatar and posts.
// Only these are ever sent to other viewers (never what else someone bought).
export const FLAIR_PERKS = ["supporter_badge", "gradient_name", "halo_avatar"];
export function publicFlair(perks) {
  return cleanPerks(perks).filter((id) => FLAIR_PERKS.includes(id));
}
