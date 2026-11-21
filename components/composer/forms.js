"use client";

import { Field, Segmented, TagPicker, TextInput, Toggle } from "./ui";
import { ImageUploader, VideoPicker } from "./MediaUploader";
import TypeIcon from "./TypeIcon";
import LocationPicker from "./LocationPicker";
import AdSettings from "./AdSettings";
import Link from "next/link";
import { LIMITS, POLL_LENGTHS, TYPES, VIDEO_FORMS, confidenceLabel, isVideoForm, lengthLabel } from "@/lib/post-schema";
import { LONG_FORM_PLAN, canUploadLongForm, getPlan } from "@/lib/plans";

const TIPS = {
  post: "Lead with your best shot. Alt text makes it readable for everyone.",
  video: "Short clips travel furthest. The first frame becomes the cover.",
  poll: "Short, punchy options get more votes than long ones.",
  theory: "Show your evidence. The crew votes Facts or Cap on every theory.",
  event: "Pin the spot, set the time and choose who can join. A clear meeting spot gets more people through the door.",
};

export function TypeHero({ type }) {
  const t = TYPES[type];
  return (
    <div className="cmp-hero">
      <span className="cmp-hero-ico"><TypeIcon type={type} size={26} /></span>
      <div>
        <h2>{t.label}</h2>
        <p>{TIPS[type]}</p>
      </div>
    </div>
  );
}

function LocationField({ value, onChange, error }) {
  return (
    <Field label="Location" error={error}>
      <LocationPicker value={value} onChange={onChange} error={error} />
    </Field>
  );
}

function Common({ d, set, e }) {
  return (
    <>
      <LocationField value={d.location} onChange={(v) => set({ location: v })} error={e.location} />
      <TagPicker tags={d.tags} onChange={(tags) => set({ tags })} error={e.tags} />
    </>
  );
}

export function PostForm({ d, set, e }) {
  return (
    <>
      <ImageUploader images={d.images} onChange={(images) => set({ images })} max={LIMITS.images} error={e.media} />
      <TextInput label="Title" value={d.title} max={LIMITS.title} error={e.title} placeholder="Give it a headline worth stopping for" onChange={(title) => set({ title })} />
      <TextInput label="Description" multiline value={d.text} max={LIMITS.text} error={e.text} placeholder="Tell the story behind the shot" onChange={(text) => set({ text })} />
      <Common d={d} set={set} e={e} />
    </>
  );
}

function ShortsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="2.5" width="10" height="19" rx="2.6" />
      <path d="M10.6 9.2v5.6l4.4-2.8-4.4-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LongIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.6" />
      <path d="M10.2 9.4v5.2l4.6-2.6-4.6-2.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.4" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

// The first thing anyone sees when they post a video: pick Shorts or Long form.
function VideoFormatCards({ onChoose, canLong, error }) {
  const longPlan = getPlan(LONG_FORM_PLAN).name;
  return (
    <Field label="Pick a video format" error={error} hint="You can change this before you post.">
      <div className="vf-cards">
        <button type="button" className="vf-card vf-short" onClick={() => onChoose("short")}>
          <span className="vf-ico"><ShortsIcon /></span>
          <strong>Shorts</strong>
          <span className="vf-len">{lengthLabel(VIDEO_FORMS.short.minSeconds)} to {lengthLabel(VIDEO_FORMS.short.maxSeconds)}</span>
          <ul>
            <li>Quick clips that travel furthest</li>
            <li>Open to every plan</li>
            <li>Can’t be monetized</li>
          </ul>
          <span className="vf-go">Choose Shorts</span>
        </button>

        {canLong ? (
          <button type="button" className="vf-card vf-long" onClick={() => onChoose("long")}>
            <span className="vf-ico"><LongIcon /></span>
            <strong>Long form</strong>
            <span className="vf-len">{lengthLabel(VIDEO_FORMS.long.minSeconds)} to {lengthLabel(VIDEO_FORMS.long.maxSeconds)}</span>
            <ul>
              <li>Room for tutorials, trailer breakdowns and deep dives</li>
              <li>Monetization on or off, your choice</li>
              <li>Included with {longPlan}</li>
            </ul>
            <span className="vf-go">Choose Long form</span>
          </button>
        ) : (
          <div className="vf-card vf-long is-locked">
            <span className="vf-ico"><LongIcon /></span>
            <strong>
              Long form <span className="vf-lock"><LockIcon />{longPlan}</span>
            </strong>
            <span className="vf-len">{lengthLabel(VIDEO_FORMS.long.minSeconds)} to {lengthLabel(VIDEO_FORMS.long.maxSeconds)}</span>
            <ul>
              <li>Room for tutorials, trailer breakdowns and deep dives</li>
              <li>Monetization on or off, your choice</li>
              <li>Only on the {longPlan} plan</li>
            </ul>
            <Link href="/upgrade" prefetch={false} className="vf-go vf-upgrade">See {longPlan}</Link>
          </div>
        )}
      </div>
    </Field>
  );
}

