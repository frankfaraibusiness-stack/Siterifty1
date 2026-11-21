// Pure helpers (no imports) so the browser, the server and the tests can all use them.
// A video's orientation, worked out from its pixel size. Never asked: the browser reports the size a viewer
// actually sees (phone rotation already applied), so the file itself is the answer.
export const ASPECTS = ["portrait", "landscape", "square"];
export function aspectOf(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0) || !(h > 0)) return null;
  const r = w / h;
  if (r > 1.05) return "landscape";
  if (r < 0.95) return "portrait";
  return "square";
}
// "Portrait · 9:16", "Landscape · 16:9", "Square · 1:1"; the ratio is left off when it isn't a common one.
export function aspectLabel(width, height) {
  const a = aspectOf(width, height);
  if (!a) return "";
  const r = Number(width) / Number(height);
  const common = [[16 / 9, "16:9"], [9 / 16, "9:16"], [4 / 3, "4:3"], [3 / 4, "3:4"], [1, "1:1"], [4 / 5, "4:5"]];
  const hit = common.find(([v]) => Math.abs(r - v) / v < 0.04);
  const name = a[0].toUpperCase() + a.slice(1);
  return hit ? `${name} · ${hit[1]}` : name;
}
