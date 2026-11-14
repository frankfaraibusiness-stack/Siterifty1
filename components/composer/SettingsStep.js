"use client";

import { useEffect, useState } from "react";
import { Segmented, Toggle } from "./ui";

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function relative(ms) {
  const m = Math.round((ms - Date.now()) / 60000);
  if (m < 1) return "any moment now";
  if (m < 60) return `in ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h} hour${h === 1 ? "" : "s"} ${m % 60 ? `${m % 60}m` : ""}`.trim();
  return `in ${Math.floor(h / 24)} days`;
}

export default function SettingsStep({ d, set, errors }) {
  const s = d.settings;
  const put = (p) => set({ settings: { ...s, ...p } });
  const isPrivate = s.visibility === "private";
  const [min, setMin] = useState("");
  useEffect(() => setMin(toLocalInput(new Date())), []);
  const scheduled = !!d.publishAt;
  const when = scheduled ? Date.parse(d.publishAt) : null;

  return (
    <>
      <section className="cmp-card">
        <h3>Who can see it</h3>
        <Segmented
          value={s.visibility}
          onChange={(visibility) => put({ visibility, ...(visibility === "private" ? { allowShare: false } : {}) })}
          options={[
            { value: "public", label: "Everyone" },
            { value: "private", label: "Only me" },
          ]}
        />
        <p className="cmp-hint">
          {isPrivate
            ? "Only you can see this post. It won’t appear in the feed, search or your public profile."
            : "Shows up in the feed, search and your profile."}
        </p>
      </section>

      <section className="cmp-card">
        <h3>Interaction</h3>
        <Toggle
          label={d.type === "theory" ? "Allow replies" : "Allow comments"}
          hint={d.type === "theory" ? "Let people post counter-theories" : "Turn off to close the conversation"}
          checked={s.comments}
          onChange={(comments) => put({ comments })}
        />
        <Toggle label="Hide like count" hint="Only you will see the number" checked={s.hideLikes} onChange={(hideLikes) => put({ hideLikes })} />
        <Toggle
          label="Allow sharing"
          hint={isPrivate ? "Not available for private posts" : "Share button and copy-link"}
          checked={s.allowShare && !isPrivate}
          disabled={isPrivate}
          onChange={(allowShare) => put({ allowShare })}
        />
        {d.type === "poll" ? (
          <Toggle label="Show results before voting" hint="Otherwise results appear after someone votes" checked={s.resultsFirst} onChange={(resultsFirst) => put({ resultsFirst })} />
        ) : (
          <Toggle
            label="Spoiler cover"
            hint={d.type === "theory" ? "Hides the theory until someone taps" : "Blurs the media until someone taps"}
            checked={s.spoiler}
            onChange={(spoiler) => put({ spoiler })}
          />
        )}
        <Toggle label="Pin to my profile" hint="Keeps it first on your page" checked={s.pinned} onChange={(pinned) => put({ pinned })} />
      </section>

      <section className="cmp-card">
        <h3>When it goes live</h3>
        <Segmented
          value={scheduled ? "later" : "now"}
          onChange={(v) => {
            if (v === "now") set({ publishAt: "" });
            else {
              const t = new Date(Date.now() + 60 * 60 * 1000);
              t.setMinutes(0, 0, 0);
              set({ publishAt: t.toISOString() });
            }
          }}
          options={[
            { value: "now", label: "Post now" },
            { value: "later", label: "Schedule" },
          ]}
        />
        {scheduled && (
          <div className="cmp-schedule">
            <input
              type="datetime-local"
              className="cmp-input"
              min={min}
              value={toLocalInput(new Date(when))}
              aria-label="Publish date and time"
              onChange={(e) => e.target.value && set({ publishAt: new Date(e.target.value).toISOString() })}
            />
            {errors.publishAt ? (
              <p className="cmp-error" role="alert">{errors.publishAt}</p>
            ) : (
              <p className="cmp-hint">
                Goes live {relative(when)} ({Intl.DateTimeFormat().resolvedOptions().timeZone}). It stays hidden from everyone else until then.
              </p>
            )}
          </div>
        )}
      </section>
    </>
  );
}
