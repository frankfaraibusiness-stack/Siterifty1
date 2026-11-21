"use client";

import { Segmented } from "./ui";
import {
  AD_SPOTS, CREATOR_SHARE_PCT, KIND_LABEL, MAX_ADS, MIN_GAP_SECONDS, SPOT_LABEL, cleanAdPrefs, planBreaks, rpmDollars,
} from "@/lib/instream-ads";

// What a creator picks once a Long form video is monetized: which ads may run (photo, video or both), where
// (start, middle, end) and how many (1 to 3). The earnings line is the creator's cut per 1,000 ad views; the
// server pays per ad that was really shown, so "both" lands between the two (lib/instream-ads.js).

const KIND_HINT = {
  video: "Video ads only",
  image: "Photo ads only",
  mixed: "Photo and video ads",
};
const SPOT_HINT = {
  start: "Before the video",
  mid: "During the video",
  end: "After the video",
};

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const dollars = (n) => `$${n.toFixed(2)}`;

export default function AdSettings({ prefs, duration, onChange }) {
  const p = cleanAdPrefs(prefs);
  const set = (patch) => onChange(cleanAdPrefs({ ...p, ...patch }));
  const toggleSpot = (spot) => {
    const on = p.spots.includes(spot);
    // At least one spot always stays picked.
    if (on && p.spots.length === 1) return;
    set({ spots: on ? p.spots.filter((s) => s !== spot) : [...p.spots, spot] });
  };

  const known = Number(duration) > 0;
  const plan = known ? planBreaks(duration, p) : [];

  return (
    <div className="cmp-card as-card">
      <h3>Ads on this video</h3>

      <Segmented
        label="Which ads can play"
        value={p.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "video", label: "Video" },
          { value: "image", label: "Photo" },
          { value: "mixed", label: "Both" },
        ]}
      />
      <p className="as-earn">
        <b>{dollars(rpmDollars(p.kind))}</b> per 1,000 ad views
        <span> · {CREATOR_SHARE_PCT}% of what advertisers pay{p.kind === "mixed" ? ", about half photo and half video" : ""}. {KIND_HINT[p.kind]}.</span>
      </p>

      <div className="cmp-seg-label as-label">Where ads can appear</div>
      <div className="cmp-chips as-spots" role="group" aria-label="Where ads can appear">
        {AD_SPOTS.map((s) => (
          <button
            key={s}
            type="button"
            className={`cmp-chip${p.spots.includes(s) ? " on" : ""}`}
            aria-pressed={p.spots.includes(s)}
            onClick={() => toggleSpot(s)}
          >
            {SPOT_LABEL[s]}
            <small className="as-sub">{SPOT_HINT[s]}</small>
          </button>
        ))}
      </div>

      <Segmented
        label="Most ads per video"
        value={p.count}
        onChange={(count) => set({ count })}
        options={Array.from({ length: MAX_ADS }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
      />

      <p className="cmp-hint as-rules">
        Never more than {MAX_ADS} ads, and always at least {MIN_GAP_SECONDS} seconds of video between two ads.
        {known && (
          plan.length
            ? <> With this video, ads would play {plan.map((b) => (b.kind === "start" ? "before it" : b.kind === "end" ? "after it" : `at ${clock(b.at)}`)).join(", ")}.</>
            : <> This video is too short to fit an ad with those settings.</>
        )}
      </p>
    </div>
  );
}
