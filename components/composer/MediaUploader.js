"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "./ui";
import TypeIcon from "./TypeIcon";
import { compressImage, inspectVideo, uploadVideo } from "./imageTools";
import { LIMITS, VIDEO_TYPES, parseYouTube } from "@/lib/post-schema";

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

// Upload (Firebase Storage, when enabled) or link YouTube.
export function VideoPicker({ video, setVideo, setPoster, abortRef, uploads, error }) {
  const [mode, setMode] = useState(video?.kind === "youtube" || !uploads ? "youtube" : "upload");
  const [msg, setMsg] = useState("");
  const [yt, setYt] = useState(video?.url || "");
  const input = useRef(null);

  const switchMode = (m) => {
    if (m === mode) return;
    abortRef.current?.();
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
    if (file.size > LIMITS.videoMB * 1024 * 1024) return setMsg(`That video is over ${LIMITS.videoMB} MB.`);
    let info;
    try {
      info = await inspectVideo(file);
    } catch (e) {
      return setMsg(e.message);
    }
    if (info.duration > LIMITS.videoSeconds) {
      return setMsg(`Clips can be up to ${LIMITS.videoSeconds / 60} minutes.`);
    }
    abortRef.current?.();
    const token = Date.now();
    const patch = (p) => setVideo((v) => (v && v.token === token ? { ...v, ...p } : v));
    setVideo({
      kind: "storage", token, status: "uploading", progress: 0,
      name: file.name, size: file.size, previewUrl: info.previewUrl, duration: info.duration,
    });
    setPoster([{ data: info.poster, alt: "" }]);

    const up = uploadVideo(file, { onProgress: (p) => patch({ progress: p }) });
    abortRef.current = up.abort;
    up.promise
      .then((r) => patch({ status: "ready", progress: 1, storageId: r.storageId }))
      .catch((e) => e.message !== "cancelled" && patch({ status: "error", error: e.message }));
  }

  function onYouTube(value) {
    setYt(value);
    const id = parseYouTube(value);
    setVideo(id ? { kind: "youtube", ytId: id, url: value } : null);
  }

  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

  return (
    <Field label="Video" error={error || msg}>
      <div className="cmp-seg" role="tablist" aria-label="Video source">
        <button type="button" role="tab" aria-selected={mode === "upload"} className={mode === "upload" ? "on" : ""} onClick={() => switchMode("upload")}>Upload</button>
        <button type="button" role="tab" aria-selected={mode === "youtube"} className={mode === "youtube" ? "on" : ""} onClick={() => switchMode("youtube")}>YouTube link</button>
      </div>

      {mode === "upload" && !uploads && (
        <div className="cmp-note">
          Video uploads aren’t switched on for this site yet. Add a Firebase Storage
          bucket to enable them, or paste a YouTube link instead.
        </div>
      )}

      {mode === "upload" && uploads && !video && (
        <button type="button" className="cmp-drop" onClick={() => input.current?.click()}>
          <span className="cmp-drop-ico"><TypeIcon type="video" size={26} /></span>
          <strong>Choose a video</strong>
          <span>MP4, MOV or WebM &middot; up to {LIMITS.videoMB} MB &middot; {LIMITS.videoSeconds / 60} min</span>
        </button>
      )}
      <input ref={input} type="file" accept={VIDEO_TYPES.join(",")} hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} />

      {mode === "upload" && video?.kind === "storage" && (
        <div className="cmp-video">
          <video src={video.previewUrl} controls muted playsInline />
          <div className="cmp-upload-row">
            <div>
              <b>{video.name}</b>
              <small>{mb(video.size)} &middot; {Math.round(video.duration)}s</small>
            </div>
            <button type="button" className="cmp-mini" onClick={() => { abortRef.current?.(); setVideo(null); setPoster([]); }}>
              {video.status === "uploading" ? "Cancel" : "Remove"}
            </button>
          </div>
          <div className={`cmp-progress ${video.status}`} role="progressbar" aria-valuenow={Math.round(video.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${Math.round(video.progress * 100)}%` }} />
          </div>
          <p className={`cmp-hint${video.status === "error" ? " bad" : ""}`}>
            {video.status === "uploading" && `Uploading ${Math.round(video.progress * 100)}%. You can keep filling in details.`}
            {video.status === "ready" && "Uploaded and ready to post."}
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
