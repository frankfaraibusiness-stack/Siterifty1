"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, post } from "@/components/messages/api";
import MentionText from "@/components/MentionText";
import PlanBadges from "@/components/PlanBadges";
import { CHAT_POLL_MS, LOBBY_LIMITS } from "@/lib/lobby-config";
import Avatar from "./Avatar";

const API = "/api/lobby";
const clock = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// One room's live chat. New messages are fetched every few seconds (only what is
// newer than the last one we have), and your own message appears instantly.
export default function RoomChat({ room, live, onLeave, onEnded, notify }) {
  const [messages, setMessages] = useState(null);
  const [meta, setMeta] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const list = useRef(null);
  const stick = useRef(true);
  const lastAt = useRef(0);
  const input = useRef(null);
  // The parent passes a fresh function on every render; keeping it in a ref means
  // the polling loop below doesn't restart (and reload the chat) each time.
  const ended = useRef(onEnded);
  useEffect(() => {
    ended.current = onEnded;
  });

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((cur) => {
      const have = new Set((cur || []).map((m) => m.id));
      const next = [...(cur || []), ...incoming.filter((m) => !have.has(m.id))].sort((a, b) => a.at - b.at);
      lastAt.current = next.length ? next[next.length - 1].at : 0;
      return next.slice(-200);
    });
  }, []);

  // First page, then polling for anything newer.
  useEffect(() => {
    let dead = false;
    let timer;
    const load = async (first) => {
      if (dead) return;
      if (!document.hidden || first) {
        try {
          const d = await api(`${API}?room=${encodeURIComponent(room.id)}${first ? "" : `&since=${lastAt.current}`}`);
          if (dead) return;
          setMeta(d.room);
          if (first) {
            lastAt.current = d.messages.length ? d.messages[d.messages.length - 1].at : 0;
            setMessages(d.messages);
          } else merge(d.messages);
        } catch (err) {
          if (err.data?.ended) {
            ended.current();
            return;
          }
          if (first && !dead) setMessages([]);
        }
      }
      if (!dead) timer = setTimeout(() => load(false), CHAT_POLL_MS);
    };
    load(true);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
  }, [room.id, merge]);

  // Stay glued to the newest message unless the reader has scrolled up.
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = list.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const d = await post(API, { action: "send", roomId: room.id, text: body });
      setText("");
      stick.current = true;
      merge([d.message]);
    } catch (err) {
      if (err.data?.ended) ended.current();
      else notify(err.message);
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }

  async function remove(id) {
    try {
      await post(API, { action: "delete", roomId: room.id, id });
      setMessages((cur) => (cur || []).filter((m) => m.id !== id));
    } catch (err) {
      notify(err.message);
    }
  }

  async function closeSession() {
    if (!window.confirm("Close this session for everyone?")) return;
    try {
      await post(API, { action: "close-room", roomId: room.id });
      onLeave();
    } catch (err) {
      notify(err.message);
    }
  }

  const here = (live?.people || []).filter((p) => p.roomId === room.id);
  const total = live ? (live.official.find((r) => r.id === room.id)?.count ?? live.rooms.find((r) => r.id === room.id)?.count ?? here.length) : here.length;

  return (
    <section className="lb-chat" aria-label={`${room.title} chat`}>
      <header className="lb-chat-head">
        <button type="button" className="lb-back" onClick={onLeave} aria-label="Back to the lobby">
          ←
        </button>
        <div className="lb-chat-title">
          <b>{room.title}</b>
          <small>
            <span className="lb-dot" aria-hidden="true" /> {total} here{meta?.max ? ` · up to ${meta.max}` : ""}
          </small>
        </div>
        {meta?.hostIsMe && (
          <button type="button" className="lb-btn danger" onClick={closeSession}>
            Close session
          </button>
        )}
      </header>

      {here.length > 0 && (
        <div className="lb-chat-here" aria-label="In this room">
          {here.slice(0, 12).map((p) => (
            <Link key={p.username} href={`/u/${p.username}`} title={`@${p.username}`}>
              <Avatar p={p} size={26} />
            </Link>
          ))}
          {here.length > 12 && <span className="lb-fine">+{here.length - 12}</span>}
        </div>
      )}

      <div className="lb-chat-list" ref={list} onScroll={onScroll} role="log" aria-live="polite">
        {messages === null ? (
          <p className="lb-fine center">Joining…</p>
        ) : messages.length === 0 ? (
          <p className="lb-fine center">Quiet in here. Say something.</p>
        ) : (
          messages.map((m) =>
            m.kind === "system" ? (
              <p key={m.id} className="lb-sys">
                @{m.username} {m.text}
              </p>
            ) : (
              <div key={m.id} className={`lb-msg${m.mine ? " mine" : ""}`}>
                <Link href={`/u/${m.username}`} aria-label={`@${m.username}`}>
                  <Avatar p={m} size={30} />
                </Link>
                <div className="lb-msg-body">
                  <div className="lb-msg-top">
                    <Link href={`/u/${m.username}`} className="lb-msg-name">
                      {m.displayName || m.username}
                    </Link>
                    <PlanBadges plan={m.plan} />
                    <time>{clock(m.at)}</time>
                    {m.canDelete && (
                      <button type="button" className="lb-x" onClick={() => remove(m.id)} aria-label="Remove message" title="Remove">
                        ×
                      </button>
                    )}
                  </div>
                  <p>
                    <MentionText text={m.text} />
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>

      <form className="lb-compose" onSubmit={submit}>
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={LOBBY_LIMITS.text}
          placeholder={`Message ${room.title}`}
          aria-label="Message"
          autoComplete="off"
        />
        <button type="submit" className="lb-btn solid" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
