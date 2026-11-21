"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Popup from "./Popup";
import {
  DAYS, MONTHS, addDays, addMonths, daysInMonth, fmtDate, fmtTime, joinDT, joinTime, minutesOf, monthGrid, pad, parseTime, parseYmd, splitDT, todayYmd, ymd,
} from "@/lib/picker-dates";

// The site's own date, time and date-and-time pickers, used instead of the browser's.
//
//   <DatePicker value="2026-11-21" onChange={(v) => …} min="2026-11-21" />      "YYYY-MM-DD"
//   <TimePicker value="19:30" onChange={(v) => …} />                             "HH:MM" (24-hour)
//   <DateTimePicker value="2026-11-21T19:30" onChange={(v) => …} min="…T…" />    "YYYY-MM-DDTHH:MM"
//
// The values are the same strings the browser's inputs used, so the forms around them did not
// have to change. Each opens in a floating panel (components/ui/Popup.js): a popover on wide
// screens, a bottom sheet on phones, never clipped or covered by the page around it.

const Icon = {
  cal: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
  ),
  chev: (
    <svg className="cs-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  ),
  left: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" /></svg>),
  right: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" /></svg>),
};

// 12-hour or 24-hour follows the device; until the page has loaded it is 12-hour, so the server and
// the browser can never disagree about the text.
function useHour12() {
  const [h12, setH12] = useState(true);
  useEffect(() => {
    try {
      setH12(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12 !== false);
    } catch { /* keep 12-hour */ }
  }, []);
  return h12;
}

/* ============================ the closed button ============================ */

