// Pure date/time helpers for the site's own date and time pickers (components/ui/DateTime.js).
// Values are the same strings the browser's inputs used: "YYYY-MM-DD", "HH:MM" (24-hour) and
// "YYYY-MM-DDTHH:MM". Text is built by hand in English, so the server and the browser always
// render exactly the same thing.

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-11
export const todayYmd = () => {
  const t = new Date();
  return ymd(t.getFullYear(), t.getMonth(), t.getDate());
};

export function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

// Move a date by whole days / months; the day is kept inside the target month.
export function addDays(s, n) {
  const p = parseYmd(s);
  const t = new Date(p.y, p.m, p.d + n);
  return ymd(t.getFullYear(), t.getMonth(), t.getDate());
}
export function addMonths(s, n) {
  const p = parseYmd(s);
  const first = new Date(p.y, p.m + n, 1);
  const d = Math.min(p.d, daysInMonth(first.getFullYear(), first.getMonth()));
  return ymd(first.getFullYear(), first.getMonth(), d);
}

// 42 cells (6 weeks, Sunday first) for a month, with the spill-over days of the neighbours.
export function monthGrid(y, m) {
  const lead = new Date(y, m, 1).getDay();
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const t = new Date(y, m, 1 - lead + i);
    cells.push({ date: ymd(t.getFullYear(), t.getMonth(), t.getDate()), day: t.getDate(), out: t.getMonth() !== m });
  }
  return cells;
}

export function fmtDate(s, long = false) {
  const p = parseYmd(s);
  if (!p) return "";
  const wd = DAYS[new Date(p.y, p.m, p.d).getDay()];
  return long ? `${wd}, ${MONTHS[p.m]} ${p.d}, ${p.y}` : `${wd.slice(0, 3)}, ${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}`;
}

// "HH:MM" -> { h, m } (24-hour) or null
export function parseTime(s) {
  const m = /^(\d{1,2}):(\d{2})/.exec(s || "");
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h > 23 || mi > 59 ? null : { h, m: mi };
}
export const joinTime = (h, m) => `${pad(h)}:${pad(m)}`;
export const minutesOf = (s) => {
  const t = parseTime(s);
  return t ? t.h * 60 + t.m : null;
};

export function fmtTime(s, hour12 = true) {
  const t = parseTime(s);
  if (!t) return "";
  if (!hour12) return `${pad(t.h)}:${pad(t.m)}`;
  return `${t.h % 12 || 12}:${pad(t.m)} ${t.h >= 12 ? "PM" : "AM"}`;
}

// "YYYY-MM-DDTHH:MM" <-> { date, time }
export function splitDT(s) {
  const [date = "", time = ""] = String(s || "").split("T");
  return { date: parseYmd(date) ? date : "", time: parseTime(time) ? time.slice(0, 5) : "" };
}
export const joinDT = (date, time) => `${date}T${time}`;
