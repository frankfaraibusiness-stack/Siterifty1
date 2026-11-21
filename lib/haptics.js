// A tiny tap of vibration on phones that support it (Android Chrome and friends;
// iOS Safari ignores it). Used for likes, saves and other "it worked" moments.
// Silent for people who asked for reduced motion in City Look, and never throws.
export function buzz(ms = 10) {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    if (document.documentElement.dataset.motion === "reduced") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(ms);
  } catch {
    // Vibration is a nicety, never a requirement.
  }
}
