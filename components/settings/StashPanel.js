"use client";

import { useState } from "react";
import { Segmented, Toggle } from "../composer/ui";
import { Block, Notice } from "./bits";
import { useSettings } from "./context";

const HINTS = {
  public: "New posts go to the feed, search and your profile.",
  private: "New posts are only visible to you until you change them.",
  ask: "Before every post goes live, you’ll choose who can see it.",
};

const BULK = [
  { id: "all_private", label: "Make every post Only me", confirm: "Hide all of your posts from everyone else?" },
  { id: "all_public", label: "Make every post Everyone", confirm: "Show all of your posts to everyone, including ones you hid?" },
  { id: "comments_off", label: "Close comments on every post", confirm: "Turn comments off on all of your posts?" },
  { id: "comments_on", label: "Open comments on every post", confirm: "Turn comments on for all of your posts?" },
  { id: "likes_hidden", label: "Hide like counts on every post", confirm: "Hide the like count on all of your posts?" },
  { id: "likes_shown", label: "Show like counts on every post", confirm: "Show the like count on all of your posts?" },
];

// Content management: what a new post does by default, plus one-tap changes to
// everything you've already posted.
export default function StashPanel() {
  const { prefs, update, notify, stats: initialStats } = useSettings();
  const c = prefs.content;
  const [stats, setStats] = useState(initialStats);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function apply(id) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn’t update your posts.");
        return;
      }
      setStats(data.stats);
      setConfirming(null);
      notify(data.count === 1 ? "Updated 1 post" : `Updated ${data.count} posts`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Block title="Your stash">
        <dl className="st-stats">
          <div><dd>{stats.total}</dd><dt>Posts</dt></div>
          <div><dd>{stats.everyone}</dd><dt>Everyone</dt></div>
          <div><dd>{stats.onlyMe}</dd><dt>Only me</dt></div>
          <div><dd>{stats.scheduled}</dd><dt>Scheduled</dt></div>
        </dl>
      </Block>

      <Block title="Who sees new posts" hint={HINTS[c.visibility]}>
        <Segmented
          value={c.visibility}
          onChange={(visibility) =>
            update("content", {
              visibility,
              ...(visibility === "private" ? { allowShare: false } : {}),
            })
          }
          options={[
            { value: "public", label: "Always public" },
            { value: "private", label: "Always private" },
            { value: "ask", label: "Ask me" },
          ]}
        />
      </Block>

      <Block title="Defaults for every new post" hint="You can still change any of these on a single post while you write it.">
        <Toggle label="Allow comments" hint="Turn off to start every post with comments closed" checked={c.comments} onChange={(comments) => update("content", { comments })} />
        <Toggle label="Hide like count" hint="Only you see the number" checked={c.hideLikes} onChange={(hideLikes) => update("content", { hideLikes })} />
        <Toggle
          label="Allow sharing"
          hint={c.visibility === "private" ? "Not available while new posts are private" : "Share button and copy-link"}
          checked={c.allowShare && c.visibility !== "private"}
          disabled={c.visibility === "private"}
          onChange={(allowShare) => update("content", { allowShare })}
        />
        <Toggle label="Cover new posts as spoilers" hint="Media and theories stay blurred until someone taps" checked={c.spoiler} onChange={(spoiler) => update("content", { spoiler })} />
        <Toggle label="Save drafts as I type" hint="Restores your draft if you leave the composer" checked={c.autosave} onChange={(autosave) => update("content", { autosave })} />
      </Block>

      <Block title="Change everything you’ve posted" hint="Applies to every post you’ve already made, scheduled ones included.">
        <ul className="st-bulk">
          {BULK.map((b) => (
            <li key={b.id}>
              {confirming === b.id ? (
                <div className="st-confirm">
                  <span>{b.confirm}</span>
                  <div>
                    <button type="button" className="st-btn primary sm" disabled={busy} onClick={() => apply(b.id)}>
                      {busy ? "Working..." : "Yes, do it"}
                    </button>
                    <button type="button" className="st-btn ghost sm" disabled={busy} onClick={() => setConfirming(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="st-bulk-btn" disabled={stats.total === 0} onClick={() => { setError(""); setConfirming(b.id); }}>
                  {b.label}
                </button>
              )}
            </li>
          ))}
        </ul>
        {stats.total === 0 && <p className="st-hint">You haven’t posted yet.</p>}
        {error && <Notice tone="bad">{error}</Notice>}
      </Block>
    </>
  );
}
