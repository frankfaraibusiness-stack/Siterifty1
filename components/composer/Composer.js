"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PostCard from "../PostCard";
import TypeIcon from "./TypeIcon";
import SettingsStep from "./SettingsStep";
import { PollForm, PostForm, TheoryForm, TypeHero, VideoForm } from "./forms";
import {
  TYPES,
  VERDICT_OPTIONS,
  confidenceLabel,
  emptyDraft,
  validateDraft,
} from "@/lib/post-schema";

const STEPS = ["Format", "Create", "Settings", "Review"];
const DRAFT_KEY = "gta6fb:composer-draft:v1";
const CREATE_KEYS = ["title", "text", "media", "options", "tags", "location"];

// Text-only fields are autosaved. Photos and videos are too big for
// localStorage, so those have to be re-added after a restore.
function persistable(d) {
  const { type, title, text, tags, location, poll, theory, settings, publishAt } = d;
  return { type, title, text, tags, location, poll, theory, settings, publishAt };
}
function hasContent(d) {
  return !!(d.title || d.text || d.tags.length || d.poll.options.some((o) => o.trim()));
}

function buildPreview(d, user, theme) {
  const t = d.type;
  let media = null;
  if ((t === "post" || t === "theory") && d.images.length) {
    media = { type: "images", count: d.images.length, alts: d.images.map((i) => i.alt), preview: d.images.map((i) => i.data) };
  } else if (t === "video" && d.video) {
    media =
      d.video.kind === "youtube"
        ? { type: "video", kind: "youtube", ytId: d.video.ytId }
        : { type: "video", kind: "storage", preview: { src: d.video.previewUrl, poster: d.images[0]?.data } };
  }
  const filled = d.poll.options.map((o) => o.trim()).filter(Boolean);
  const zeros = (n) => Array(n).fill(0);
  let poll = null;
  if (t === "poll") {
    const options = filled.length >= 2 ? filled : ["Option one", "Option two"];
    poll = { kind: "poll", options, multi: d.poll.multi && options.length > 2, endsAtMs: Date.now() + d.poll.hours * 3_600_000, counts: zeros(options.length), voters: 0, mine: [] };
  } else if (t === "theory") {
    poll = { kind: "verdict", options: VERDICT_OPTIONS, multi: false, endsAtMs: null, counts: [0, 0], voters: 0, mine: [] };
  }
  const placeholder = { post: "Your title", video: "Your title", poll: "Your question", theory: "Your theory title" }[t];
  return {
    id: "preview",
    type: t,
    user: user.username,
    initial: user.username.charAt(0).toUpperCase(),
    avatarA: theme.a,
    avatarB: theme.b,
    location: d.location,
    timeAgo: "just now",
    scheduled: !!d.publishAt && Date.parse(d.publishAt) > Date.now() + 30_000,
    title: d.title || placeholder,
    text: d.text,
    tags: d.tags,
    tag: d.tags.length ? d.tags.map((x) => `#${x}`).join(" ") : null,
    media,
    poll,
    theory: { confidence: d.theory.confidence },
    settings: { ...d.settings, allowShare: d.settings.allowShare && d.settings.visibility === "public" },
    isOwner: true,
    likedByMe: false,
    savedByMe: false,
    likesCount: 0,
    comments: 0,
    shares: 0,
  };
}

