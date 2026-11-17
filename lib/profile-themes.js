// Accent themes a user can pick for their profile (banner fallback, avatar
// ring, stat highlights). Shared by server and client code.
export const THEMES = [
  { id: "vice", label: "Vice", a: "#ff3d7f", b: "#7b2ff7" },
  { id: "neon", label: "Neon", a: "#2de2c5", b: "#1b6fa8" },
  { id: "sunset", label: "Sunset", a: "#ff9a3d", b: "#ff3d7f" },
  { id: "lime", label: "Lime", a: "#cdfa4c", b: "#2de2c5" },
  { id: "night", label: "Night", a: "#7b2ff7", b: "#1b6fa8" },
];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || PERK_THEMES.find((t) => t.id === id) || THEMES[0];
}

// Perks Shop > Vice City Pack: three accents only owners can pick. They are
// NOT in THEMES, so nothing that lists the standard themes shows them.
export const PERK_THEMES = [
  { id: "miami", label: "Miami Sunset", a: "#ff6ec7", b: "#ffb347", perk: "vice_pack" },
  { id: "ocean", label: "Ocean Drive", a: "#00e5ff", b: "#3d5afe", perk: "vice_pack" },
  { id: "gold", label: "Gold Rush", a: "#ffd36b", b: "#e8590c", perk: "vice_pack" },
  // Perks Shop > Neon Nights Pack
  { id: "midnight", label: "Midnight Drive", a: "#8a5cff", b: "#00e5ff", perk: "neon_pack" },
  { id: "laser", label: "Laser Lime", a: "#b6ff3b", b: "#00c853", perk: "neon_pack" },
  { id: "cola", label: "Cherry Cola", a: "#ff2e63", b: "#ff8a5c", perk: "neon_pack" },
];

export function isPerkTheme(id) {
  return PERK_THEMES.some((t) => t.id === id);
}

// Every accent a profile can be shown with (standard + perk themes).
export function findTheme(id) {
  return THEMES.find((t) => t.id === id) || PERK_THEMES.find((t) => t.id === id) || null;
}

// Accents this person may pick: the standard five, plus the accents of every
// theme pack they own. Pass the user's perk ids.
export function themesFor(perks) {
  const owned = Array.isArray(perks) ? perks : [];
  return [...THEMES, ...PERK_THEMES.filter((t) => owned.includes(t.perk))];
}
