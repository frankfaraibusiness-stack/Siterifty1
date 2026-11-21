"use client";

import { useEffect, useRef, useState } from "react";
import { STORY } from "@/lib/story-schema";
import { SendIcon } from "./icons";

const newReplyId = () => {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
};

// The reply box at the bottom of someone else's story. The story pauses while you type; sending drops
// the reply into the owner's replies list.
//
// Rebuilt so that it is never torn down and re-created when the viewer moves to the next story:
// ONE <form> and ONE <input> stay mounted, and when `story.id` changes the draft is simply reset.
// (Re-mounting a focused, blurred-background input on every story is what produced the doubled box.)
export default function ReplyForm({ story, signedIn, onTyping, onNeedAuth, onNotice }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [forId, setForId] = useState(story.id);
  const input = useRef(null);

  // Reset the draft during render the moment the story changes, so a frame with the old text
  // for the new story is never painted.
  if (forId !== story.id) {
    setForId(story.id);
    setText("");
    setSending(false);
  }

  // `run` is bumped on every story change. A send that finishes after the viewer has moved on
  // sees a different number and leaves the new story's box alone.
  const run = useRef(0);
  // Double-send protection: flips at once (state only updates on the next render, so a fast double tap
  // or Enter + button could otherwise start two sends). `attempt` is the reply's own id: it stays the
  // same while the SAME text is retried after a failure, so the server can tell "again" from "another one".
  const busy = useRef(false);
  const attempt = useRef({ id: "", text: "" });

  const cb = useRef({ onTyping, onNeedAuth, onNotice });
  useEffect(() => {
    cb.current = { onTyping, onNeedAuth, onNotice };
  });

  // New story: drop in-flight bookkeeping, close the keyboard, un-pause the viewer.
  useEffect(() => {
    run.current += 1;
    busy.current = false;
    attempt.current = { id: "", text: "" };
    const el = input.current;
    if (el && document.activeElement === el) el.blur();
    cb.current.onTyping(false);
  }, [story.id]);

  // Leaving entirely (closing the viewer, replies turned off) must never leave it paused.
  useEffect(() => () => cb.current.onTyping(false), []);

  async function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy.current) return;
    if (!signedIn) return cb.current.onNeedAuth?.();

    const mine = run.current;
    const owner = story.username;
    const id = story.id;
    busy.current = true;
    setSending(true);
    if (!attempt.current.id || attempt.current.text !== value) {
      attempt.current = { id: newReplyId(), text: value };
    }

    try {
      const res = await fetch("/api/stories/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text: value, rid: attempt.current.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "");
      if (run.current === mine) {
        attempt.current = { id: "", text: "" }; // sent: the next reply is a new one
        setText("");
        input.current?.blur();
      }
      cb.current.onNotice(`Reply sent to @${owner}`);
    } catch (err) {
      cb.current.onNotice(err instanceof TypeError || !err.message ? "Couldn’t send that reply. Try again." : err.message);
    } finally {
      if (run.current === mine) {
        busy.current = false;
        setSending(false);
      }
    }
  }

  function onFocus(e) {
    if (!signedIn) {
      e.currentTarget.blur();
      cb.current.onNeedAuth?.();
      return;
    }
    cb.current.onTyping(true);
  }

  return (
    <form className="sv-reply" onSubmit={submit} autoComplete="off" noValidate>
      <input
        ref={input}
        type="text"
        value={text}
        maxLength={STORY.reply}
        placeholder={`Reply to @${story.username}`}
        aria-label={`Reply to ${story.username}’s story`}
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="on"
        spellCheck={false}
        // readOnly, not disabled: disabling a focused input drops focus and the keyboard mid-send.
        readOnly={sending}
        onChange={(e) => setText(e.target.value)}
        onFocus={onFocus}
        onBlur={() => cb.current.onTyping(false)}
      />
      <button
        type="submit"
        className="sv-reply-go"
        disabled={!text.trim() || sending}
        aria-label="Send reply"
        // Keep focus in the input while tapping send, so the story doesn't resume for a moment.
        onPointerDown={(e) => e.preventDefault()}
      >
        <SendIcon />
      </button>
    </form>
  );
}
