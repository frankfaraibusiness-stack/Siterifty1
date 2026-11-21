"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Field } from "./ui";
import TypeIcon from "./TypeIcon";
import { compressImage, uploadVideo } from "./imageTools";
import Trimmer from "@/components/story/Trimmer";
import { clock, grabFrame, makeFilmstrip, readVideo } from "@/components/story/videoTools";
import { canCompressVideo, maxSourceMB } from "@/lib/video-compress";
import { LIMITS, VIDEO_TYPES, lengthLabel, parseYouTube } from "@/lib/post-schema";
import { aspectLabel, aspectOf } from "@/lib/video-aspect";

export function ImageUploader({ images, onChange, max, error, label = "Photos", optional }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const latest = useRef(images);
  latest.current = images;
  const input = useRef(null);

  async function addFiles(fileList) {
    const room = max - latest.current.length;
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return setMsg("Only image files work here.");
    if (room <= 0) return setMsg(`You can add up to ${max}.`);
    setBusy(true);
    setMsg(files.length > room ? `Only the first ${room} were added (max ${max}).` : "");
    const added = [];
    for (const f of files.slice(0, room)) {
      try {
        const r = await compressImage(f);
        added.push({ data: r.data, alt: "" });
      } catch (e) {
        setMsg(e.message);
      }
    }
    onChange([...latest.current, ...added]);
    setBusy(false);
  }

  // Paste a screenshot straight from the clipboard.
  useEffect(() => {
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])];
      if (files.some((f) => f.type.startsWith("image/")) && !/input|textarea/i.test(e.target.tagName)) {
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const move = (i, d) => {
    const next = [...images];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const setAlt = (i, alt) => onChange(images.map((im, j) => (j === i ? { ...im, alt } : im)));

  return (
    <Field label={label} count={images.length} max={max} error={error || msg}>
      {images.length < max && (
        <button
          type="button"
          className={`cmp-drop${drag ? " drag" : ""}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        >
          <span className="cmp-drop-ico"><TypeIcon type="post" size={26} /></span>
          <strong>{busy ? "Optimizing..." : images.length ? "Add more" : optional ? "Attach a screenshot" : "Add photos"}</strong>
          <span>Tap to browse, drop files here or paste from your clipboard</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

      {images.length > 0 && (
        <ul className="cmp-thumbs">
          {images.map((im, i) => (
            <li key={i}>
              <div className="cmp-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.data} alt="" />
                {i === 0 && max > 1 && <span className="cmp-cover">Cover</span>}
                <div className="cmp-thumb-tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">‹</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move later">›</button>
                  <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Remove photo">×</button>
                </div>
              </div>
              <input
                className="cmp-input slim"
                value={im.alt}
                maxLength={LIMITS.alt}
                placeholder="Describe it for screen readers"
                onChange={(e) => setAlt(i, e.target.value)}
                aria-label={`Alt text for photo ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

// Upload (trimmed and compressed on-device, then stored in Supabase/Firebase Storage) or link YouTube.
//
// Choosing a file opens a trim step, like the Story Maker's: a clip longer than the format allows is cut down
// to the part the creator wants, and any clip can be shortened. A browser that can't re-encode video skips the
// step: a clip that fits just uploads, one that's too long is turned away with a clear message.
//
// Orientation (portrait / landscape / square) is never asked. It is read from the video's own pixel size when
// the file is picked and travels with the draft (see aspectOf in lib/post-schema.js).
export function VideoPicker({ video, setVideo, setPoster, abortRef, uploads, error, minSeconds = LIMITS.shortMinSeconds, maxSeconds = LIMITS.shortSeconds, formLabel = "Clips" }) {
  const [mode, setMode] = useState(video?.kind === "youtube" || !uploads ? "youtube" : "upload");
  const [msg, setMsg] = useState("");
  const [yt, setYt] = useState(video?.url || "");
  const [draft, setDraft] = useState(null); // { file, url, duration, width, height } while the trim step is open
  const [trim, setTrim] = useState({ start: 0, end: 0 });
  const [thumbs, setThumbs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(true);
  const input = useRef(null);
  const videoEl = useRef(null);
  const draftRef = useRef(null);
  const live = useRef(trim);
  const canTrim = useSyncExternalStore(
    () => () => {},
    () => canCompressVideo(),
    () => false
  );
  const maxLabel = lengthLabel(maxSeconds);
  const minLabel = lengthLabel(minSeconds);

  useEffect(() => {
    live.current = trim;
  });

  // Never leave a picked-but-unused file's preview URL behind (format changed, page left).
  useEffect(
    () => () => {
      if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
    },
    []
  );

  // Filmstrip for the trimmer.
  useEffect(() => {
    if (!draft) return undefined;
    let off = false;
    makeFilmstrip(draft.url, draft.duration, 12, () => off)
      .then((t) => !off && setThumbs(t))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [draft]);

  // Preview: loop only the chosen part of the clip.
  useEffect(() => {
    if (!draft) return undefined;
    let raf = 0;
    const tick = () => {
      const v = videoEl.current;
      const t = live.current;
      if (v && t.end > 0 && (v.currentTime >= t.end - 0.03 || v.currentTime < t.start - 0.25)) {
        v.currentTime = t.start;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draft]);

  // Closes the trim step. `keepUrl` is for the hand-off to the upload, which keeps using the preview URL.
  function closeDraft(keepUrl = false) {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    setThumbs([]);
    setPlaying(true);
    if (d && !keepUrl) URL.revokeObjectURL(d.url);
  }

  const switchMode = (m) => {
    if (m === mode) return;
    abortRef.current?.();
    closeDraft();
    setVideo(null);
    setPoster([]);
    setMsg("");
    setYt("");
    setMode(m);
  };

  async function pick(file) {
    setMsg("");
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) return setMsg("Use an MP4, MOV or WebM video.");
    const cap = maxSourceMB(LIMITS.videoMB);
    if (file.size > cap * 1024 * 1024) {
      return setMsg(`That video is over ${cap >= 1024 ? `${cap / 1024} GB` : `${cap} MB`}.`);
    }
    setBusy(true);
    let info;
    try {
      info = await readVideo(file);
    } catch (e) {
      setBusy(false);
      return setMsg(e.message);
    }
    setBusy(false);
    const reject = (text) => {
      URL.revokeObjectURL(info.url);
      setMsg(text);
    };
    if (info.duration < minSeconds - 0.5) {
      return reject(`That video is ${Math.round(info.duration)}s long. ${formLabel} must be at least ${minLabel}.`);
    }
    const tooLong = info.duration > maxSeconds + 0.5;
    if (!canCompressVideo()) {
      if (tooLong) {
        return reject(
          `That video is ${Math.round(info.duration)}s long and this browser can’t trim it. Try Chrome, Edge or Safari, or pick one that’s ${maxLabel} or less.`
        );
      }
      // Nothing to edit with: upload as it is.
      return begin({ file, ...info }, null);
    }
    closeDraft();
    setTrim({ start: 0, end: Math.min(info.duration, maxSeconds) });
    const next = { file, ...info };
    draftRef.current = next;
    setDraft(next);
  }

  function onTrim(next, edge) {
    setTrim(next);
    const v = videoEl.current;
    if (v) v.currentTime = edge === "r" ? Math.max(next.start, next.end - 0.15) : next.start;
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

  // Starts compressing (and cutting, when trimmed) and uploading. `t` is { start, end } or null for the whole clip.
  async function begin(d, t) {
    setBusy(true);
    const length = t ? t.end - t.start : d.duration;
    let poster = null;
    try {
      poster = await grabFrame(d.url, (t ? t.start : 0) + Math.min(0.3, length / 3));
    } catch {
      // No poster is fine; the post just shows the first frame.
    }
    abortRef.current?.();
    const token = Date.now();
    const patch = (p) => setVideo((v) => (v && v.token === token ? { ...v, ...p } : v));
    setVideo({
      kind: "storage", token, status: "uploading", phase: canCompressVideo() ? "compress" : "upload", progress: 0,
      name: d.file.name, size: d.file.size, duration: length, trimmed: !!t,
      // The media fragment makes the composer's preview play just the cut part.
      previewUrl: t ? `${d.url}#t=${t.start.toFixed(2)},${t.end.toFixed(2)}` : d.url,
      width: d.width, height: d.height, aspect: aspectOf(d.width, d.height),
    });
    setPoster(poster ? [{ data: poster, alt: "" }] : []);
    closeDraft(true);
    setBusy(false);

    const up = uploadVideo(d.file, {
      trim: t,
      onProgress: (p) => patch({ progress: p }),
      onPhase: (phase) => patch({ phase }),
    });
    abortRef.current = up.abort;
    up.promise
      .then((r) => patch({ status: "ready", progress: 1, storageId: r.storageId, finalSize: r.size }))
      .catch((e) => e.message !== "cancelled" && patch({ status: "error", error: e.message }));
  }

  function confirmTrim() {
    const d = draftRef.current;
    if (!d || busy) return;
    const round = (n) => Math.round(n * 100) / 100;
    const changed = trim.start > 0.05 || trim.end < d.duration - 0.05;
    begin(d, changed ? { start: round(trim.start), end: round(trim.end) } : null);
  }

  function onYouTube(value) {
    setYt(value);
    const id = parseYouTube(value);
    setVideo(id ? { kind: "youtube", ytId: id, url: value } : null);
  }

  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  const cutLength = trim.end - trim.start;

  return (
    <Field label="Video" error={error || msg}>
      <div className="cmp-seg" role="tablist" aria-label="Video source">
        <button type="button" role="tab" aria-selected={mode === "upload"} className={mode === "upload" ? "on" : ""} onClick={() => switchMode("upload")}>Upload</button>
        <button type="button" role="tab" aria-selected={mode === "youtube"} className={mode === "youtube" ? "on" : ""} onClick={() => switchMode("youtube")}>YouTube link</button>
      </div>

      {mode === "upload" && !uploads && (
        <div className="cmp-note">
          Video uploads aren’t switched on for this site yet. Add Supabase keys (or a
          Firebase Storage bucket) to enable them, or paste a YouTube link instead.
        </div>
      )}

      {mode === "upload" && uploads && !video && !draft && (
        <button type="button" className="cmp-drop" onClick={() => input.current?.click()} disabled={busy}>
          <span className="cmp-drop-ico"><TypeIcon type="video" size={26} /></span>
          <strong>{busy ? "Reading your video…" : "Choose a video"}</strong>
          <span>
            MP4, MOV or WebM &middot; {minLabel} to {maxLabel}
            {canTrim ? " · longer? you can trim it next" : " · we shrink it before uploading"}
          </span>
        </button>
      )}
      <input ref={input} type="file" accept={VIDEO_TYPES.join(",")} hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} />

      {mode === "upload" && draft && (
        <div className="cmp-trim">
          <div className="cmp-trim-stage">
            <video
              ref={videoEl}
              src={draft.url}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = live.current.start;
              }}
            />
            <button type="button" className="cmp-trim-tap" onClick={togglePlay} aria-label={playing ? "Pause preview" : "Play preview"} />
            <span className="cmp-trim-chip">{aspectLabel(draft.width, draft.height)}</span>
          </div>
          <Trimmer
            duration={draft.duration}
            start={trim.start}
            end={trim.end}
            thumbs={thumbs}
            videoRef={videoEl}
            onChange={onTrim}
            minSeconds={minSeconds}
            maxSeconds={maxSeconds}
          />
          <div className="sm-stats">
            <div><small>Start</small><b>{clock(trim.start)}</b></div>
            <div><small>End</small><b>{clock(trim.end)}</b></div>
            <div><small>Length</small><b>{clock(cutLength)}</b></div>
          </div>
          <p className="cmp-hint">
            {draft.duration > maxSeconds + 0.5
              ? `Your video is ${clock(draft.duration).replace(/\.\d$/, "")} long. ${formLabel} can be up to ${maxLabel}, so slide the window to the part you want.`
              : `Drag the edges to cut it shorter, or leave it as it is. ${formLabel} run ${minLabel} to ${maxLabel}.`}
          </p>
          <div className="cmp-trim-actions">
            <button type="button" className="cmp-mini" onClick={() => { closeDraft(); setMsg(""); }} disabled={busy}>Cancel</button>
            <button type="button" className="cmp-mini solid" onClick={confirmTrim} disabled={busy}>{busy ? "Preparing…" : "Use this clip"}</button>
          </div>
        </div>
      )}

      {mode === "upload" && video?.kind === "storage" && (
        <div className="cmp-video">
          <video src={video.previewUrl} controls muted playsInline />
          <div className="cmp-upload-row">
            <div>
              <b>{video.name}</b>
              <small>
                {mb(video.size)} &middot; {Math.round(video.duration)}s
                {video.aspect ? ` · ${aspectLabel(video.width, video.height)}` : ""}
                {video.trimmed ? " · trimmed" : ""}
              </small>
            </div>
            <button type="button" className="cmp-mini" onClick={() => { abortRef.current?.(); setVideo(null); setPoster([]); }}>
              {video.status === "uploading" ? "Cancel" : "Remove"}
            </button>
          </div>
          <div className={`cmp-progress ${video.status}`} role="progressbar" aria-valuenow={Math.round(video.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${Math.round(video.progress * 100)}%` }} />
          </div>
          <p className={`cmp-hint${video.status === "error" ? " bad" : ""}`}>
            {video.status === "uploading" && video.phase === "compress" && `${video.trimmed ? "Cutting and compressing" : "Compressing"} ${Math.round(video.progress * 100)}%. Keep this tab open. You can keep filling in details.`}
            {video.status === "uploading" && video.phase !== "compress" && `Uploading ${Math.round(video.progress * 100)}%. You can keep filling in details.`}
            {video.status === "ready" && (video.finalSize && video.finalSize < video.size * 0.95
              ? `Compressed ${mb(video.size)} to ${mb(video.finalSize)} and uploaded. Ready to post.`
              : "Uploaded and ready to post.")}
            {video.status === "error" && (video.error || "Upload failed.")}
          </p>
        </div>
      )}

      {mode === "youtube" && (
        <>
          <input className="cmp-input" inputMode="url" value={yt} placeholder="Paste a youtube.com or youtu.be link" onChange={(e) => onYouTube(e.target.value)} aria-label="YouTube link" />
          {video?.kind === "youtube" && (
            <div className="cmp-yt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${video.ytId}/hqdefault.jpg`} alt="" />
              <span>Linked. It will play right in your post.</span>
            </div>
          )}
          {yt && !video && <p className="cmp-hint bad">That doesn’t look like a YouTube link yet.</p>}
        </>
      )}
    </Field>
  );
}
