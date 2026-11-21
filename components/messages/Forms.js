"use client";

import { useRef, useState } from "react";
import { Icon, Sheet } from "./ui";
import Select from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTime";
import {
  CHAT_LIMITS,
  CODE_KINDS,
  GAME_MODES,
  PLATFORMS,
  REGIONS,
} from "@/lib/chat-config";

// The three GTA-specific message forms (session invite, share a code,
// meet-up pin) and the photo preview. Each is a sheet and calls onSend with a
// ready-to-send payload.

function Chips({ value, onChange, options, label }) {
  return (
    <div className="ms-chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, count, max }) {
  return (
    <label className="ms-field">
      <span className="ms-field-l">
        {label}
        {max != null && <em className={count > max * 0.9 ? "warn" : ""}>{count}/{max}</em>}
      </span>
      {children}
    </label>
  );
}

// "Now" or a chosen time. Returns ms or null.
function WhenPicker({ value, onChange }) {
  const [mode, setMode] = useState(value ? "later" : "now");
  const [picked, setPicked] = useState(() => {
    if (!value) return "";
    const d = new Date(value - new Date(value).getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  });
  const min = (() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  })();
  return (
    <div className="ms-field">
      <span className="ms-field-l">When</span>
      <div className="ms-seg">
        <button type="button" className={mode === "now" ? "on" : ""} onClick={() => { setMode("now"); onChange(null); }}>
          Now / anytime
        </button>
        <button type="button" className={mode === "later" ? "on" : ""} onClick={() => setMode("later")}>
          Pick a time
        </button>
      </div>
      {mode === "later" && (
        <>
          <DateTimePicker
            min={min}
            value={picked}
            label="Date and time"
            onChange={(v) => {
              setPicked(v);
              const t = Date.parse(v);
              onChange(Number.isFinite(t) ? t : null);
            }}
          />
          <small className="ms-hint">Everyone sees it in their own time zone.</small>
        </>
      )}
    </div>
  );
}

function FormSheet({ title, onClose, onSubmit, submitLabel, disabled, busy, children }) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      size="md"
      footer={
        <div className="ms-sheet-foot">
          <button type="button" className="ms-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ms-btn go" onClick={onSubmit} disabled={disabled || busy}>
            <Icon.Send size={16} /> {busy ? "Sending…" : submitLabel}
          </button>
        </div>
      }
    >
      <div className="ms-form">{children}</div>
    </Sheet>
  );
}

