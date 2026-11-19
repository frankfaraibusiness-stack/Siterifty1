// Facts about the GTA series that Vibe's answers use. Plain data (safe on the
// server and the client). When Rockstar announces something new, change it HERE
// once and every answer that mentions it follows.

export const VIBE = {
  name: "Vibe",
  role: "Your Leonida guide",
};

// ---- GTA 6 -----------------------------------------------------------------
// Last checked against Rockstar's announcements: see `asOf`.
export const GTA6 = {
  name: "Grand Theft Auto VI",
  short: "GTA 6",
  // YYYY-MM-DD. The countdown in the chat counts down to the start of this day
  // in the visitor's own time zone.
  releaseDate: "2026-11-19",
  releaseLabel: "Thursday, November 19, 2026",
  asOf: "November 16, 2026",
  platforms: "PlayStation 5 and Xbox Series X|S",
  pc: "No PC release date has been announced.",
  setting: "the state of Leonida, a fictional take on Florida, with Vice City at its heart",
  heroes: ["Lucia Caminos", "Jason Duval"],
  developer: "Rockstar Games",
  publisher: "Take-Two Interactive",
  delays: [
    { when: "Original target", what: "Fall 2025" },
    { when: "First dated release", what: "May 26, 2026" },
    { when: "Latest date", what: "November 19, 2026" },
  ],
};

// True once the release day has started (server time is fine for the wording).
export function gta6Released(now = Date.now()) {
  const [y, m, d] = GTA6.releaseDate.split("-").map(Number);
  return now >= Date.UTC(y, m - 1, d, 0, 0, 0) + 12 * 3600 * 1000; // by now every time zone has reached the day
}

// ---- The series ------------------------------------------------------------
// Main-line games, in order.
export const SERIES = [
  { y: "1997", t: "Grand Theft Auto", x: "The original, played from above. Three cities: Liberty City, San Andreas and Vice City.", tone: "dim" },
  { y: "1999", t: "Grand Theft Auto 2", x: "Still top-down, set in a near-future city with rival gangs.", tone: "dim" },
  { y: "2001", t: "Grand Theft Auto III", x: "The jump to a full 3D open world, set in Liberty City.", tone: "cyan" },
  { y: "2002", t: "Grand Theft Auto: Vice City", x: "Neon, palm trees and a 1980s soundtrack. Tommy Vercetti rises through Vice City.", tone: "pink" },
  { y: "2004", t: "Grand Theft Auto: San Andreas", x: "A whole state: Los Santos, San Fierro and Las Venturas, with CJ at the wheel.", tone: "orange" },
  { y: "2008", t: "Grand Theft Auto IV", x: "A grittier, more realistic Liberty City and the story of Niko Bellic.", tone: "violet" },
  { y: "2013", t: "Grand Theft Auto V", x: "Los Santos and Blaine County, three playable leads and GTA Online.", tone: "lime" },
  { y: "Soon", t: "Grand Theft Auto VI", x: "Leonida, Vice City and two leads: Lucia Caminos and Jason Duval.", tone: "gold" },
];

// Where each Leonida area index entry on the World Hub points.
export const WORLD_AREAS = ["Vice City", "Port Gellhorn", "Ambrosia", "Mount Kalaga", "Grassrivers", "Leonida Keys"];

// Fun facts for the "random GTA fact" question. Keep each one something that is
// well established.
export const FUN_FACTS = [
  "GTA III (2001) was the first game in the series to move from a top-down view to a full 3D world.",
  "Vice City is a love letter to 1980s Miami: neon signs, pastel suits and a soundtrack full of synth and rock.",
  "San Andreas packs three cities into one map: Los Santos, San Fierro and Las Venturas.",
  "GTA IV introduced Niko Bellic and a more serious, realistic Liberty City in 2008.",
  "GTA V launched in 2013 and GTA Online followed a few weeks later. Both are still played today.",
  "GTA V lets you switch between three leads: Michael, Franklin and Trevor.",
  "Lucia Caminos is billed as the first female lead of a main-line Grand Theft Auto game.",
  "Leonida is Rockstar's fictional take on Florida, and Vice City is its biggest city.",
  "Vice City first appeared in the original 1997 game before getting its own game in 2002.",
  "The GTA 6 release date has moved twice: from fall 2025 to May 2026, then to November 19, 2026.",
  "Every GTA city is a parody of a real place: Liberty City nods to New York, Los Santos to Los Angeles and Vice City to Miami.",
  "Rockstar's work on the series spans more than two decades, from GTA III in 2001 to GTA VI.",
];

export const SITE_TIPS = [
  "Use **Leak Filter** in [Settings](/settings) to cover spoilers so you only see what you choose to see.",
  "Pinned comments from members show a live countdown. When it ends, the comment drops into the normal order.",
  "Stuck on colours? **City Look** in [Settings](/settings) changes the whole site's palette.",
  "Posts can be scheduled ahead. Higher plans can schedule further out.",
  "Predictions in the [World Hub](/world) pay 10 reputation points to everyone who called it right.",
  "Photos you post carry the GTAFanbase logo, so copies always show where they came from.",
  "Turn on **Reduce motion** in City Look and the whole site, including me, calms down.",
  "You can look around the public feed without an account. You only need one to post, comment, vote or save.",
];
