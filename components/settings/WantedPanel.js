"use client";

import { useState } from "react";
import Link from "next/link";
import { Segmented, Toggle } from "../composer/ui";
import { Block, Notice } from "./bits";
import { StarIcon } from "./icons";
import { useSettings } from "./context";
import { EXPOSURE_LABELS, exposureStars } from "@/lib/settings";

// Privacy and safety. The stars show how much of the city knows you: more
// stars means more exposure, like a wanted level.
export default function WantedPanel() {
  const { prefs, update, setBlocked, notify, openPanel } = useSettings();
  const stars = exposureStars(prefs);
  const [label, line] = EXPOSURE_LABELS[stars];
  const isPrivate = prefs.account.isPrivate;

  const factors = [
    [!isPrivate, "Your profile and posts are public"],
    [!isPrivate && prefs.safety.discoverable, "You show up in search"],
    [prefs.safety.whoCanComment === "everyone", "Anyone can comment on your posts"],
    [prefs.content.visibility === "public", "New posts start public"],
  ];

  return (
    <>
      <Block className="st-meter-block">
        <div className="st-meter" role="img" aria-label={`Wanted level: ${stars} of 5 stars`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} filled={i < stars} />
          ))}
        </div>
        <h3 className="st-meter-title">{label}</h3>
        <p className="st-hint">{line}</p>
        <ul className="st-factors">
          {factors.map(([on, text]) => (
            <li key={text} className={on ? "on" : ""}>
              <i aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
        {isPrivate && (
          <p className="st-hint">
            Your account is private, which hides your profile and posts. Change that in <button type="button" className="st-link" onClick={() => openPanel("character")}>Character</button>.
          </p>
        )}
      </Block>

      <Block title="Finding you">
        <Toggle
          label="Show me in search"
          hint={isPrivate ? "Private accounts never appear in search" : "Your profile and posts can come up in search results"}
          checked={prefs.safety.discoverable && !isPrivate}
          disabled={isPrivate}
          onChange={(discoverable) => update("safety", { discoverable })}
        />
      </Block>

      <Block title="Who can comment on your posts" hint={prefs.safety.whoCanComment === "nobody" ? "Nobody can add new comments to any of your posts, whatever each post’s own setting says." : "Anyone signed in can comment, unless a post has comments off."}>
        <Segmented
          value={prefs.safety.whoCanComment}
          onChange={(whoCanComment) => update("safety", { whoCanComment })}
          options={[
            { value: "everyone", label: "Everyone" },
            { value: "nobody", label: "Nobody" },
          ]}
        />
      </Block>

      <BlockList prefs={prefs} setBlocked={setBlocked} notify={notify} />
    </>
  );
}

function BlockList({ prefs, setBlocked, notify }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const list = prefs.safety.blocked;

  async function send(username, action) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn’t update your block list.");
        return false;
      }
      setBlocked(data.blocked);
      notify(action === "block" ? `Blocked @${username}` : `Unblocked @${username}`);
      return true;
    } catch {
      setError("Network error. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e) {
    e.preventDefault();
    const clean = name.trim().replace(/^@/, "");
    if (!clean || busy) return;
    if (await send(clean, "block")) setName("");
  }

  return (
    <Block
      title="Blocked people"
      hint="You won’t see their posts or comments, they won’t show up in your search, and they can’t comment on your posts."
    >
      <form className="st-add" onSubmit={add}>
        <input
          className="cmp-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Username to block"
          aria-label="Username to block"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={21}
        />
        <button type="submit" className="st-btn primary" disabled={busy || !name.trim()}>
          Block
        </button>
      </form>
      {error && <Notice tone="bad">{error}</Notice>}
      {list.length === 0 ? (
        <p className="st-empty">Nobody blocked. Keep it that way.</p>
      ) : (
        <ul className="st-people">
          {list.map((n) => (
            <li key={n}>
              <span className="st-person-dot" aria-hidden="true">{n.charAt(0).toUpperCase()}</span>
              <Link href={`/u/${n}`} className="st-person-name">@{n}</Link>
              <button type="button" className="st-btn ghost sm" disabled={busy} onClick={() => send(n, "unblock")}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
