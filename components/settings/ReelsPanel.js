"use client";

import { Segmented, Toggle } from "../composer/ui";
import { Block } from "./bits";
import { useSettings } from "./context";
import { REEL_SOUND_KEY } from "@/lib/reels-prefs";

const START_HINTS = {
  foryou: "A mix picked for you from what you watch, like and save, plus what’s popular and new. It reshuffles every visit.",
  hot: "The reel opens on the clips people are watching and liking most right now.",
  new: "The reel opens on the newest clips first.",
};

// Vice Reel: how the video player behaves for you.
export default function ReelsPanel() {
  const { prefs, update } = useSettings();
  const r = prefs.reels;

  function setSound(sound) {
    // This device follows the switch straight away (the reel reads this key first).
    try {
      localStorage.setItem(REEL_SOUND_KEY, sound ? "on" : "off");
    } catch {
      // Storage can be blocked; the account setting still saves.
    }
    update("reels", { sound });
  }

  return (
    <>
      <Block title="Sound">
        <Toggle
          label="Start clips with sound"
          hint="Some browsers block sound until you tap the speaker once. If that happens, the reel starts muted."
          checked={r.sound}
          onChange={setSound}
        />
      </Block>

      <Block title="Opens on" hint={START_HINTS[r.startOn]}>
        <Segmented
          value={r.startOn}
          onChange={(startOn) => update("reels", { startOn })}
          options={[
            { value: "foryou", label: "For you" },
            { value: "hot", label: "Hot" },
            { value: "new", label: "New" },
          ]}
        />
        <p className="st-hint">A clip you open from a post, profile or link always plays first.</p>
      </Block>

      <Block title="Data">
        <Toggle
          label="Data saver"
          hint="Only the clip you’re watching is loaded, not the ones above and below it. The next clip may take a moment to start."
          checked={r.dataSaver}
          onChange={(dataSaver) => update("reels", { dataSaver })}
        />
      </Block>
    </>
  );
}
