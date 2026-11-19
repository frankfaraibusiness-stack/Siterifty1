"use client";

import { Segmented, Toggle } from "../composer/ui";
import { Block } from "./bits";
import { useSettings } from "./context";
import { applyAccess, isDefaultAccess, sanitizeAccess } from "@/lib/access";

const CONTRAST_HINTS = {
  normal: "The standard City colours.",
  high: "Brighter text and stronger outlines, so words and borders stand out from the background.",
};

// Accessibility: changes apply to the whole site straight away. (Text size and
// reduced motion live in City Look.)
export default function AccessPanel() {
  const { prefs, update } = useSettings();
  const a = prefs.access;

  function change(patch) {
    applyAccess(sanitizeAccess({ ...a, ...patch }));
    update("access", patch);
  }

  return (
    <>
      <Block title="Contrast" hint={CONTRAST_HINTS[a.contrast]}>
        <Segmented
          value={a.contrast}
          onChange={(contrast) => change({ contrast })}
          options={[
            { value: "normal", label: "Standard" },
            { value: "high", label: "High contrast" },
          ]}
        />
      </Block>

      <Block title="Links">
        <Toggle
          label="Underline links"
          hint="@mentions, #tags and links in posts and comments get an underline, so they don’t rely on colour alone."
          checked={a.links}
          onChange={(links) => change({ links })}
        />
      </Block>

      <Block title="Buttons and taps" hint="Bigger buttons are easier to hit on a phone.">
        <Segmented
          value={a.targets}
          onChange={(targets) => change({ targets })}
          options={[
            { value: "default", label: "Standard" },
            { value: "large", label: "Bigger buttons" },
          ]}
        />
      </Block>

      <Block title="Also look in City Look" hint="Text size and Reduce motion are in City Look, so they sit with the other colour and mood choices.">
        {!isDefaultAccess(a) && (
          <button type="button" className="st-btn ghost" onClick={() => change({ contrast: "normal", links: false, targets: "default" })}>
            Back to standard
          </button>
        )}
      </Block>
    </>
  );
}
