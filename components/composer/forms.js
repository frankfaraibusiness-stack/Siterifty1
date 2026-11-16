"use client";

import { Field, Segmented, TagPicker, TextInput, Toggle } from "./ui";
import { ImageUploader, VideoPicker } from "./MediaUploader";
import TypeIcon from "./TypeIcon";
import { LIMITS, LOCATIONS, POLL_LENGTHS, TYPES, confidenceLabel } from "@/lib/post-schema";

const TIPS = {
  post: "Lead with your best shot. Alt text makes it readable for everyone.",
  video: "Short clips travel furthest. The first frame becomes the cover.",
  poll: "Short, punchy options get more votes than long ones.",
  theory: "Show your evidence. The crew votes Facts or Cap on every theory.",
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
      <select className="cmp-input" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Location">
        {LOCATIONS.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
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

export function VideoForm({ d, set, e, setVideo, abortRef, uploads }) {
  return (
    <>
      <VideoPicker
        video={d.video}
        setVideo={setVideo}
        setPoster={(images) => set({ images })}
        abortRef={abortRef}
        uploads={uploads}
        error={e.media}
      />
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
