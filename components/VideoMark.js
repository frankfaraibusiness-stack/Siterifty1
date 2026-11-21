"use client";

import { useEffect, useState } from "react";
import { WATERMARK_IMG } from "@/lib/media-url";

// Same look as the stamp on photos (lib/watermark.js): ~27% of the picture's width,
// 2.5% in from the corner, slightly faded, with a soft dark halo.
const RATIO = 0.27;
const MIN = 72;
const MAX = 240;
const MARGIN = 0.025;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Where the picture really is inside a <video> element. With object-fit: contain a
// clip can be letterboxed, so the logo has to sit on the picture, not on the black
// bars. `live` re-runs this when the <video> mounts later (the Videos page only
// renders a <video> for the clips near the one on screen).
export function useShownRect(ref, fit = "contain", live = true) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !live) return undefined;
    const calc = () => {
      const W = v.clientWidth;
      const H = v.clientHeight;
      if (!W || !H) return;
      let w = W;
      let h = H;
      if (fit !== "cover" && v.videoWidth && v.videoHeight) {
        const s = Math.min(W / v.videoWidth, H / v.videoHeight);
        w = v.videoWidth * s;
        h = v.videoHeight * s;
      }
      const next = { l: v.offsetLeft + (W - w) / 2, t: v.offsetTop + (H - h) / 2, w, h };
      setBox((b) => (b && Math.abs(b.l - next.l) < 0.5 && Math.abs(b.t - next.t) < 0.5 && Math.abs(b.w - next.w) < 0.5 && Math.abs(b.h - next.h) < 0.5 ? b : next));
    };
    calc();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(calc) : null;
    ro?.observe(v);
    v.addEventListener("loadedmetadata", calc);
    return () => {
      ro?.disconnect();
      v.removeEventListener("loadedmetadata", calc);
    };
  }, [ref, fit, live]);
  return live ? box : null;
}

// corner "br" matches photos. The Videos page uses "tl" so the logo never sits under
// the action buttons; `clearTop` keeps it below that page's score bar.
export default function VideoMark({ box, corner = "br", clearTop = 0 }) {
  if (!box) return null;
  const w = Math.min(clamp(box.w * RATIO, MIN, MAX), box.w * 0.5);
  const m = Math.round(box.w * MARGIN);
  const style = { width: w, position: "absolute" };
  if (corner === "tl") {
    style.left = box.l + m;
    style.top = Math.max(box.t + m, clearTop);
  } else {
    style.left = box.l + box.w - w - m;
    style.top = box.t + box.h - w * (289 / 520) - m; // the logo is 520 x 289
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="vmark" src={WATERMARK_IMG} alt="" aria-hidden="true" draggable={false} style={style} />
  );
}
