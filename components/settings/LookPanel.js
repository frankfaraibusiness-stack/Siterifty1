"use client";

import { Segmented, Toggle } from "../composer/ui";
import { Block } from "./bits";
import { useSettings } from "./context";
import { PRESETS, applyLook, lookFromPreset, lookToVars, sanitizeLook } from "@/lib/look";

const COLOURS = [
  ["a", "Hot neon", "Hearts, highlights and the main glow"],
  ["b", "Cool neon", "Links, hovers and the logo"],
  ["c", "Button glow", "Big buttons like Join the Heist"],
];

// Appearance: the colours of the whole site. Every change is painted straight
// onto the page you're looking at, remembered in a cookie so the next page is
// already themed, and saved to your account so other devices match.
export default function LookPanel() {
  const { prefs, update } = useSettings();
  const look = prefs.look;

  function change(patch) {
    let next = sanitizeLook({ ...look, ...patch });
    // Editing colours or the tint turns a preset into a custom look.
    const base = PRESETS.find((p) => p.id === next.preset);
    if (base && (next.a !== base.a || next.b !== base.b || next.c !== base.c || next.hue !== base.hue)) {
      next = { ...next, preset: "custom" };
    }
    applyLook(next);
    update("look", next);
  }

  function choose(id) {
    const base = lookFromPreset(id);
    const next = { ...base, depth: look.depth, glow: look.glow, size: look.size, motion: look.motion };
    applyLook(next);
    update("look", next);
  }

  function reset() {
    const next = lookFromPreset("vice");
    applyLook(next);
    update("look", next);
  }

  return (
    <>
      <Block title="Pick a district" hint="Each one repaints the whole site: backgrounds, buttons, hearts and glows.">
        <div className="st-presets" role="radiogroup" aria-label="Colour theme">
          {PRESETS.map((p) => {
            const v = lookToVars(lookFromPreset(p.id));
            const on = look.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`st-preset${on ? " on" : ""}`}
                onClick={() => choose(p.id)}
              >
                <span className="st-preset-art" style={{ background: v["--bg"] }}>
                  <span style={{ background: p.a }} />
                  <span style={{ background: p.b }} />
                  <span style={{ background: p.c }} />
                </span>
                <b>{p.name}</b>
                <small>{p.blurb}</small>
              </button>
            );
          })}
        </div>
        {look.preset === "custom" && <p className="st-hint">You’re on a custom look. Pick a district above to start over.</p>}
      </Block>

      <Block title="Mix your own colours">
        <div className="st-colours">
          {COLOURS.map(([key, name, hint]) => (
            <label key={key} className="st-colour">
              <input type="color" value={look[key]} onChange={(e) => change({ [key]: e.target.value })} aria-label={name} />
              <span className="st-colour-text">
                <b>{name}</b>
                <small>{hint}</small>
              </span>
              <code>{look[key]}</code>
            </label>
          ))}
        </div>
        <div className="st-field">
          <label className="st-label" htmlFor="st-hue">Night tint</label>
          <input
            id="st-hue"
            className="st-hue"
            type="range"
            min="0"
            max="359"
            value={look.hue}
            onChange={(e) => change({ hue: Number(e.target.value) })}
          />
          <p className="st-hint">Shifts the colour of the dark background behind everything.</p>
        </div>
      </Block>

      <Block title="Mood">
        <Segmented
          label="Background"
          value={look.depth}
          onChange={(depth) => change({ depth })}
          options={[
            { value: "deep", label: "Deep" },
            { value: "standard", label: "Standard" },
            { value: "lifted", label: "Lifted" },
          ]}
        />
        <Segmented
          label="Neon glow"
          value={look.glow}
          onChange={(glow) => change({ glow })}
          options={[
            { value: "off", label: "Off" },
            { value: "soft", label: "Soft" },
            { value: "strong", label: "Strong" },
          ]}
        />
        <Segmented
          label="Interface size"
          value={look.size}
          onChange={(size) => change({ size })}
          options={[
            { value: "small", label: "Compact" },
            { value: "default", label: "Default" },
            { value: "large", label: "Large" },
          ]}
        />
        <Toggle
          label="Reduce motion"
          hint="Turns off animations and transitions across the site"
          checked={look.motion === "reduced"}
          onChange={(on) => change({ motion: on ? "reduced" : "full" })}
        />
      </Block>

      <Block title="Preview">
        <div className="st-preview" aria-hidden="true">
          <div className="st-pv-head">
            <span className="st-pv-dot">V</span>
            <span>
              <b>vice.runner</b>
              <small>Leonida Keys · 2m</small>
            </span>
          </div>
          <p>Replaying the trailer for the hundredth time and still spotting new details.</p>
          <div className="st-pv-tags">
            <span>#Trailer</span>
            <span>#ViceCity</span>
          </div>
          <div className="st-pv-row">
            <span className="st-pv-like">♥ 1.2k</span>
            <span className="st-pv-cta">Join the Heist</span>
          </div>
        </div>
        <button type="button" className="st-btn ghost wide" onClick={reset}>
          Back to Vice City Neon
        </button>
      </Block>
    </>
  );
}
