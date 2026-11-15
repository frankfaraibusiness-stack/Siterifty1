"use client";

import { useState } from "react";
import { Segmented, Toggle } from "../composer/ui";
import { Block } from "./bits";
import { useSettings } from "./context";
import { LIMITS, cleanWords } from "@/lib/settings";

const SPOILER_HINTS = {
  cover: "Spoiler posts show a cover. Tap to reveal.",
  show: "Spoiler covers are removed, so everything shows straight away.",
  hide: "Posts marked as spoilers never appear in your feed.",
};

// Feed control: how spoilers behave, which words get muted, and what the home
// feed shows.
export default function LeakPanel() {
  const { prefs, update } = useSettings();
  const f = prefs.feed;

  return (
    <>
      <Block title="Spoilers" hint={SPOILER_HINTS[f.spoilers]}>
        <Segmented
          value={f.spoilers}
          onChange={(spoilers) => update("feed", { spoilers })}
          options={[
            { value: "cover", label: "Cover them" },
            { value: "show", label: "Show them" },
            { value: "hide", label: "Hide them" },
          ]}
        />
      </Block>

      <MutedWords words={f.mutedWords} onChange={(mutedWords) => update("feed", { mutedWords })} />

      <Block title="Home feed">
        <Toggle label="Show stories" hint="The story circles above the feed" checked={f.stories} onChange={(stories) => update("feed", { stories })} />
        <Toggle label="Show the post box" hint="The quick “create” card at the top" checked={f.composer} onChange={(composer) => update("feed", { composer })} />
        <div className="st-spaced">
          <Segmented
            label="Order"
            value={f.order}
            onChange={(order) => update("feed", { order })}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "hot", label: "Hot first" },
            ]}
          />
          <Segmented
            label="Posts to load"
            value={String(f.length)}
            onChange={(v) => update("feed", { length: Number(v) })}
            options={[
              { value: "15", label: "15" },
              { value: "30", label: "30" },
              { value: "60", label: "60" },
            ]}
          />
        </div>
        <p className="st-hint">“Hot first” lifts the posts with the most likes and comments within the latest batch.</p>
      </Block>
    </>
  );
}

function MutedWords({ words, onChange }) {
  const [text, setText] = useState("");
  const full = words.length >= LIMITS.mutedWords;

  function add(raw) {
    const next = cleanWords([...words, raw]);
    if (next.length !== words.length) onChange(next);
    setText("");
  }

  return (
    <Block
      title="Muted words"
      hint="Posts that mention a muted word or hashtag in the title, text or tags are hidden from your feed. Your own posts always show."
    >
      {words.length > 0 && (
        <div className="cmp-chips selected">
          {words.map((w) => (
            <button key={w} type="button" className="cmp-chip on" onClick={() => onChange(words.filter((x) => x !== w))} aria-label={`Unmute ${w}`}>
              {w} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <input
        className="cmp-input"
        value={text}
        disabled={full}
        maxLength={LIMITS.wordMax}
        placeholder={full ? "That’s the limit" : "Type a word and press Enter"}
        aria-label="Add a muted word"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && words.length) {
            onChange(words.slice(0, -1));
          }
        }}
      />
      <p className="st-hint">{words.length}/{LIMITS.mutedWords} muted. Tap a word to unmute it.</p>
    </Block>
  );
}