export function InviteForm({ onClose, onSend }) {
  const [platform, setPlatform] = useState("ps5");
  const [mode, setMode] = useState("freeroam");
  const [code, setCode] = useState("");
  const [slots, setSlots] = useState("4");
  const [note, setNote] = useState("");
  const [startsAt, setStartsAt] = useState(null);

  return (
    <FormSheet
      title="Session invite"
      onClose={onClose}
      submitLabel="Send invite"
      onSubmit={() => {
        onSend({ type: "invite", invite: { platform, mode, code: code.trim(), slots: slots === "open" ? "open" : Number(slots), note: note.trim(), startsAt } });
        onClose();
      }}
    >
      <div className="ms-field">
        <span className="ms-field-l">Platform</span>
        <Chips value={platform} onChange={setPlatform} options={PLATFORMS} label="Platform" />
      </div>
      <div className="ms-field">
        <span className="ms-field-l">Mode</span>
        <Chips value={mode} onChange={setMode} options={GAME_MODES} label="Game mode" />
      </div>
      <div className="ms-two">
        <Field label="Lobby code" count={code.length} max={CHAT_LIMITS.inviteCode}>
          <input className="ms-input mono" value={code} maxLength={CHAT_LIMITS.inviteCode} onChange={(e) => setCode(e.target.value)} placeholder="e.g. VC-4821" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
        </Field>
        <label className="ms-field">
          <span className="ms-field-l">Players</span>
          <Select label="Players" value={slots} onChange={setSlots} options={[{ value: "open", label: "Open lobby" }, ...[2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => ({ value: String(n), label: `${n} players` }))]} />
        </label>
      </div>
      <Field label="Note (optional)" count={note.length} max={CHAT_LIMITS.note}>
        <input className="ms-input" value={note} maxLength={CHAT_LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Mics on, no griefing" />
      </Field>
      <WhenPicker value={startsAt} onChange={setStartsAt} />
    </FormSheet>
  );
}

export function CodeForm({ onClose, onSend }) {
  const [kind, setKind] = useState("lobby");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [hidden, setHidden] = useState(false);

  return (
    <FormSheet
      title="Share a code"
      onClose={onClose}
      submitLabel="Send code"
      disabled={!code.trim()}
      onSubmit={() => {
        onSend({ type: "code", code: { kind, label: label.trim(), code: code.trim(), hidden } });
        onClose();
      }}
    >
      <div className="ms-field">
        <span className="ms-field-l">What is it?</span>
        <Chips value={kind} onChange={setKind} options={CODE_KINDS} label="Code type" />
      </div>
      <Field label="Code" count={code.length} max={CHAT_LIMITS.code}>
        <input className="ms-input mono" value={code} maxLength={CHAT_LIMITS.code} onChange={(e) => setCode(e.target.value)} placeholder="Paste or type it" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
      </Field>
      <Field label="Label (optional)" count={label.length} max={CHAT_LIMITS.label}>
        <input className="ms-input" value={label} maxLength={CHAT_LIMITS.label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Friday heist crew" />
      </Field>
      <label className="ms-switch-row">
        <span>
          <b>Hide until tapped</b>
          <small>They tap “Reveal” first, handy when someone might be watching.</small>
        </span>
        <span className="ms-switch">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          <u />
        </span>
      </label>
    </FormSheet>
  );
}

export function MeetupForm({ onClose, onSend }) {
  const [region, setRegion] = useState("vice");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [startsAt, setStartsAt] = useState(null);

  return (
    <FormSheet
      title="Meet-up pin"
      onClose={onClose}
      submitLabel="Drop pin"
      disabled={!place.trim()}
      onSubmit={() => {
        onSend({ type: "meetup", meetup: { region, place: place.trim(), note: note.trim(), startsAt } });
        onClose();
      }}
    >
      <div className="ms-field">
        <span className="ms-field-l">Area</span>
        <Chips value={region} onChange={setRegion} options={REGIONS} label="Area" />
      </div>
      <Field label="Where exactly?" count={place.length} max={CHAT_LIMITS.place}>
        <input className="ms-input" value={place} maxLength={CHAT_LIMITS.place} onChange={(e) => setPlace(e.target.value)} placeholder="Ocean Drive, outside the neon diner" autoFocus />
      </Field>
      <Field label="Note (optional)" count={note.length} max={CHAT_LIMITS.note}>
        <input className="ms-input" value={note} maxLength={CHAT_LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Bring the fast car" />
      </Field>
      <WhenPicker value={startsAt} onChange={setStartsAt} />
    </FormSheet>
  );
}

// A picked photo, compressed, with an optional caption before sending.
export function PhotoPreview({ photo, onClose, onSend }) {
  const [caption, setCaption] = useState("");
  const ref = useRef(null);
  return (
    <FormSheet
      title="Send photo"
      onClose={onClose}
      submitLabel="Send"
      onSubmit={() => {
        onSend({ type: "image", data: photo.data, w: photo.width, h: photo.height, text: caption.trim() }, { localSrc: photo.data });
        onClose();
      }}
    >
      <div className="ms-photo-prev">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.data} alt="Photo to send" ref={ref} />
      </div>
      <Field label="Caption (optional)" count={caption.length} max={CHAT_LIMITS.caption}>
        <input className="ms-input" value={caption} maxLength={CHAT_LIMITS.caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption" />
      </Field>
    </FormSheet>
  );
}
