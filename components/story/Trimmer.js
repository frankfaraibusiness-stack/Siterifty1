"use client";

import { useEffect, useRef } from "react";
import { STORY } from "@/lib/story-schema";
import { clock } from "./videoTools";

// A filmstrip with a draggable window. Drag either handle to move that edge,
// drag the window to slide the whole cut, or use the arrow keys on a handle
// (Shift = one second). The window is never longer than `maxSeconds` (stories: STORY.maxSeconds;
// the post composer passes the chosen video format's own limits).
export default function Trimmer({ duration, start, end, thumbs, videoRef, onChange, minSeconds = STORY.minSeconds, maxSeconds = STORY.maxSeconds }) {
  const track = useRef(null);
  const drag = useRef(null);
  const playhead = useRef(null);
  const min = Math.min(minSeconds, duration);
  const max = Math.min(maxSeconds, duration);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // The playhead follows the preview without re-rendering anything.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const el = playhead.current;
      if (v && el) {
        const t = v.currentTime;
        const inside = t >= start - 0.05 && t <= end + 0.05;
        el.style.opacity = inside ? "1" : "0";
        el.style.left = `${(clamp(t, 0, duration) / duration) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, start, end, videoRef]);

  function apply(mode, base, dt) {
    if (mode === "l") {
      const s = clamp(base.start + dt, Math.max(0, base.end - max), base.end - min);
      return { start: s, end: base.end };
    }
    if (mode === "r") {
      const e = clamp(base.end + dt, base.start + min, Math.min(duration, base.start + max));
      return { start: base.start, end: e };
    }
    const len = base.end - base.start;
    const s = clamp(base.start + dt, 0, duration - len);
    return { start: s, end: s + len };
  }

  function down(mode, e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { mode, x0: e.clientX, start, end };
  }
  function move(e) {
    const d = drag.current;
    if (!d || !track.current) return;
    const w = track.current.getBoundingClientRect().width || 1;
    onChange(apply(d.mode, d, ((e.clientX - d.x0) / w) * duration), d.mode);
  }
  function up() {
    drag.current = null;
  }

  function key(mode, e) {
    const step = e.shiftKey ? 1 : 0.1;
    let dt = 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") dt = -step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") dt = step;
    else return;
    e.preventDefault();
    onChange(apply(mode, { start, end }, dt), mode);
  }

  const left = (start / duration) * 100;
  const width = ((end - start) / duration) * 100;
  const tiles = thumbs.length ? thumbs : Array.from({ length: 12 }, () => null);

  return (
    <div className="sm-trim">
      <div className="sm-trim-track" ref={track}>
        <div className="sm-trim-strip" aria-hidden="true">
          {tiles.map((t, i) => (
            <i key={i} style={t ? { backgroundImage: `url(${t})` } : undefined} className={t ? "" : "empty"} />
          ))}
        </div>
        <div className="sm-trim-dim" style={{ left: 0, width: `${left}%` }} aria-hidden="true" />
        <div className="sm-trim-dim" style={{ left: `${left + width}%`, right: 0 }} aria-hidden="true" />

        <div
          className="sm-trim-win"
          style={{ left: `${left}%`, width: `${width}%` }}
          onPointerDown={(e) => down("m", e)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <button
            type="button"
            className="sm-trim-h l"
            role="slider"
            aria-label="Start of your cut"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, end - min)}
            aria-valuenow={Number(start.toFixed(1))}
            aria-valuetext={clock(start)}
            onPointerDown={(e) => down("l", e)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={(e) => key("l", e)}
          >
            <i />
          </button>
          <button
            type="button"
            className="sm-trim-h r"
            role="slider"
            aria-label="End of your cut"
            aria-valuemin={start + min}
            aria-valuemax={duration}
            aria-valuenow={Number(end.toFixed(1))}
            aria-valuetext={clock(end)}
            onPointerDown={(e) => down("r", e)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={(e) => key("r", e)}
          >
            <i />
          </button>
        </div>

        <span className="sm-trim-head" ref={playhead} aria-hidden="true" />
      </div>
      <div className="sm-trim-ends" aria-hidden="true">
        <span>0:00</span>
        <span>{clock(duration).replace(/\.\d$/, "")}</span>
      </div>
    </div>
  );
}
