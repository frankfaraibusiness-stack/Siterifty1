"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";
import { compressImage, inspectVideo, uploadVideo } from "./composer/imageTools";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { STORY, STORY_VIDEO_TYPES } from "@/lib/story-schema";

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `0:${String(s).padStart(2, "0")}`;
}

// "Your Story": pick a photo or a clip of up to 15 seconds, add an optional
// caption and share it. Stories stay up for 24 hours.
export default function StoryComposer({ onClose, onPosted }) {
  useScrollLock(true);

  const input = useRef(null);
  const abort = useRef(null);
  const [media, setMedia] = useState(null);
  // photo: { kind: "image", data }
  // clip:  { kind: "video", file, duration, poster, previewUrl }
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // reading the picked file
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);

  // Keep the latest preview URL so it is released when we leave.
  const previewRef = useRef(null);
  useEffect(() => {
    previewRef.current = media?.kind === "video" ? media.previewUrl : null;
  }, [media]);
  useEffect(
    () => () => {
      abort.current?.();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const close = () => {
    abort.current?.();
    onClose();
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function clear() {
    abort.current?.();
    if (media?.kind === "video") URL.revokeObjectURL(media.previewUrl);
    setMedia(null);
    setProgress(0);
    setSharing(false);
  }

  async function pick(file) {
    setError("");
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setBusy(true);
      try {
        const r = await compressImage(file, { max: 1280 });
        clear();
        setMedia({ kind: "image", data: r.data });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!STORY_VIDEO_TYPES.includes(file.type)) {
      return setError("Pick a photo, or an MP4, MOV or WebM clip.");
    }
    if (file.size > STORY.maxVideoMB * 1024 * 1024) {
      return setError(`That clip is over ${STORY.maxVideoMB} MB. Try a shorter or lower-quality one.`);
    }
    setBusy(true);
    try {
      const info = await inspectVideo(file);
      if (info.duration > STORY.maxSeconds + STORY.secondsTolerance) {
        URL.revokeObjectURL(info.previewUrl);
        return setError(
          `That clip is ${Math.round(info.duration)} seconds. Stories can be ${STORY.maxSeconds} seconds or less.`
        );
      }
      clear();
      setMedia({
        kind: "video",
        file,
        duration: Math.min(info.duration, STORY.maxSeconds),
        poster: info.poster,
        previewUrl: info.previewUrl,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!media || sharing) return;
    setError("");
    setSharing(true);
    setProgress(0);
    try {
      let payload;
      if (media.kind === "image") {
        payload = { kind: "image", image: media.data, caption };
      } else {
        const up = uploadVideo(media.file, {
          endpoint: "/api/stories/upload",
          extra: { seconds: media.duration },
          onProgress: setProgress,
        });
        abort.current = up.abort;
        const { storageId } = await up.promise;
        abort.current = null;
        payload = {
          kind: "video",
          storyId: storageId,
          seconds: media.duration,
          poster: media.poster,
          caption,
        };
      }
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn’t share your story.");
      onPosted();
    } catch (e) {
      if (e.message !== "cancelled") setError(e.message || "Couldn’t share your story.");
      setSharing(false);
    }
  }

  return (
    <div
      className="sc-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && !sharing && close()}
    >
      <div className="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-title">
        <div className="sc-head">
          <div>
            <h2 id="sc-title" className="sc-title">Your story</h2>
            <p className="sc-sub">A photo or a clip up to {STORY.maxSeconds} seconds. Gone after 24 hours.</p>
          </div>
          <button type="button" className="auth-close-btn sc-close" onClick={close} aria-label="Close">
            <XIcon />
          </button>
        </div>

        {!media ? (
          <button
            type="button"
            className={`sc-drop${drag ? " drag" : ""}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            disabled={busy}
          >
            <span className="sc-drop-ico" aria-hidden="true">+</span>
            <strong>{busy ? "Getting it ready..." : "Choose a photo or clip"}</strong>
            <span>Tap to browse or drop a file here</span>
            <span className="sc-chips">
              <i>Photo</i>
              <i>Video &middot; {STORY.maxSeconds}s max</i>
            </span>
          </button>
        ) : (
          <div className="sc-stage">
            <div className="sc-frame">
              {media.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.data} alt="Story preview" />
              ) : (
                <video src={media.previewUrl} autoPlay muted loop playsInline controls={false} />
              )}
              {media.kind === "video" && (
                <span className="sc-length">{clock(media.duration)} / {clock(STORY.maxSeconds)}</span>
              )}
              {caption && <div className="sc-caption-preview">{caption}</div>}
            </div>

            <div className="sc-side">
              <label className="auth-label" htmlFor="sc-caption">Caption (optional)</label>
              <input
                id="sc-caption"
                className="sc-input"
                value={caption}
                maxLength={STORY.caption}
                placeholder="Say something about it"
                onChange={(e) => setCaption(e.target.value)}
                disabled={sharing}
              />
              <small className="sc-count">{caption.length}/{STORY.caption}</small>

              {sharing && media.kind === "video" && (
                <div className="sc-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
            </div>
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept={`image/*,${STORY_VIDEO_TYPES.join(",")}`}
          hidden
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
        />

        {error && <div className="auth-error sc-error">{error}</div>}

        {media && (
          <div className="sc-actions">
            <button type="button" className="sc-btn ghost" onClick={clear} disabled={sharing && (media.kind === "image" || progress >= 1)}>
              {sharing ? "Cancel" : "Choose another"}
            </button>
            <button type="button" className="sc-btn primary" onClick={share} disabled={sharing}>
              {sharing && <span className="auth-spinner" />}
              {sharing
                ? media.kind === "video"
                  ? `Uploading ${Math.round(progress * 100)}%`
                  : "Sharing..."
                : "Share story"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
