"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, inspectVideo, uploadVideo } from "@/components/composer/imageTools";
import { canCompressVideo, maxSourceMB } from "@/lib/video-compress";
import {
  ADS_FREE_WHILE_TESTING, CTA_OPTIONS, IMAGE_MAX_BYTES, LIMITS, PLACEMENTS, VIDEO_MAX_MB, VIDEO_MAX_SECONDS,
  AD_RATES, cleanUrl, quote, usd,
} from "@/lib/ads";
import { AdCardView, AdRowView } from "./AdViews";
import BudgetPicker from "./BudgetPicker";
import { SAMPLE_AD, adsApi, imageSize } from "./adsApi";

// The Create ad wizard (and the Edit screen, which skips format and budget).
// Left: the steps. Right: a live preview that uses the real ad components.

const STEPS = {
  create: [["format", "Format"], ["creative", "Creative"], ["details", "Details"], ["places", "Placement"], ["pay", "Budget & pay"]],
  edit: [["creative", "Creative"], ["details", "Details"], ["places", "Placement"]],
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export default function AdForm({ mode = "create", ad = null, onDone, onToast }) {
  const steps = STEPS[mode];
  const [step, setStep] = useState(0);
  const [type, setType] = useState(ad?.type || "image");
  const [f, setF] = useState({
    name: ad?.name || "", title: ad?.title || "", description: ad?.description || "",
    cta: ad?.cta || "Learn more", link: ad?.link || "", placements: ad?.placements || ["feed", "community", "messages"],
  });
  // image: { src (what the preview shows), data (new upload as data URL), url (pasted), w, h }
  const [img, setImg] = useState(ad ? { src: ad.media.src, data: "", url: ad.imageUrl || "", w: ad.media.w, h: ad.media.h } : { src: "", data: "", url: "", w: 0, h: 0 });
  const [imgMode, setImgMode] = useState(ad && ad.imageUrl ? "url" : "upload");
  const [vid, setVid] = useState({ file: null, preview: "", duration: 0, adId: "", progress: 0 });
  const [budget, setBudget] = useState(2000);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [prev, setPrev] = useState("feed");
  const [drag, setDrag] = useState(false);
  const abort = useRef(null);
  const fileIn = useRef(null);
  const vidIn = useRef(null);

  useEffect(() => () => { abort.current?.(); if (vid.preview) URL.revokeObjectURL(vid.preview); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr(""); };
  const cur = steps[step][0];
  const q = quote(type, budget);

  // ---- creative handlers -------------------------------------------------
  async function pickImage(file) {
    if (!file) return;
    setErr(""); setBusy("image");
    try {
      const { data, width, height } = await compressImage(file, { max: 1280, maxBytes: IMAGE_MAX_BYTES });
      setImg({ src: data, data, url: "", w: width, h: height });
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }
  async function pickVideo(file) {
    if (!file) return;
    setErr("");
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) return setErr("Use an MP4, MOV or WebM video.");
    const cap = maxSourceMB(VIDEO_MAX_MB);
    if (file.size > cap * 1024 * 1024) return setErr(`Videos can be at most ${cap >= 1024 ? `${cap / 1024} GB` : `${cap} MB`}.`);
    setBusy("video");
    try {
      const info = await inspectVideo(file);
      if (info.duration > VIDEO_MAX_SECONDS + 0.5) {
        URL.revokeObjectURL(info.previewUrl);
        return setErr(`That video is ${mmss(info.duration)} long. Video ads can be at most ${VIDEO_MAX_SECONDS} seconds.`);
      }
      if (vid.preview) URL.revokeObjectURL(vid.preview);
      const size = await imageSize(info.poster);
      setVid({ file, preview: info.previewUrl, duration: info.duration, adId: "", progress: 0 });
      setImg({ src: info.poster, data: info.poster, url: "", w: size.w, h: size.h });
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }
  function changeUrl(value) {
    setImg((s) => ({ ...s, url: value, src: "", data: "", w: 0, h: 0 }));
    setErr("");
  }
  function checkUrl() {
    const u = cleanUrl(img.url);
    if (!u) return setErr("Paste a full image link, like https://site.com/ad.jpg");
    if (!u.startsWith("https://")) return setErr("Image links must start with https://");
    setErr("");
    setBusy("image");
    const probe = new Image();
    probe.onload = () => { setImg((s) => ({ ...s, url: u, src: u, w: probe.naturalWidth, h: probe.naturalHeight })); setBusy(""); };
    probe.onerror = () => { setBusy(""); setErr("We couldn’t load that image. Check the link opens a picture."); };
    probe.referrerPolicy = "no-referrer";
    probe.src = u;
  }

  // ---- step gating -----------------------------------------------------------
  function problem(which) {
    if (which === "creative") {
      if (type === "video" && !vid.file && !ad) return "Add your video (up to 30 seconds).";
      if (type === "image" && !img.src) return imgMode === "url" ? "Paste your image link and tap “Use this image”." : "Upload an image for your ad.";
    }
    if (which === "details") {
      if (f.name.trim().length < 2) return "Give the ad a name (only you see it).";
      if (f.title.trim().length < 3) return "Add a headline of at least 3 characters.";
      if (!cleanUrl(f.link)) return "Enter a valid destination link, like https://yoursite.com";
    }
    if (which === "places" && f.placements.length === 0) return "Choose at least one place for your ad to show.";
    return "";
  }
  function next() {
    const p = problem(cur);
    if (p) return setErr(p);
    setErr("");
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }
  function jump(i) {
    if (i > step) { for (let k = step; k < i; k += 1) { const p = problem(steps[k][0]); if (p) return setErr(p); } }
    setErr(""); setStep(i);
  }

  // ---- submit -------------------------------------------------------------------
  async function submit() {
    for (const [s] of steps) { const p = problem(s); if (p) { setErr(p); setStep(steps.findIndex(([k]) => k === s)); return; } }
    setErr("");
    try {
      const copy = { name: f.name, title: f.title, description: f.description, cta: f.cta, link: f.link, placements: f.placements };
      const image = img.data ? { imageData: img.data, imgW: img.w, imgH: img.h } : type === "image" ? { imageUrl: img.url, imgW: img.w, imgH: img.h } : {};
      if (mode === "edit") {
        setBusy("save");
        const body = { id: ad.id, ...copy, ...(img.data ? { imageData: img.data, imgW: img.w, imgH: img.h } : type === "image" && img.url && img.url !== ad.imageUrl ? { imageUrl: img.url } : {}) };
        const r = await adsApi("update", body);
        onToast?.("Changes saved. They’re live now.");
        return onDone(r);
      }
      let adId = vid.adId;
      if (type === "video" && !adId) {
        setBusy("upload");
        const up = uploadVideo(vid.file, { endpoint: "/api/ads/upload", onProgress: (p) => setVid((s) => ({ ...s, progress: p })) });
        abort.current = up.abort;
        const res = await up.promise;
        adId = res.storageId;
        setVid((s) => ({ ...s, adId, progress: 1 }));
      }
      setBusy("pay");
      const r = await adsApi("create", { ...copy, ...image, type, budgetCents: budget, ...(type === "video" ? { adId, durationSec: vid.duration } : {}) });
      onToast?.(ADS_FREE_WHILE_TESTING ? "Your ad is live! (Test mode: no charge.)" : "Payment received. Your ad is live!");
      onDone(r);
    } catch (e) {
      if (e.message !== "cancelled") setErr(e.message);
    } finally { setBusy(""); abort.current = null; }
  }

  // ---- preview ad ------------------------------------------------------------------
  const preview = {
    ...SAMPLE_AD,
    type,
    title: f.title || SAMPLE_AD.title,
    description: f.description || (f.title ? "" : SAMPLE_AD.description),
    cta: f.cta,
    link: cleanUrl(f.link) || SAMPLE_AD.link,
    media: type === "video" && vid.preview
      ? { kind: "video", src: img.src, video: vid.preview, w: img.w, h: img.h }
      : { kind: "image", src: img.src || SAMPLE_AD.media.src, w: img.src ? img.w : 1200, h: img.src ? img.h : 675 },
  };
  const working = !!busy;
  const last = step === steps.length - 1;

  return (
    <div className="am-form">
      <ol className="am-steps" aria-label="Steps">
        {steps.map(([id, label], i) => (
          <li key={id}>
            <button type="button" className={i === step ? "on" : i < step ? "done" : ""} onClick={() => jump(i)} aria-current={i === step ? "step" : undefined}>
              <i>{i < step ? "✓" : i + 1}</i><span>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="am-form-grid">
        <div className="am-panel">
          {cur === "format" && (
            <>
              <h3>Choose your ad format</h3>
              <p className="am-lead">Image ads are the fastest way to start. Video ads grab more attention.</p>
              <div className="am-pick">
                {["image", "video"].map((t) => (
                  <button key={t} type="button" className={`am-pickcard${type === t ? " on" : ""}`} onClick={() => setType(t)} aria-pressed={type === t}>
                    <span className="am-pick-ic">{t === "image" ? "🖼️" : "🎬"}</span>
                    <b>{AD_RATES[t].label}</b>
                    <span className="am-pick-price">{usd(AD_RATES[t].cpmCents)}<small> / 1,000 views</small></span>
                    <small>{t === "image" ? "Any shape. Shown full size, never cropped." : `Up to ${VIDEO_MAX_SECONDS} seconds. Plays muted in the feed.`}</small>
                    <small className="am-pick-fee">+ {AD_RATES[t].extraLabel.toLowerCase()}: {usd(AD_RATES[t].fixedCents)} + {AD_RATES[t].pct}%</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {cur === "creative" && (
            <>
              <h3>{type === "video" ? "Upload your video" : "Add your image"}</h3>
              {type === "image" ? (
                <>
                  <p className="am-lead">Upload a picture or paste a link. We show it exactly as it is, just with rounded corners. Nothing gets cropped.</p>
                  <div className="am-seg" role="tablist">
                    <button type="button" role="tab" aria-selected={imgMode === "upload"} className={imgMode === "upload" ? "on" : ""} onClick={() => setImgMode("upload")}>Upload</button>
                    <button type="button" role="tab" aria-selected={imgMode === "url"} className={imgMode === "url" ? "on" : ""} onClick={() => setImgMode("url")}>Paste image URL</button>
                  </div>
                  {imgMode === "upload" ? (
                    <div className={`am-drop${drag ? " drag" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pickImage(e.dataTransfer.files?.[0]); }}>
                      {img.src && img.data ? <img src={img.src} alt="Your ad" /> : <span className="am-drop-ic">⬆</span>}
                      <b>{busy === "image" ? "Preparing image…" : img.data ? "Image ready" : "Drop an image here"}</b>
                      <small>JPG, PNG or WebP. We compress it for you.</small>
                      <button type="button" className="am-btn" onClick={() => fileIn.current?.click()} disabled={busy === "image"}>{img.data ? "Replace image" : "Choose image"}</button>
                      <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
                    </div>
                  ) : (
                    <div className="am-urlbox">
                      <label className="am-field"><span>Image URL</span>
                        <input type="url" inputMode="url" placeholder="https://yoursite.com/banner.jpg" value={img.url} onChange={(e) => changeUrl(e.target.value)} />
                      </label>
                      <button type="button" className="am-btn" onClick={checkUrl} disabled={busy === "image" || !img.url}>{busy === "image" ? "Checking…" : "Use this image"}</button>
                      {img.src && !img.data && <p className="am-ok">✓ Image loaded ({img.w} × {img.h}).</p>}
                      <p className="am-fine">The link must be public and start with https://. If the other site later removes the picture, your ad shows without it. Uploading is safer.</p>
                    </div>
                  )}
                </>
              ) : (
                mode === "edit" ? (
                  <>
                    <p className="am-lead">A live video can’t be swapped, because views and results belong to this exact video. To use a different video, create a new ad.</p>
                    <div className="am-drop"><video src={ad.media.video} poster={ad.media.src || undefined} controls playsInline muted /></div>
                  </>
                ) : (
                <>
                  <p className="am-lead">MP4, MOV or WebM, up to {VIDEO_MAX_SECONDS} seconds. We shrink it before uploading. It plays muted while it is on screen, and viewers can turn sound on.</p>
                  <div className="am-drop">
                    {vid.preview ? <video src={vid.preview} poster={img.src} controls playsInline muted /> : <span className="am-drop-ic">🎬</span>}
                    <b>{busy === "video" ? "Reading video…" : vid.file ? `${vid.file.name.slice(0, 34)} · ${mmss(vid.duration)}` : "No video yet"}</b>
                    <small>{vid.file ? "Cover picture taken from the video." : `Maximum ${VIDEO_MAX_SECONDS} seconds.`}</small>
                    <button type="button" className="am-btn" onClick={() => vidIn.current?.click()} disabled={busy === "video"}>{vid.file ? "Replace video" : "Choose video"}</button>
                    <input ref={vidIn} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => { pickVideo(e.target.files?.[0]); e.target.value = ""; }} />
                  </div>
                </>
                )
              )}
            </>
          )}

          {cur === "details" && (
            <>
              <h3>Write your ad</h3>
              <p className="am-lead">Short and clear works best. Fans decide in a second.</p>
              <label className="am-field"><span>Ad name <em>only you see this</em></span>
                <input value={f.name} maxLength={LIMITS.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Winter launch, banner 1" />
              </label>
              <label className="am-field"><span>Headline</span>
                <input value={f.title} maxLength={LIMITS.title} onChange={(e) => set("title", e.target.value)} placeholder="What are you promoting?" />
                <small>{f.title.length}/{LIMITS.title}</small>
              </label>
              <label className="am-field"><span>Description <em>optional</em></span>
                <textarea rows={3} value={f.description} maxLength={LIMITS.description} onChange={(e) => set("description", e.target.value)} placeholder="One friendly sentence about your offer." />
                <small>{f.description.length}/{LIMITS.description}</small>
              </label>
              <div className="am-field"><span>Button</span>
                <div className="am-chips wrap" role="radiogroup" aria-label="Button label">
                  {CTA_OPTIONS.map((c) => <button key={c} type="button" role="radio" aria-checked={f.cta === c} className={`am-chip${f.cta === c ? " on" : ""}`} onClick={() => set("cta", c)}>{c}</button>)}
                </div>
              </div>
              <label className="am-field"><span>Where should the ad go?</span>
                <input type="url" inputMode="url" value={f.link} maxLength={LIMITS.link} onChange={(e) => set("link", e.target.value)} placeholder="https://yourwebsite.com/offer" />
                <small>Opens in a new tab when someone taps the ad.</small>
              </label>
            </>
          )}

          {cur === "places" && (
            <>
              <h3>Where should your ad appear?</h3>
              <p className="am-lead">Pick one or all. You can change this any time, even while the ad is live.</p>
              <div className="am-places">
                {PLACEMENTS.map((p) => {
                  const on = f.placements.includes(p.id);
                  return (
                    <button key={p.id} type="button" className={`am-place${on ? " on" : ""}`} aria-pressed={on} onClick={() => set("placements", on ? f.placements.filter((x) => x !== p.id) : [...f.placements, p.id])}>
                      <span className="am-check">{on ? "✓" : ""}</span>
                      <span><b>{p.label}</b><small>{p.note}</small><em>{p.format}</em></span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {cur === "pay" && (
            <>
              <h3>Set your budget</h3>
              <p className="am-lead">Type an amount or drag the slider. You pay once for exactly the views you want.</p>
              <BudgetPicker type={type} cents={budget} onChange={setBudget} />
            </>
          )}

          {busy === "upload" && <div className="am-progress" role="status"><i style={{ width: `${Math.round(vid.progress * 100)}%` }} /><span>{canCompressVideo() && vid.progress < 0.75 ? "Compressing" : "Uploading"} video… {Math.round(vid.progress * 100)}%</span></div>}
          {err && <p className="am-err" role="alert">{err}</p>}

          <div className="am-nav">
            {step > 0 && <button type="button" className="am-btn ghost" onClick={() => { setErr(""); setStep(step - 1); }} disabled={working}>Back</button>}
            {!last ? (
              <button type="button" className="am-btn solid" onClick={next} disabled={working}>Continue</button>
            ) : (
              <button type="button" className="am-btn solid pay" onClick={submit} disabled={working}>
                {busy === "upload" ? "Uploading…" : busy === "pay" ? "Launching…" : busy === "save" ? "Saving…" : mode === "edit" ? "Save changes" : `Pay ${usd(q.totalCents)} & launch`}
              </button>
            )}
          </div>
        </div>

        <aside className="am-preview" aria-label="Live preview">
          <div className="am-preview-head">
            <b>Live preview</b>
            <div className="am-seg small">
              <button type="button" className={prev === "feed" ? "on" : ""} onClick={() => setPrev("feed")}>Feed</button>
              <button type="button" className={prev === "chat" ? "on" : ""} onClick={() => setPrev("chat")}>Chat</button>
            </div>
          </div>
          <div className={`am-preview-stage${prev === "chat" ? " chat" : ""}`}>
            {prev === "feed" ? <AdCardView ad={preview} preview /> : <AdRowView ad={preview} preview />}
          </div>
          <p className="am-fine">{prev === "feed" ? "How it looks in the home feed and in communities." : "How it looks inside chats: a compact row. Only the title and link are tappable."}</p>
          {type === "video" && prev === "chat" && <p className="am-fine">Video ads show their cover picture in chats.</p>}
        </aside>
      </div>
    </div>
  );
}
