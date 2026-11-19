// Vice Reel settings (Settings > Vice Reel). Pure helpers, no imports.
//
// { sound: boolean, dataSaver: boolean, startOn: "foryou" | "hot" | "new" }
//   sound      start clips with the sound on (browsers may still block it until a tap)
//   dataSaver  only load the clip being watched, not the ones next to it
//   startOn    which reel opens first

export const REEL_STARTS = ["foryou", "hot", "new"];

// This device's own sound choice ("on" | "off"), set by the speaker button in the
// reel and by the Sound switch in Settings. When it exists it beats the account default.
export const REEL_SOUND_KEY = "gta6fb:vr-sound";

export const DEFAULT_REELS = Object.freeze({ sound: false, dataSaver: false, startOn: "foryou" });

export function sanitizeReels(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_REELS;
  return {
    sound: typeof r.sound === "boolean" ? r.sound : d.sound,
    dataSaver: typeof r.dataSaver === "boolean" ? r.dataSaver : d.dataSaver,
    startOn: REEL_STARTS.includes(r.startOn) ? r.startOn : d.startOn,
  };
}

// How many clips on each side of the active one get a <video> ready.
export const preloadReach = (reels) => (sanitizeReels(reels).dataSaver ? 0 : 1);

// The reel to open first. A clip opened from elsewhere (/videos?v=ID) always opens on For you, with that clip first.
export function startingMode(reels, startId = "") {
  return startId ? "foryou" : sanitizeReels(reels).startOn;
}
