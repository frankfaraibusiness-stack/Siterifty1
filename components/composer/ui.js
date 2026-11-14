"use client";

import { useId, useState } from "react";
import { LIMITS, SUGGESTED_TAGS, normalizeTag } from "@/lib/post-schema";

export function Field({ label, count, max, error, hint, children, htmlFor }) {
  return (
    <div className={`cmp-field${error ? " has-error" : ""}`} data-error={error ? "1" : undefined}>
      <div className="cmp-label-row">
        <label htmlFor={htmlFor}>{label}</label>
        {max != null && (
          <span className={count > max * 0.9 ? "cmp-count warn" : "cmp-count"}>
            {count}/{max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="cmp-error" role="alert">{error}</p>
      ) : (
        hint && <p className="cmp-hint">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ label, value, onChange, max, error, hint, placeholder, multiline, rows = 4 }) {
  const id = useId();
  const Tag = multiline ? "textarea" : "input";
  return (
    <Field label={label} count={value.length} max={max} error={error} hint={hint} htmlFor={id}>
      <Tag
        id={id}
        className="cmp-input"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange, disabled }) {
  const id = useId();
  return (
    <div className={`cmp-row${disabled ? " is-disabled" : ""}`}>
      <label htmlFor={id} className="cmp-row-text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </label>
      <span className="cmp-switch">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <u />
      </span>
    </div>
  );
}

export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="cmp-seg-wrap">
      {label && <div className="cmp-seg-label">{label}</div>}
      <div className="cmp-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? "on" : ""}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TagPicker({ tags, onChange, error }) {
  const [text, setText] = useState("");
  const full = tags.length >= LIMITS.tags;

  function add(raw) {
    const t = normalizeTag(raw);
    if (!t || full || tags.some((x) => x.toLowerCase() === t.toLowerCase())) return setText("");
    onChange([...tags, t]);
    setText("");
  }
  const toggle = (t) => (tags.includes(t) ? onChange(tags.filter((x) => x !== t)) : add(t));

  return (
    <Field label="Tags" count={tags.length} max={LIMITS.tags} error={error}>
      {tags.length > 0 && (
        <div className="cmp-chips selected">
          {tags.map((t) => (
            <button key={t} type="button" className="cmp-chip on" onClick={() => toggle(t)} aria-label={`Remove tag ${t}`}>
              #{t} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="cmp-input"
        value={text}
        disabled={full}
        placeholder={full ? "You’ve added all five" : "Type a tag and press Enter"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        aria-label="Add a tag"
      />
      <div className="cmp-chips">
        {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
          <button key={t} type="button" className="cmp-chip" disabled={full} onClick={() => toggle(t)}>
            #{t}
          </button>
        ))}
      </div>
    </Field>
  );
}
