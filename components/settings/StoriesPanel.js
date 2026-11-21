"use client";

import { Toggle } from "../composer/ui";
import { Block, Notice } from "./bits";
import { useSettings } from "./context";
import { STORY_AUDIENCES } from "@/lib/story-schema";

// Story Maker defaults: what a new story starts with. Every story can still be
// changed while you make it.
export default function StoriesPanel() {
  const { prefs, update, openPanel } = useSettings();
  const s = prefs.stories;

  return (
    <>
      {!prefs.feed.stories && (
        <Notice>
          Your home feed is hiding stories, so the Story Maker isn’t shown there.{" "}
          <button type="button" className="st-linkbtn" onClick={() => openPanel("leaks")}>
            Turn them on in Leak Filter
          </button>
        </Notice>
      )}

      <Block
        title="Who can watch new stories"
        hint="Stories stay up for 24 hours. There’s no “only me” on purpose: a story is meant to be seen."
      >
        <div className="st-aud" role="radiogroup" aria-label="Who can watch new stories">
          {STORY_AUDIENCES.map((a) => {
            const on = s.audience === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={on ? "on" : ""}
                onClick={() => update("stories", { audience: a.id })}
              >
                <i aria-hidden="true" />
                <span>
                  <b>{a.label}</b>
                  <small>{a.hint}</small>
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      <Block title="Replies">
        <Toggle
          label="Allow replies on new stories"
          hint="Viewers can send you a reply that only you can read. Turn off and viewers see that replies are disabled."
          checked={s.replies}
          onChange={(replies) => update("stories", { replies })}
        />
        <p className="st-hint">You can change both of these on a single story while you make it.</p>
      </Block>
    </>
  );
}
