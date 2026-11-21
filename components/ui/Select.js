"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The site's own dropdown, used instead of the browser's <select> everywhere.
//
//   <Select value={v} onChange={setV} options={["A", "B"]} label="Platform" />
//   <Select value={id} onChange={setId} options={[{ value: "x", label: "Xray", hint: "…" }]} searchable />
//
// - The list is drawn in a portal on <body> with position: fixed, so it can never be clipped by a
//   card or scroll area, or covered by the content around it (see app/select.css).
// - Wide screens: a popover under the button (flips above when there is no room, follows the button
//   while the page scrolls). Phones: a bottom sheet with a backdrop, easy to hit with a thumb.
// - Keyboard: Arrows / Home / End / Enter / Escape, plus type-to-jump. Escape closes only the
//   dropdown, not the dialog it sits in.
// - `searchable` adds a filter box (long lists like currencies).

const norm = (o) => (typeof o === "object" && o !== null ? { value: o.value, label: String(o.label ?? o.value), hint: o.hint, group: o.group } : { value: o, label: String(o) });

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const read = () => setPhone(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return phone;
}

const Chevron = () => (
  <svg className="cs-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);
const Tick = () => (
  <svg className="cs-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export default function Select({
  value,
  onChange,
  options,
  label = "",
  placeholder = "Select…",
  searchable = false,
  searchPlaceholder = "Search…",
  disabled = false,
  className = "",
  id,
}) {
  const list = useMemo(() => options.map(norm), [options]);
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState(null);
  const phone = useIsPhone();
  const root = useRef(null);
  const trigger = useRef(null);
  const pop = useRef(null);
  const listEl = useRef(null);
  const search = useRef(null);
  const typed = useRef({ text: "", at: 0 });

  const current = list.find((o) => String(o.value) === String(value));
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? list.filter((o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : list;
  }, [list, query]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    const at = list.findIndex((o) => String(o.value) === String(value));
    setActive(Math.max(0, at));
    setQuery("");
    setOpen(true);
  }, [disabled, list, value]);

  function choose(o) {
    if (o && String(o.value) !== String(value)) onChange(o.value);
    close();
  }

  // Where the popover goes: under the button, or above it when the space below is too tight.
  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (r.bottom < 0 || r.top > vh) { setOpen(false); return; } // the button scrolled out of view
    const want = Math.min(340, (searchable ? 60 : 12) + shown.length * 42);
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < Math.min(want, 220) && above > below;
    const width = Math.max(r.width, 200);
    const left = Math.min(Math.max(8, r.left), Math.max(8, vw - width - 8));
    setPos({ left, width, up, top: up ? undefined : r.bottom + 6, bottom: up ? vh - r.top + 6 : undefined, maxH: Math.max(140, Math.min(340, (up ? above : below) - 6)) });
  }, [searchable, shown.length]);

  useLayoutEffect(() => {
    if (open && !phone) place();
  }, [open, phone, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = (e) => {
      if (pop.current && pop.current.contains(e.target)) return;
      if (!phone) place();
    };
    const onDown = (e) => {
      if (root.current?.contains(e.target) || pop.current?.contains(e.target)) return;
      close(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, phone, place, close]);

  // Focus the filter box when there is one; keep the highlighted row in view.
  // (the popover starts hidden until it has been placed, and a hidden box can't take focus)
  useEffect(() => {
    if (!open || !searchable || (!phone && !pos)) return;
    if (document.activeElement !== search.current) search.current?.focus({ preventScroll: true });
  }, [open, searchable, phone, pos]);
  useEffect(() => {
    if (!open) return;
    const row = listEl.current?.querySelector(`[data-i="${active}"]`);
    if (row && listEl.current) {
      const box = listEl.current;
      if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 4;
      else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 4;
    }
  }, [open, active, shown]);
  useEffect(() => { setActive(0); }, [query]);

  function onKeyDown(e) {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (k === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (k === "Tab") { close(false); return; }
    if (k === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); return; }
    if (k === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); return; }
    if (k === "Home") { e.preventDefault(); setActive(0); return; }
    if (k === "End") { e.preventDefault(); setActive(shown.length - 1); return; }
    if (k === "Enter") { e.preventDefault(); choose(shown[active]); return; }
    if (k === " " && !searchable) { e.preventDefault(); choose(shown[active]); return; }
    // Type-to-jump on a plain list.
    if (!searchable && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + k.toLowerCase(), at: now };
      const hit = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  }

  const rows = [];
  let lastGroup;
  shown.forEach((o, i) => {
    if (o.group && o.group !== lastGroup) rows.push(<li key={`g-${o.group}`} className="cs-group" role="presentation">{o.group}</li>);
    lastGroup = o.group;
    const on = String(o.value) === String(value);
    rows.push(
      <li
        key={`${o.value}`}
        id={`${uid}-o${i}`}
        data-i={i}
        role="option"
        aria-selected={on}
        className={`cs-opt${on ? " on" : ""}${i === active ? " hot" : ""}`}
        onPointerMove={() => i !== active && setActive(i)}
        onClick={() => choose(o)}
      >
        <span className="cs-opt-t">
          <span>{o.label}</span>
          {o.hint && <small>{o.hint}</small>}
        </span>
        {on && <Tick />}
      </li>
    );
  });

  const body = (
    <>
      {searchable && (
        <div className="cs-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
          <input
            ref={search}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            aria-label={`Search ${label || "options"}`}
            aria-controls={listId}
            aria-activedescendant={shown.length ? `${uid}-o${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      )}
      <ul ref={listEl} id={listId} className="cs-list" role="listbox" aria-label={label || undefined}>
        {rows}
        {shown.length === 0 && <li className="cs-none" role="presentation">Nothing matches “{query}”</li>}
      </ul>
    </>
  );

  return (
    <span className={`cs${open ? " is-open" : ""}${disabled ? " is-disabled" : ""} ${className}`} ref={root}>
      <button
        ref={trigger}
        id={id}
        type="button"
        className={`cs-trigger${current ? "" : " is-empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label || undefined}
        aria-activedescendant={open && !searchable && shown.length ? `${uid}-o${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="cs-value">{current ? current.label : placeholder}</span>
        <Chevron />
      </button>
      {open &&
        createPortal(
          phone ? (
            <div className="cs-back" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); close(false); } }}>
              <div className="cs-sheet" ref={pop} role="dialog" aria-label={label || "Choose an option"}>
                <span className="cs-grab" aria-hidden="true" />
                {label && <p className="cs-sheet-t">{label}</p>}
                {body}
              </div>
            </div>
          ) : (
            <div
              className={`cs-pop${pos?.up ? " up" : ""}`}
              ref={pop}
              onClick={(e) => e.stopPropagation()}
              style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, "--cs-max": `${pos.maxH}px` } : { visibility: "hidden" }}
            >
              {body}
            </div>
          ),
          document.body
        )}
    </span>
  );
}