export default function Composer({ user, theme, initialType, videoUploads }) {
  const [step, setStep] = useState(initialType ? 1 : 0);
  const [d, setD] = useState(() => emptyDraft(initialType));
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [saved, setSaved] = useState(null);
  const abortRef = useRef(null);
  const top = useRef(null);

  const set = useCallback((patch) => setD((cur) => ({ ...cur, ...patch })), []);
  const setVideo = useCallback(
    (v) => setD((cur) => ({ ...cur, video: typeof v === "function" ? v(cur.video) : v })),
    []
  );

  const errors = useMemo(() => validateDraft(d), [d]);
  const createErrors = CREATE_KEYS.filter((k) => errors[k]);
  const shown = showErrors ? errors : {};

  // Offer to restore an autosaved draft (once, on arrival).
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (raw?.draft && hasContent(raw.draft) && (!initialType || raw.draft.type === initialType)) {
        setSaved(raw);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [initialType]);

  // Debounced autosave.
  useEffect(() => {
    if (done || !d.type || !hasContent(d)) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), draft: persistable(d) }));
      } catch {
        // Storage can be unavailable (private mode); autosave just skips.
      }
    }, 600);
    return () => clearTimeout(t);
  }, [d, done]);

  // Warn before leaving with unsaved media or text.
  useEffect(() => {
    if (done) return;
    const dirty = hasContent(d) || d.images.length > 0 || d.video;
    const warn = (e) => dirty && (e.preventDefault(), (e.returnValue = ""));
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [d, done]);

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [step, done]);

  function chooseType(type) {
    abortRef.current?.();
    setD((cur) =>
      cur.type === type
        ? cur
        : { ...emptyDraft(type), title: cur.title, text: cur.text, tags: cur.tags, location: cur.location, settings: cur.settings, publishAt: cur.publishAt }
    );
    setShowErrors(false);
    setStep(1);
  }

  function restore() {
    const r = saved.draft;
    abortRef.current?.();
    setD({ ...emptyDraft(r.type), ...r, images: [], video: null });
    setSaved(null);
    setStep(1);
  }

  function next() {
    if (step === 1 && createErrors.length) {
      setShowErrors(true);
      requestAnimationFrame(() =>
        document.querySelector("[data-error]")?.scrollIntoView({ block: "center", behavior: "smooth" })
      );
      return;
    }
    if (step === 2 && errors.publishAt) return setShowErrors(true);
    setShowErrors(false);
    setStep(step + 1);
  }

  async function publish() {
    setError("");
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return setStep(1);
    }
    setBusy(true);
    const draft = {
      ...d,
      images: d.images.map(({ data, alt }) => ({ data, alt })),
      video: d.video
        ? d.video.kind === "youtube"
          ? { kind: "youtube", ytId: d.video.ytId }
          : { kind: "storage", storageId: d.video.storageId, duration: d.video.duration }
        : null,
    };
    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn’t publish right now. Try again.");
        if (data.fields) {
          setShowErrors(true);
          setStep(1);
        }
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      setDone(data);
    } catch {
      setError("You appear to be offline. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const theme$ = d.type ? TYPES[d.type] : { a: theme.a, b: theme.b };
  const preview = useMemo(
    () => (d.type ? buildPreview(d, user, theme) : null),
    [d, user, theme]
  );
  const previewKey = d.type
    ? [d.type, d.settings.spoiler, d.poll.options.join("¦"), d.poll.multi, d.poll.hours, d.images.length, d.video?.ytId || d.video?.previewUrl || ""].join("|")
    : "";

  if (done) {
    return (
      <main className="cmp" style={{ "--a": theme$.a, "--b": theme$.b }}>
        <div className="cmp-done" ref={top}>
          <span className="cmp-done-ring"><TypeIcon type={d.type} size={34} /></span>
          <h1>{done.scheduled ? "Scheduled." : "You’re live."}</h1>
          <p>
            {done.scheduled
              ? `Your ${TYPES[d.type].label.toLowerCase()} goes live ${new Date(done.goesLiveAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`
              : `Your ${TYPES[d.type].label.toLowerCase()} is in the feed. Leonida is watching.`}
          </p>
          <div className="cmp-done-actions">
            <Link className="cmp-btn primary" href={`/p/${done.id}`}>View post</Link>
            <Link className="cmp-btn ghost" href="/">Back to the feed</Link>
            <button className="cmp-btn ghost" onClick={() => window.location.assign("/create")}>Create another</button>
          </div>
        </div>
      </main>
    );
  }

  const summary = [
    d.settings.visibility === "private" ? "Only you" : "Everyone",
    d.settings.comments ? "Comments on" : "Comments off",
    d.settings.hideLikes && "Likes hidden",
    d.settings.allowShare && d.settings.visibility === "public" ? "Sharing on" : "Sharing off",
    d.settings.spoiler && "Spoiler cover",
    d.settings.pinned && "Pinned",
    d.publishAt ? `Goes live ${new Date(d.publishAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : "Posts now",
  ].filter(Boolean);

  const formProps = { d, set, e: shown, setVideo, abortRef, uploads: videoUploads };
  const Form = { post: PostForm, video: VideoForm, poll: PollForm, theory: TheoryForm }[d.type];
  const uploading = d.video?.status === "uploading";

  return (
    <main className="cmp" data-type={d.type || "none"} style={{ "--a": theme$.a, "--b": theme$.b }}>
      <div className="cmp-glow" aria-hidden="true" />
      <div ref={top} />

      <nav className="cmp-steps" aria-label="Progress">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`${i === step ? "now" : ""}${i < step ? " past" : ""}`}
            disabled={i >= step}
            aria-current={i === step ? "step" : undefined}
            onClick={() => setStep(i)}
          >
            <i />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {saved && step <= 1 && (
        <div className="cmp-restore" role="status">
          <span>
            You have a saved {TYPES[saved.draft.type]?.label.toLowerCase()} draft from{" "}
            {new Date(saved.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.
          </span>
          <button className="cmp-mini solid" onClick={restore}>Restore</button>
          <button className="cmp-mini" onClick={() => { localStorage.removeItem(DRAFT_KEY); setSaved(null); }}>Discard</button>
        </div>
      )}

      <div className={`cmp-layout${step >= 1 ? " split" : ""}`}>
        <section className="cmp-main">
          {step === 0 && (
            <>
              <h1 className="cmp-title">What are you posting?</h1>
              <p className="cmp-sub">Pick a format. Each one has its own tools built for the fanbase.</p>
              <div className="cmp-types">
                {Object.values(TYPES).map((t) => (
                  <button key={t.id} type="button" className="cmp-type" style={{ "--a": t.a, "--b": t.b }} onClick={() => chooseType(t.id)}>
                    <span className="cmp-type-art" aria-hidden="true">
                      <span className="cmp-type-ico"><TypeIcon type={t.id} size={26} /></span>
                    </span>
                    <strong>{t.label}</strong>
                    <span>{t.blurb}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && d.type && (
            <>
              <h1 className="cmp-title">Make it count</h1>
              <TypeHero type={d.type} />
              <Form {...formProps} />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="cmp-title">Your rules</h1>
              <p className="cmp-sub">Decide who sees it, how people can join in and when it goes live.</p>
              <SettingsStep d={d} set={set} errors={shown} />
            </>
          )}

          {step === 3 && preview && (
            <>
              <h1 className="cmp-title">Ready to drop?</h1>
              <p className="cmp-sub">This is exactly how it will look in the feed.</p>
              <div className="cmp-review-card">
                <PostCard key={previewKey} post={preview} preview />
              </div>
              <ul className="cmp-summary">
                {summary.map((s) => <li key={s}>{s}</li>)}
                {d.type === "theory" && <li>{confidenceLabel(d.theory.confidence)}</li>}
              </ul>
              <div className="cmp-edit-links">
                <button className="cmp-link" onClick={() => setStep(1)}>Edit details</button>
                <button className="cmp-link" onClick={() => setStep(2)}>Edit settings</button>
              </div>
              {error && <p className="cmp-error banner" role="alert">{error}</p>}
            </>
          )}
        </section>

        {step >= 1 && step <= 2 && preview && (
          <aside className="cmp-aside" aria-label="Live preview">
            <div className="cmp-aside-in">
              <h2>Live preview</h2>
              <PostCard key={previewKey} post={preview} preview />
            </div>
          </aside>
        )}
      </div>

      {step > 0 && (
        <div className="cmp-bar">
          <div className="cmp-bar-in">
            <button className="cmp-btn ghost" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>
            {step < 3 ? (
              <button className="cmp-btn primary" onClick={next} disabled={uploading && step === 1}>
                {uploading && step === 1 ? `Uploading ${Math.round(d.video.progress * 100)}%` : "Continue"}
              </button>
            ) : (
              <button className="cmp-btn primary" onClick={publish} disabled={busy}>
                {busy ? "Publishing..." : d.publishAt ? "Schedule post" : "Publish"}
              </button>
            )}
          </div>
          {showErrors && step === 1 && createErrors.length > 0 && (
            <p className="cmp-bar-hint" role="alert">{errors[createErrors[0]]}</p>
          )}
        </div>
      )}
    </main>
  );
}
