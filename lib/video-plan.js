// Pure maths for in-browser video compression (no DOM, so it is unit-tested).
// Goal: the smallest file that still looks good on a phone. Social clips are
// watched on small screens, so we cap resolution and bitrate hard.

export const AUDIO_BPS = 64_000;
export const DEFAULT_TARGET_MB = 40; // stays under Supabase's 50 MB free-plan cap

// Short-side pixels + the video bitrate we aim for at that size, and the
// lowest bitrate we accept before dropping to the next (smaller) tier.
export const TIERS = [
  { short: 720, bps: 1_500_000, min: 650_000 },
  { short: 540, bps: 1_000_000, min: 420_000 },
  { short: 480, bps: 700_000, min: 300_000 },
  { short: 360, bps: 450_000, min: 160_000 },
];

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// Longer clips start at a smaller tier.
function startTier(duration) {
  if (duration <= 45) return 0;
  if (duration <= 120) return 1;
  return 2;
}

// { width, height, duration, fps? } of the source -> encode settings.
export function planCompression({ width, height, duration, fps }, { maxBytes = DEFAULT_TARGET_MB * 1048576 } = {}) {
  const srcShort = Math.min(width, height);
  const secs = Math.max(1, duration || 1);
  // Bits per second we can spend on video and still fit under maxBytes.
  const budget = (maxBytes * 8 * 0.9) / secs - AUDIO_BPS;

  let pick = null;
  for (let i = startTier(secs); i < TIERS.length; i++) {
    const t = TIERS[i];
    const short = Math.min(t.short, srcShort); // never upscale
    // A smaller source needs proportionally fewer bits.
    const wanted = Math.round(t.bps * Math.min(1, (short / t.short) ** 2));
    const bitrate = Math.min(wanted, Math.floor(budget));
    pick = { short, bitrate };
    if (bitrate >= Math.round(t.min * Math.min(1, (short / t.short) ** 2))) break;
  }
  const scale = Math.min(1, pick.short / srcShort);
  return {
    width: even(width * scale),
    height: even(height * scale),
    bitrate: Math.max(100_000, pick.bitrate),
    frameRate: fps && fps > 30.5 ? 30 : undefined,
    scaled: scale < 1,
  };
}
