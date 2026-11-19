"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LOCATION_GROUPS } from "@/lib/post-schema";

function groupOf(value) {
  return LOCATION_GROUPS.find((g) => g.items.some((i) => i.name === value)) || LOCATION_GROUPS[0];
}

export default function LocationPicker({ value, onChange, error }) {
  const uid = useId();
  const root = useRef(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(() => groupOf(value).id);
  const [hi, setHi] = useState(0);

  const group = LOCATION_GROUPS.find((g) => g.id === tab) || LOCATION_GROUPS[0];
  const current = groupOf(value);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const down = (e) => root.current && !root.current.contains(e.target) && setOpen(false);
    const key = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("touchstart", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("touchstart", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      const g = groupOf(value);
      setTab(g.id);
      setHi(Math.max(0, g.items.findIndex((i) => i.name === value)));
    }
    setOpen(!open);
  }

  function pick(name) {
    onChange(name);
    setOpen(false);
  }

  function switchTab(id) {
    setTab(id);
    setHi(0);
  }

  function onKeyDown(e) {
    const items = group.items;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => (h + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => (h - 1 + items.length) % items.length);
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const i = LOCATION_GROUPS.findIndex((g) => g.id === tab);
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + LOCATION_GROUPS.length) % LOCATION_GROUPS.length;
      switchTab(LOCATION_GROUPS[n].id);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(items[hi].name);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className={`cmp-locdd${open ? " open" : ""}${error ? " bad" : ""}`} ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="cmp-locdd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-label={`Location: ${value}`}
        onClick={toggle}
      >
        <span className="cmp-locdd-pin" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <span className="cmp-locdd-val">{value}</span>
        <span className="cmp-locdd-game">{current.label}</span>
        <span className="cmp-locdd-caret" aria-hidden="true" />
      </button>

      {open && (
        <div className="cmp-locdd-panel">
          <div className="cmp-locdd-tabs" role="tablist" aria-label="Game">
            {LOCATION_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={tab === g.id}
                className={tab === g.id ? "on" : ""}
                onClick={() => switchTab(g.id)}
              >
                {g.label}
                <small>{g.items.length - 1}</small>
              </button>
            ))}
          </div>

          <ul className="cmp-locdd-list" role="listbox" id={`${uid}-list`} aria-label={`${group.label} locations`}>
            {group.items.map((it, i) => {
              const sel = it.name === value;
              return (
                <li key={it.name} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sel}
                    className={`${sel ? "sel" : ""}${hi === i ? " hi" : ""}`}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pick(it.name)}
                  >
                    <span className="cmp-locdd-txt">
                      <b>{it.name}</b>
                      <small>{it.sub}</small>
                    </span>
                    {sel && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
