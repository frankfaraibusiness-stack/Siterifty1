"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, uploadVideo } from "./composer/imageTools";
import { canCompressVideo, maxSourceMB } from "@/lib/video-compress";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { STORY, STORY_AUDIENCES, STORY_VIDEO_TYPES, DEFAULT_STORY_AUDIENCE, audienceLabel } from "@/lib/story-schema";
import Trimmer from "./story/Trimmer";
import { clock, clockWhole, grabFrame, makeFilmstrip, readVideo } from "./story/videoTools";
import {
  AUDIENCE_ICON,
  BoltIcon,
  CheckIcon,
  ChatIcon,
  ChatOffIcon,
  ClipIcon,
  CloseIcon,
  ClockIcon,
  PauseIcon,
  PhotoIcon,
  PlayIcon,
  ScissorsIcon,
  SwapIcon,
  UploadIcon,
  VolumeMutedIcon,
  VolumeOnIcon,
} from "./story/icons";

const round1 = (n) => Math.round(n * 10) / 10;

function AudIcon({ id }) {
  const Icon = AUDIENCE_ICON[id] || AUDIENCE_ICON.public;
  return <Icon />;
}

// "Story Maker": a full-screen studio with its own header. Pick a photo or a
// video of any length, trim video to the best 15 seconds, add a caption, choose
// who can watch and whether people can reply, then share. Stories stay up for
// 24 hours.
export default function StoryComposer({ onClose, onPosted, defaults }) {
  useScrollLock(true);

  const root = useRef(null);
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const videoEl = useRef(null);
  const abort = useRef(null);

  const [media, setMedia] = useState(null);
  // photo: { kind: "image", data }
  // video: { kind: "video", file, url, duration }
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [thumbs, setThumbs] = useState([]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState(defaults?.audience || DEFAULT_STORY_AUDIENCE); // Settings > Stories
  const [replies, setReplies] = useState(defaults?.replies ?? true);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // reading the picked file
  const [sharing, setSharing] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [drag, setDrag] = useState(false);
  const [leaving, setLeaving] = useState(false); // "discard this story?"
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const canTrim = canCompressVideo();
  const isVideo = media?.kind === "video";
  const length = isVideo ? round1(Math.min(STORY.maxSeconds, trim.end - trim.start)) : STORY.imageSeconds;

  // Latest values for the long-lived listeners below.
  const live = useRef({ trim, media, sharing, leaving, done });
  useEffect(() => {
    live.current = { trim, media, sharing, leaving, done };
  });

  // Release the preview URL and any running upload when the studio goes away.
  useEffect(
    () => () => {
      abort.current?.();
      const m = live.current.media;
      if (m?.kind === "video") URL.revokeObjectURL(m.url);
    },
    []
  );

  useEffect(() => {
    root.current?.focus();
  }, []);

  function requestClose() {
    const l = live.current;
    if (l.sharing || l.done) return;
    if (l.media) setLeaving(true);
    else onClose();
  }
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (live.current.leaving) setLeaving(false);
      else closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Filmstrip for the trimmer.
  useEffect(() => {
    setThumbs([]);
    if (media?.kind !== "video" || !canCompressVideo()) return undefined;
    let off = false;
    makeFilmstrip(media.url, media.duration, 12, () => off)
      .then((t) => !off && setThumbs(t))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [media]);

  // Preview: loop only the chosen part of the clip.
  useEffect(() => {
    if (media?.kind !== "video") return undefined;
    let raf = 0;
    const tick = () => {
      const v = videoEl.current;
      const t = live.current.trim;
      if (v && t.end > 0 && (v.currentTime >= t.end - 0.03 || v.currentTime < t.start - 0.25)) {
        v.currentTime = t.start;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [media]);

  function dropMedia() {
    abort.current?.();
    if (media?.kind === "video") URL.revokeObjectURL(media.url);
    setMedia(null);
    setProgress(0);
    setSharing(false);
    setPhase("");
    setPlaying(true);
  }

  async function pick(file) {
    setError("");
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setBusy(true);
      try {
        const r = await compressImage(file, { max: 1280 });
        dropMedia();
        setMedia({ kind: "image", data: r.data });
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!STORY_VIDEO_TYPES.includes(file.type)) {
      return setError("Pick a photo, or an MP4, MOV or WebM video.");
    }
    const cap = maxSourceMB(STORY.maxVideoMB);
    if (file.size > cap * 1024 * 1024) {
      return setError(`That video is over ${cap >= 1024 ? `${cap / 1024} GB` : `${cap} MB`}. Try a shorter one.`);
    }
    setBusy(true);
    try {
      const info = await readVideo(file);
      if (!canCompressVideo() && info.duration > STORY.maxSeconds + STORY.secondsTolerance) {
        URL.revokeObjectURL(info.url);
        return setError(
          `That video is ${Math.round(info.duration)} seconds and this browser can’t trim it. Try Chrome, Edge or Safari, or pick one that’s ${STORY.maxSeconds} seconds or less.`
        );
      }
      dropMedia();
      setTrim({ start: 0, end: Math.min(info.duration, STORY.maxSeconds) });
      setPlaying(true);
      setMedia({ kind: "video", file, url: info.url, duration: info.duration });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function onTrim(next, mode) {
    setTrim(next);
    const v = videoEl.current;
    if (v) v.currentTime = mode === "r" ? Math.max(next.start, next.end - 0.15) : next.start;
  }

  function togglePlay() {
    const v = videoEl.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }
  function toggleSound() {
    const v = videoEl.current;
    const next = !muted;
    setMuted(next);
    if (v) v.muted = next;
  }

  async function share() {
    if (!media || sharing) return;
    setError("");
    setSharing(true);
    setProgress(0);
    setPhase(isVideo ? "compress" : "upload");
    try {
      let payload;
      if (media.kind === "image") {
        payload = { kind: "image", image: media.data };
      } else {
        const poster = await grabFrame(media.url, trim.start + Math.min(0.3, length / 3));
        const changed = trim.start > 0.05 || trim.end < media.duration - 0.05;
        const up = uploadVideo(media.file, {
          endpoint: "/api/stories/upload",
          extra: { seconds: length },
          onProgress: setProgress,
          onPhase: setPhase,
          trim: changed ? { start: trim.start, end: trim.end } : null,
        });
        abort.current = up.abort;
        const { storageId } = await up.promise;
        abort.current = null;
        payload = { kind: "video", storyId: storageId, seconds: length, poster };
      }
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, caption, audience, replies }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn’t share your story.");
      setDone(true);
      setTimeout(() => onPosted(), 1300);
    } catch (e) {
      if (e.message !== "cancelled") setError(e.message || "Couldn’t share your story.");
      setSharing(false);
    }
  }

  function cancelShare() {
    abort.current?.();
    abort.current = null;
    setSharing(false);
    setProgress(0);
  }

  // Step chips in the header.
  const step = done ? 3 : sharing ? 3 : media ? 2 : 1;
  const steps = ["Media", "Edit", "Share"];

  const num = (() => {
    let n = 0;
    return () => String(++n).padStart(2, "0");
  })();

  const sharingLabel =
    phase === "compress" ? `Cutting & compressing ${Math.round(progress * 100)}%` : `Uploading ${Math.round(progress * 100)}%`;

  return (
    <div
      className={`sm${drag ? " drag" : ""}`}
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sm-title"
      onDragOver={(e) => {
        if (media || sharing) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!media && !sharing) pick(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="sm-bg" aria-hidden="true">
        <span className="sm-sun" />
        <span className="sm-grid" />
      </div>

      {/* ---------- header ---------- */}
      <header className="sm-head">
        <button type="button" className="sm-x" onClick={requestClose} disabled={sharing || done} aria-label="Close story maker">
          <CloseIcon />
        </button>
        <div className="sm-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" className="sm-logo" width="72" height="40" />
          <div>
            <span className="sm-kicker">New</span>
            <h2 id="sm-title" className="sm-title">Story <em>Maker</em></h2>
          </div>
        </div>
        <ol className="sm-steps" aria-label="Progress">
          {steps.map((label, i) => (
            <li key={label} className={i + 1 < step ? "done" : i + 1 === step ? "on" : ""} aria-current={i + 1 === step ? "step" : undefined}>
              <b>{i + 1 < step ? <CheckIcon /> : String(i + 1).padStart(2, "0")}</b>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      {/* ---------- body ---------- */}
      <div className="sm-body">
        {!media && (
          <section className="sm-pick" aria-label="Choose what to post">
            <div className="sm-hero">
              <span className="sm-tag"><BoltIcon /> Live for 24 hours</span>
              <h3>Make something worth watching.</h3>
              <p>Post a photo, or a video of any length. Long video? You choose the best {STORY.maxSeconds} seconds.</p>
            </div>

            <div className="sm-pick-cards">
              <button type="button" className="sm-pick-card photo" onClick={() => photoInput.current?.click()} disabled={busy}>
                <span className="sm-pick-ico"><PhotoIcon /></span>
                <b>Photo</b>
                <span>Stays on screen for {STORY.imageSeconds} seconds.</span>
                <em><UploadIcon /> Choose photo</em>
              </button>
              <button type="button" className="sm-pick-card clip" onClick={() => videoInput.current?.click()} disabled={busy}>
                <span className="sm-pick-ico"><ClipIcon /></span>
                <b>Video</b>
                <span>Any length. Trim it to {STORY.maxSeconds} seconds.</span>
                <em><UploadIcon /> Choose video</em>
              </button>
            </div>

            <p className="sm-drop-hint">{busy ? "Getting it ready…" : "Or drag a file anywhere on this screen."}</p>

            <ul className="sm-perks" aria-label="What you can set">
              <li><span><ScissorsIcon /></span>Trim to your best moment</li>
              <li><span><AudIcon id="connections" /></span>Choose who watches</li>
              <li><span><ChatIcon /></span>Replies on by default</li>
            </ul>
          </section>
        )}

        {media && (
          <div className="sm-edit">
            {/* preview */}
            <div className="sm-preview">
              <div className="sm-frame">
                {media.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.data} alt="Story preview" />
                ) : (
                  <video
                    ref={videoEl}
                    src={media.url}
                    autoPlay
                    muted
                    loop={false}
                    playsInline
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = live.current.trim.start;
                    }}
                    onEnded={(e) => {
                      e.currentTarget.currentTime = live.current.trim.start;
                      e.currentTarget.play().catch(() => {});
                    }}
                  />
                )}
                <div className="sm-shade" />
                <span className="sm-chip aud">
                  <AudIcon id={audience} />
                  {audienceLabel(audience)}
                </span>
                <span className="sm-chip len"><ClockIcon />{clockWhole(length)}</span>
                {caption && <div className="sm-cap">{caption}</div>}
                {isVideo && (
                  <>
                    <button type="button" className="sm-tap" onClick={togglePlay} aria-label={playing ? "Pause preview" : "Play preview"}>
                      <span className={playing ? "hide" : ""}>{playing ? <PauseIcon /> : <PlayIcon />}</span>
                    </button>
                    <button type="button" className="sm-snd" onClick={toggleSound} aria-label={muted ? "Turn preview sound on" : "Mute preview"}>
                      {muted ? <VolumeMutedIcon /> : <VolumeOnIcon />}
                    </button>
                  </>
                )}
                {done && (
                  <div className="sm-live" role="status">
                    <span className="sm-live-ring"><CheckIcon /></span>
                    <b>Your story is live</b>
                  </div>
                )}
              </div>
            </div>

            {/* controls */}
            <div className="sm-panel">
              {isVideo && canTrim && (
                <section className="sm-card">
                  <header className="sm-card-h">
                    <span className="sm-num">{num()}</span>
                    <h3>Pick your {STORY.maxSeconds} seconds</h3>
                    <ScissorsIcon />
                  </header>
                  <Trimmer duration={media.duration} start={trim.start} end={trim.end} thumbs={thumbs} videoRef={videoEl} onChange={onTrim} />
                  <div className="sm-stats">
                    <div><small>Start</small><b>{clock(trim.start)}</b></div>
                    <div><small>End</small><b>{clock(trim.end)}</b></div>
                    <div className={length >= STORY.maxSeconds - 0.05 ? "full" : ""}>
                      <small>Length</small><b>{length.toFixed(1)}s</b>
                    </div>
                  </div>
                  <div className="sm-meter" aria-hidden="true">
                    {Array.from({ length: STORY.maxSeconds }, (_, i) => (
                      <i key={i} className={i < Math.round(length) ? "on" : ""} />
                    ))}
                  </div>
                  <p className="sm-note">
                    {media.duration > STORY.maxSeconds + STORY.secondsTolerance
                      ? `Your video is ${clockWhole(media.duration)} long. Slide the window to the part you want, up to ${STORY.maxSeconds} seconds.`
                      : "Drag the edges to cut it shorter, or leave it as it is."}
                  </p>
                </section>
              )}
              {isVideo && !canTrim && (
                <section className="sm-card">
                  <header className="sm-card-h">
                    <span className="sm-num">{num()}</span>
                    <h3>Your video</h3>
                    <ClockIcon />
                  </header>
                  <p className="sm-note">This browser can’t trim video, so the whole {clockWhole(media.duration)} clip will be posted.</p>
                </section>
              )}
              {!isVideo && (
                <section className="sm-card">
                  <header className="sm-card-h">
                    <span className="sm-num">{num()}</span>
                    <h3>Your photo</h3>
                    <PhotoIcon />
                  </header>
                  <p className="sm-note">It stays on screen for {STORY.imageSeconds} seconds, then the next story plays.</p>
                </section>
              )}

              <section className="sm-card">
                <header className="sm-card-h">
                  <span className="sm-num">{num()}</span>
                  <h3><label htmlFor="sm-caption">Caption</label></h3>
                  <small className="sm-count">{caption.length}/{STORY.caption}</small>
                </header>
                <input
                  id="sm-caption"
                  className="sm-input"
                  value={caption}
                  maxLength={STORY.caption}
                  placeholder="Say something about it (optional)"
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={sharing}
                />
              </section>

              <section className="sm-card">
                <header className="sm-card-h">
                  <span className="sm-num">{num()}</span>
                  <h3 id="sm-aud-h">Who can watch</h3>
                </header>
                <div className="sm-opts" role="radiogroup" aria-labelledby="sm-aud-h">
                  {STORY_AUDIENCES.map((a) => {
                    const on = audience === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`sm-opt${on ? " on" : ""}`}
                        onClick={() => setAudience(a.id)}
                        disabled={sharing}
                      >
                        <span className="sm-opt-face">
                          <span className="sm-opt-ico"><AudIcon id={a.id} /></span>
                          <b>{a.label}</b>
                          <small>{a.hint}</small>
                          <span className="sm-opt-tick" aria-hidden="true"><CheckIcon /></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="sm-card">
                <header className="sm-card-h">
                  <span className="sm-num">{num()}</span>
                  <h3 id="sm-rep-h">Replies</h3>
                </header>
                <button
                  type="button"
                  role="switch"
                  aria-checked={replies}
                  aria-labelledby="sm-rep-h"
                  className={`sm-switch${replies ? " on" : ""}`}
                  onClick={() => setReplies((r) => !r)}
                  disabled={sharing}
                >
                  <span className="sm-switch-ico">{replies ? <ChatIcon /> : <ChatOffIcon />}</span>
                  <span className="sm-switch-txt">
                    <b>{replies ? "Replies are on" : "Replies are off"}</b>
                    <small>
                      {replies
                        ? "People who can watch can send you a reply. Only you see them."
                        : "Nobody can reply. Viewers will see that replies are disabled."}
                    </small>
                  </span>
                  <span className="sm-switch-knob" aria-hidden="true"><i /></span>
                </button>
              </section>
            </div>
          </div>
        )}

        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
        />
        <input
          ref={videoInput}
          type="file"
          accept={STORY_VIDEO_TYPES.join(",")}
          hidden
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
        />

        {error && <div className="sm-error" role="alert">{error}</div>}
      </div>

      {/* ---------- footer ---------- */}
      {media && (
        <footer className="sm-foot">
          {sharing && isVideo && !done && (
            <div className="sm-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <div className="sm-foot-in">
            <button type="button" className="sm-btn ghost" onClick={sharing ? cancelShare : dropMedia} disabled={done || (sharing && (!isVideo || progress >= 1))}>
              {sharing ? <CloseIcon /> : <SwapIcon />}
              <span>{sharing ? "Cancel" : "Change media"}</span>
            </button>
            <div className="sm-sum" aria-hidden="true">
              <span><AudIcon id={audience} />{audienceLabel(audience)}</span>
              <span>{replies ? <ChatIcon /> : <ChatOffIcon />}{replies ? "Replies on" : "Replies off"}</span>
            </div>
            <button type="button" className="sm-btn go" onClick={share} disabled={sharing || done}>
              {sharing ? <span className="sm-spin" /> : <BoltIcon />}
              <span>{done ? "Live" : sharing ? (isVideo ? sharingLabel : "Sharing…") : "Share story"}</span>
            </button>
          </div>
        </footer>
      )}

      {/* ---------- discard confirm ---------- */}
      {leaving && (
        <div className="sm-modal" role="alertdialog" aria-modal="true" aria-labelledby="sm-leave-t">
          <div className="sm-modal-card">
            <h3 id="sm-leave-t">Discard this story?</h3>
            <p>What you’ve made so far won’t be saved.</p>
            <div className="sm-modal-act">
              <button type="button" className="sm-btn ghost" onClick={() => setLeaving(false)} autoFocus>Keep editing</button>
              <button type="button" className="sm-btn danger" onClick={onClose}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
