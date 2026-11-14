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
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