function Trigger({ id, label, icon, text, placeholder, open, invalid, disabled, className, rootRef, btnRef, onToggle, onOpen }) {
  return (
    <span className={`cs cs-dt${open ? " is-open" : ""}${invalid ? " is-invalid" : ""}${disabled ? " is-disabled" : ""} ${className || ""}`} ref={rootRef}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`cs-trigger${text ? "" : " is-empty"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? (text ? `${label}: ${text}` : label) : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); onOpen(); } }}
      >
        <span className="cs-ic">{icon}</span>
        <span className="cs-value">{text || placeholder}</span>
        {Icon.chev}
      </button>
    </span>
  );
}

// Open/close plumbing every picker shares.
function useOpen() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  }, []);
  return { open, setOpen, rootRef, btnRef, close };
}

/* ================================ calendar ================================ */

function Calendar({ value, min, max, onPick }) {
  const today = useMemo(() => todayYmd(), []);
  const start = useMemo(() => {
    let s = parseYmd(value) ? value : today;
    if (min && s < min) s = min;
    return s;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(() => { const p = parseYmd(start); return { y: p.y, m: p.m }; });
  const [focusDate, setFocusDate] = useState(start);
  const [months, setMonths] = useState(false);
  const grid = useRef(null);
  const focusNext = useRef(true); // true on open and after an arrow key; not after a mouse click on ‹ ›

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);
  const off = (d) => (min && d < min) || (max && d > max);

  // The day with the keyboard focus (also the first thing focused when the panel opens).
  useEffect(() => {
    if (months || !focusNext.current) return;
    focusNext.current = false;
    grid.current?.querySelector(`[data-d="${focusDate}"]`)?.focus({ preventScroll: true });
  }, [focusDate, view, months]);

  const goto = (d) => {
    const p = parseYmd(d);
    focusNext.current = true;
    setFocusDate(d);
    setView({ y: p.y, m: p.m });
  };
  const shiftMonth = (n) => {
    const t = new Date(view.y, view.m + n, 1);
    setView({ y: t.getFullYear(), m: t.getMonth() });
    setFocusDate(addMonths(focusDate, n));
  };

  function onGridKey(e) {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key]) { e.preventDefault(); goto(addDays(focusDate, map[e.key])); return; }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const p = parseYmd(focusDate);
      const wd = new Date(p.y, p.m, p.d).getDay();
      goto(addDays(focusDate, e.key === "Home" ? -wd : 6 - wd));
      return;
    }
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const n = (e.key === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1);
      goto(addMonths(focusDate, n));
    }
  }

  const prevOff = min && ymd(view.y, view.m, 1) <= min; // the month before is entirely too early
  const nextOff = max && ymd(view.m === 11 ? view.y + 1 : view.y, (view.m + 1) % 12, 1) > max; // the month after is entirely too late

  if (months) {
    return (
      <div className="dp-cal">
        <div className="dp-head">
          <button type="button" className="dp-nav" aria-label="Previous year" disabled={!!min && view.y <= parseYmd(min).y} onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))}>{Icon.left}</button>
          <span className="dp-title static">{view.y}</span>
          <button type="button" className="dp-nav" aria-label="Next year" disabled={!!max && view.y >= parseYmd(max).y} onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))}>{Icon.right}</button>
        </div>
        <div className="dp-months">
          {MONTHS.map((name, i) => {
            const dis = (min && ymd(view.y, i, daysInMonth(view.y, i)) < min) || (max && ymd(view.y, i, 1) > max);
            return (
              <button
                key={name}
                type="button"
                disabled={!!dis}
                className={`dp-month${i === view.m ? " on" : ""}`}
                onClick={() => { focusNext.current = true; setView({ y: view.y, m: i }); setFocusDate(ymd(view.y, i, 1) < (min || "") ? min : ymd(view.y, i, 1)); setMonths(false); }}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="dp-cal">
      <div className="dp-head">
        <button type="button" className="dp-nav" aria-label="Previous month" disabled={!!prevOff} onClick={() => shiftMonth(-1)}>{Icon.left}</button>
        <button type="button" className="dp-title" aria-label={`${MONTHS[view.m]} ${view.y}, choose month`} onClick={() => setMonths(true)}>
          {MONTHS[view.m]} {view.y}
        </button>
        <button type="button" className="dp-nav" aria-label="Next month" disabled={!!nextOff} onClick={() => shiftMonth(1)}>{Icon.right}</button>
      </div>
      <div className="dp-week" aria-hidden="true">
        {DAYS.map((d) => <span key={d}>{d.slice(0, 2)}</span>)}
      </div>
      <div className="dp-grid" role="group" aria-label={`${MONTHS[view.m]} ${view.y}`} ref={grid} onKeyDown={onGridKey}>
        {cells.map((c) => {
          const sel = c.date === value;
          const dis = !!off(c.date);
          return (
            <button
              key={c.date}
              type="button"
              data-d={c.date}
              tabIndex={c.date === focusDate ? 0 : -1}
              aria-pressed={sel}
              aria-disabled={dis || undefined}
              aria-label={fmtDate(c.date, true)}
              className={`dp-day${sel ? " sel" : ""}${c.date === today ? " today" : ""}${c.out ? " out" : ""}${dis ? " dis" : ""}`}
              onClick={() => { if (!dis) onPick(c.date); }}
            >
              {c.day}
            </button>
          );
        })}
      </div>
      <div className="dp-foot-row">
        <button type="button" className="dp-link" disabled={!!off(today)} onClick={() => onPick(today)}>Today</button>
      </div>
    </div>
  );
}

/* ============================= time columns ============================= */

function TimeColumns({ value, onChange, hour12, step = 5, minMinutes = null, compact = false }) {
  const base = parseTime(value) || { h: 19, m: 0 };
  const has = !!parseTime(value);
  const pm = base.h >= 12;
  const cols = useRef({});

  const hours = hour12 ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : Array.from({ length: 24 }, (_, i) => i);
  const mins = useMemo(() => {
    const a = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
    if (has && !a.includes(base.m)) a.push(base.m);
    return a.sort((x, y) => x - y);
  }, [step, has, base.m]);

  const h24Of = (label) => (hour12 ? (label % 12) + (pm ? 12 : 0) : label);
  const emit = (h, m) => {
    let t = h * 60 + m;
    if (minMinutes != null && t < minMinutes) t = minMinutes;
    onChange(joinTime(Math.floor(t / 60), t % 60));
  };

  const hourOff = (label) => minMinutes != null && h24Of(label) * 60 + 59 < minMinutes;
  const minOff = (m) => minMinutes != null && base.h * 60 + m < minMinutes;
  const ampmOff = (isPm) => minMinutes != null && (isPm ? 23 : 11) * 60 + 59 < minMinutes;

  // Put the chosen row in view when the panel opens.
  useEffect(() => {
    Object.values(cols.current).forEach((el) => {
      const on = el?.querySelector(".on");
      if (on) el.scrollTop = on.offsetTop - el.clientHeight / 2 + on.offsetHeight / 2;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function keyCol(e) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = [...e.currentTarget.querySelectorAll("button:not(:disabled)")];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, (at < 0 ? 0 : at) + (e.key === "ArrowDown" ? 1 : -1)));
    e.preventDefault();
    items[next].focus({ preventScroll: true });
    items[next].click();
    items[next].scrollIntoView({ block: "nearest" });
  }

  // Plain function, not a component: a component declared here would be re-created on every render,
  // which would drop the keyboard focus after each arrow key.
  const item = (key, { on, dis, tab, onClick, text }) => (
    <button key={key} type="button" role="option" aria-selected={on} disabled={dis} tabIndex={tab ? 0 : -1} className={`dp-t${on ? " on" : ""}`} onClick={onClick}>
      {text}
    </button>
  );
  const hourOn = (h) => has && (hour12 ? base.h % 12 === h % 12 : base.h === h);
  const hourTab = (h, i) => hourOn(h) || (!has && i === 0);
  const minTab = (m, i) => (has && base.m === m) || (!has && i === 0);

  return (
    <div className={`dp-time${compact ? " compact" : ""}`}>
      <div className="dp-tcol" role="listbox" aria-label="Hour" ref={(el) => (cols.current.h = el)} onKeyDown={keyCol}>
        {hours.map((h, i) => item(h, { on: hourOn(h), dis: hourOff(h), tab: hourTab(h, i), onClick: () => emit(h24Of(h), base.m), text: hour12 ? h : pad(h) }))}
      </div>
      <div className="dp-tcol" role="listbox" aria-label="Minute" ref={(el) => (cols.current.m = el)} onKeyDown={keyCol}>
        {mins.map((m, i) => item(m, { on: has && base.m === m, dis: minOff(m), tab: minTab(m, i), onClick: () => emit(base.h, m), text: pad(m) }))}
      </div>
      {hour12 && (
        <div className="dp-tcol ampm" role="listbox" aria-label="AM or PM" ref={(el) => (cols.current.p = el)} onKeyDown={keyCol}>
          {["AM", "PM"].map((x, i) => item(x, { on: has && (x === "PM") === pm, dis: ampmOff(x === "PM"), tab: (has && (x === "PM") === pm) || (!has && i === 0), onClick: () => emit((base.h % 12) + (x === "PM" ? 12 : 0), base.m), text: x }))}
        </div>
      )}
    </div>
  );
}

/* ================================ pickers ================================ */

export function DatePicker({ value, onChange, min = "", max = "", label = "", title, placeholder = "Pick a date", className = "", id, invalid, disabled }) {
  const { open, setOpen, rootRef, btnRef, close } = useOpen();
  const text = parseYmd(value) ? fmtDate(value) : "";
  return (
    <>
      <Trigger id={id} label={label} icon={Icon.cal} text={text} placeholder={placeholder} open={open} invalid={invalid} disabled={disabled} className={className}
        rootRef={rootRef} btnRef={btnRef} onToggle={() => (open ? close(false) : setOpen(true))} onOpen={() => setOpen(true)} />
      <Popup open={open} onClose={close} rootRef={rootRef} anchorRef={btnRef} title={title || label || "Pick a date"} width={308}>
        <Calendar value={value} min={min} max={max} onPick={(d) => { onChange(d); close(); }} />
      </Popup>
    </>
  );
}

export function TimePicker({ value, onChange, minMinutes = null, step = 5, clearable = false, label = "", title, placeholder = "Pick a time", className = "", id, invalid, disabled }) {
  const { open, setOpen, rootRef, btnRef, close } = useOpen();
  const hour12 = useHour12();
  const text = parseTime(value) ? fmtTime(value, hour12) : "";
  return (
    <>
      <Trigger id={id} label={label} icon={Icon.clock} text={text} placeholder={placeholder} open={open} invalid={invalid} disabled={disabled} className={className}
        rootRef={rootRef} btnRef={btnRef} onToggle={() => (open ? close(false) : setOpen(true))} onOpen={() => setOpen(true)} />
      <Popup open={open} onClose={close} rootRef={rootRef} anchorRef={btnRef} title={title || label || "Pick a time"} width={hour12 ? 236 : 200}>
        <TimeColumns value={value} onChange={onChange} hour12={hour12} step={step} minMinutes={minMinutes} />
        <div className="dp-foot-row split">
          {clearable && value ? <button type="button" className="dp-link" onClick={() => { onChange(""); close(); }}>Clear</button> : <span />}
          <button type="button" className="dp-done" onClick={() => close()}>Done</button>
        </div>
      </Popup>
    </>
  );
}

export function DateTimePicker({ value, onChange, min = "", label = "", title, placeholder = "Pick a date and time", className = "", id, invalid, disabled }) {
  const { open, setOpen, rootRef, btnRef, close } = useOpen();
  const hour12 = useHour12();
  const { date, time } = splitDT(value);
  const minDate = min ? splitDT(min).date : "";
  const minTime = min ? minutesOf(splitDT(min).time) : null;
  const text = date && time ? `${fmtDate(date)} · ${fmtTime(time, hour12)}` : "";

  // Earliest allowed minute on the chosen day (only the first allowed day has a limit).
  const limitFor = (d) => (minDate && d === minDate && minTime != null ? minTime : null);

  const pickDate = (d) => {
    let t = time || "19:00";
    const lim = limitFor(d);
    if (lim != null && minutesOf(t) < lim) t = joinTime(Math.floor(lim / 60), lim % 60);
    onChange(joinDT(d, t));
  };
  const pickTime = (t) => onChange(joinDT(date || minDate || todayYmd(), t));

  return (
    <>
      <Trigger id={id} label={label} icon={Icon.cal} text={text} placeholder={placeholder} open={open} invalid={invalid} disabled={disabled} className={className}
        rootRef={rootRef} btnRef={btnRef} onToggle={() => (open ? close(false) : setOpen(true))} onOpen={() => setOpen(true)} />
      <Popup open={open} onClose={close} rootRef={rootRef} anchorRef={btnRef} title={title || label || "Pick a date and time"} width={308}>
        <Calendar value={date} min={minDate} onPick={pickDate} />
        <div className="dp-sep"><span>Time</span></div>
        <TimeColumns value={time} onChange={pickTime} hour12={hour12} minMinutes={limitFor(date || minDate)} compact />
        <div className="dp-foot-row split">
          <span className="dp-sum">{text || "Choose a day and a time"}</span>
          <button type="button" className="dp-done" onClick={() => close()}>Done</button>
        </div>
      </Popup>
    </>
  );
}