export function VideoForm({ d, set, e, setVideo, abortRef, uploads, plan }) {
  const canLong = canUploadLongForm(plan);
  // A saved draft can still say Long form after a downgrade: ask again.
  const form = isVideoForm(d.videoForm) && (d.videoForm !== "long" || canLong) ? d.videoForm : null;

  const choose = (id) => set({ videoForm: id, monetize: false });
  const change = () => {
    abortRef.current?.();
    setVideo(null);
    set({ videoForm: null, monetize: false, images: [] });
  };

  if (!form) return <VideoFormatCards onChoose={choose} canLong={canLong} error={e.format} />;

  const f = VIDEO_FORMS[form];
  return (
    <>
      <div className={`vf-bar vf-bar-${form}`}>
        <span className="vf-ico sm">{form === "short" ? <ShortsIcon /> : <LongIcon />}</span>
        <span className="vf-bar-text">
          <b>{f.label}</b>
          <small>
            {lengthLabel(f.minSeconds)} to {lengthLabel(f.maxSeconds)}
            {form === "short" ? " · can’t be monetized" : ""}
          </small>
        </span>
        <button type="button" className="cmp-mini" onClick={change}>Change</button>
      </div>

      <VideoPicker
        video={d.video}
        setVideo={setVideo}
        setPoster={(images) => set({ images })}
        abortRef={abortRef}
        uploads={uploads}
        error={e.media}
        minSeconds={f.minSeconds}
        maxSeconds={f.maxSeconds}
        formLabel={f.label}
      />

      {form === "long" && d.video?.kind !== "youtube" && (
        <div className="cmp-card tight">
          <Toggle
            label="Monetize this video"
            hint={d.monetize ? "On: this video is set to earn money" : "Off: this video won’t earn money"}
            checked={!!d.monetize}
            onChange={(monetize) => set({ monetize })}
          />
        </div>
      )}
      {form === "long" && d.video?.kind !== "youtube" && d.monetize && (
        <AdSettings prefs={d.adPrefs} duration={d.video?.duration} onChange={(adPrefs) => set({ adPrefs })} />
      )}

      <TextInput label="Title" value={d.title} max={LIMITS.title} error={e.title} placeholder="Name your clip" onChange={(title) => set({ title })} />
      <TextInput label="Description" multiline value={d.text} max={LIMITS.text} error={e.text} placeholder="What should people watch for?" onChange={(text) => set({ text })} />
      <Common d={d} set={set} e={e} />
    </>
  );
}

export function PollForm({ d, set, e }) {
  const opts = d.poll.options;
  const setOpts = (options) => set({ poll: { ...d.poll, options } });
  return (
    <>
      <TextInput label="Your question" multiline rows={2} value={d.title} max={LIMITS.question} error={e.title} placeholder="Which protagonist are you rolling with?" onChange={(title) => set({ title })} />

      <Field label="Options" error={e.options} hint={`${LIMITS.pollOptions - opts.length} more allowed`}>
        <ol className="cmp-options">
          {opts.map((o, i) => (
            <li key={i}>
              <span className="cmp-option-n">{String.fromCharCode(65 + i)}</span>
              <input
                className="cmp-input"
                value={o}
                maxLength={LIMITS.option}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                onChange={(ev) => setOpts(opts.map((x, j) => (j === i ? ev.target.value : x)))}
              />
              {opts.length > 2 && (
                <button type="button" className="cmp-mini" aria-label={`Remove option ${i + 1}`} onClick={() => setOpts(opts.filter((_, j) => j !== i))}>×</button>
              )}
            </li>
          ))}
        </ol>
        {opts.length < LIMITS.pollOptions && (
          <button type="button" className="cmp-add" onClick={() => setOpts([...opts, ""])}>+ Add option</button>
        )}
      </Field>

      <Segmented
        label="Poll length"
        value={d.poll.hours}
        onChange={(hours) => set({ poll: { ...d.poll, hours } })}
        options={POLL_LENGTHS.map((p) => ({ value: p.hours, label: p.label }))}
      />
      <div className="cmp-card tight">
        <Toggle
          label="Allow multiple answers"
          hint={opts.length < 3 ? "Needs at least three options" : "Voters can pick more than one"}
          checked={d.poll.multi && opts.length > 2}
          disabled={opts.length < 3}
          onChange={(multi) => set({ poll: { ...d.poll, multi } })}
        />
      </div>

      <TextInput label="Context (optional)" multiline rows={3} value={d.text} max={LIMITS.text} error={e.text} placeholder="Add a line of backstory if the question needs it" onChange={(text) => set({ text })} />
      <Common d={d} set={set} e={e} />
    </>
  );
}

export function TheoryForm({ d, set, e }) {
  const c = d.theory.confidence;
  return (
    <>
      <TextInput label="Theory title" value={d.title} max={LIMITS.title} error={e.title} placeholder="The boat in the trailer isn’t what it seems" onChange={(title) => set({ title })} />
      <TextInput label="The theory" multiline rows={7} value={d.text} max={LIMITS.theory} error={e.text} placeholder="Walk us through your evidence, one step at a time" onChange={(text) => set({ text })} />

      <Field label="How sure are you?">
        <div className="cmp-slider">
          <input
            type="range"
            min="0"
            max="100"
            value={c}
            aria-label="Confidence"
            style={{ "--v": `${c}%` }}
            onChange={(ev) => set({ theory: { confidence: Number(ev.target.value) } })}
          />
          <div className="cmp-slider-read">
            <span>Pure cap</span>
            <b>{c}% &middot; {confidenceLabel(c)}</b>
            <span>Confirmed</span>
          </div>
        </div>
      </Field>

      <ImageUploader label="Evidence (optional)" optional images={d.images} onChange={(images) => set({ images })} max={LIMITS.evidence} />
      <Common d={d} set={set} e={e} />
    </>
  );
}
