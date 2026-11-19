"use client";

import { useEffect, useRef, useState } from "react";
import { STORY } from "@/lib/story-schema";
import { SendIcon } from "./icons";

// The reply box at the bottom of someone else's story. The story pauses while
// you type; sending drops the reply into the owner's replies list.
export default function ReplyForm({ story, signedIn, onTyping, onNeedAuth, onNotice }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const input = useRef(null);
  const typing = useRef(onTyping);
  useEffect(() => {
    typing.current = onTyping;
  });
  // Moving to another story must never leave the viewer paused.
  useEffect(() => () => typing.current(false), []);

  async function submit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    if (!signedIn) return onNeedAuth?.();
    setSending(true);
    try {
      const res = await fetch("/api/stories/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: story.id, text: value }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "");
      setText("");
      input.current?.blur();
      onNotice(`Reply sent to @${story.username}`);
    } catch (err) {
      onNotice(err instanceof TypeError || !err.message ? "Couldn’t send that reply. Try again." : err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="sv-reply" onSubmit={submit}>
      <input
        ref={input}
        value={text}
        maxLength={STORY.reply}
        placeholder={`Reply to @${story.username}`}
        aria-label={`Reply to ${story.username}’s story`}
        enterKeyHint="send"
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onFocus={() => (signedIn ? onTyping(true) : input.current?.blur() || onNeedAuth?.())}
        onBlur={() => onTyping(false)}
        disabled={sending}
      />
      <button type="submit" className="sv-reply-go" disabled={!text.trim() || sending} aria-label="Send reply">
        <SendIcon />
      </button>
    </form>
  );
}
