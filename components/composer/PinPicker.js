"use client";

import { useId, useRef, useState } from "react";
import { Field } from "./ui";

const round = (n) => Math.round(n * 1e6) / 1e6;
const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Understands "51.5007, -0.1246" and full Google / Apple / OpenStreetMap links
// that carry coordinates. Short links (maps.app.goo.gl) can't be opened from
// the browser, so those are reported separately.
export function parseCoords(text) {
  const s = String(text || "").trim();
  const patterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&#](?:q|ll|query|mlat)=(-?\d{1,2}(?:\.\d+)?)(?:,|%2C|&mlon=)(-?\d{1,3}(?:\.\d+)?)/i,
    /#map=\d+\/(-?\d{1,2}(?:\.\d+)?)\/(-?\d{1,3}(?:\.\d+)?)/,
    /^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/,
  ];
  for (const re of patterns) {
    const m = re.exec(s);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

const SHORT_LINK = /(?:goo\.gl|maps\.app|g\.co\/kgs|apple\.co)/i;

function mapSrc({ lat, lng }) {
  const dx = 0.008;
  const dy = 0.0048;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - dx},${lat - dy},${lng + dx},${lat + dy}&layer=mapnik&marker=${lat},${lng}`;
}

async function getJSON(url, signal) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error("bad status");
  return res.json();
}

// Drops a real-world pin. Three ways in: search a place or address, use the
// device's location, or paste coordinates / a full map link. Search uses the
// public OpenStreetMap geocoder straight from the browser, so no API key and
// no extra package.
export default function PinPicker({ pin, onChange, error }) {
  const id = useId();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const run = useRef(0);

  function choose(p) {
    run.current += 1;
    setResults([]);
    setMsg("");
    setText("");
    setBusy("");
    onChange({ lat: round(p.lat), lng: round(p.lng), label: String(p.label || "").slice(0, 160) });
  }

  async function search() {
    const q = text.trim();
    if (!q) return;
    const coords = parseCoords(q);
    if (coords) return choose({ ...coords, label: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` });
    if (SHORT_LINK.test(q)) {
      setResults([]);
      return setMsg("Short links can’t be read here. Open it, then paste the full address bar link or the coordinates.");
    }
    const mine = ++run.current;
    setBusy("search");
    setMsg("");
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const rows = await getJSON(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
        ctl.signal
      );
      if (mine !== run.current) return;
      const list = rows
        .map((r) => ({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name }))
        .filter((r) => valid(r.lat, r.lng));
      setResults(list);
      if (!list.length) setMsg("Nothing found. Try a nearby landmark or the city name.");
    } catch {
      if (mine === run.current) setMsg("Search isn’t reachable right now. You can still paste coordinates or a map link.");
    } finally {
      clearTimeout(timer);
      if (mine === run.current) setBusy("");
    }
  }

  function locate() {
    if (!navigator.geolocation) return setMsg("This device can’t share its location.");
    const mine = ++run.current;
    setBusy("locate");
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let label = "My current location";
        try {
          const ctl = new AbortController();
          setTimeout(() => ctl.abort(), 6000);
          const r = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, ctl.signal);
          if (r?.display_name) label = r.display_name;
        } catch {
          // The pin is still good without an address.
        }
        if (mine === run.current) choose({ lat, lng, label });
      },
      (err) => {
        if (mine !== run.current) return;
        setBusy("");
        setMsg(err.code === 1 ? "Location permission was blocked. Allow it in your browser, or search instead." : "Couldn’t get your location. Try searching instead.");
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  }

  return (
    <Field label="Pin the spot" error={error} htmlFor={`${id}-q`}>
      {pin ? (
        <div className="ev-pin has-pin">
          <iframe className="ev-map" title="Map preview of the pinned spot" src={mapSrc(pin)} loading="lazy" referrerPolicy="no-referrer" />
          <div className="ev-pin-bar">
            <span className="ev-pin-txt">
              <b>{pin.label || "Pinned location"}</b>
              <small>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</small>
            </span>
            <a className="cmp-mini" href={`https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=17/${pin.lat}/${pin.lng}`} target="_blank" rel="noopener noreferrer">Open</a>
            <button type="button" className="cmp-mini" onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <div className="ev-pin">
          <div className="ev-pin-search">
            <input
              id={`${id}-q`}
              className="cmp-input"
              value={text}
              placeholder="Search a place, or paste a map link"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              aria-invalid={!!error}
            />
            <button type="button" className="cmp-mini solid" onClick={search} disabled={!text.trim() || busy === "search"}>
              {busy === "search" ? "..." : "Find"}
            </button>
          </div>
          <button type="button" className="ev-locate" onClick={locate} disabled={busy === "locate"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {busy === "locate" ? "Finding you..." : "Use my current location"}
          </button>
          {results.length > 0 && (
            <ul className="ev-results" aria-label="Search results">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`}>
                  <button type="button" onClick={() => choose(r)}>{r.label}</button>
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="cmp-hint bad" role="status">{msg}</p>}
        </div>
      )}
    </Field>
  );
}
