"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HeartIcon, SendIcon, XIcon } from "./icons";
import { formatCount } from "@/lib/format-count";

const MAX = 500;
const JSON_HEADERS = { "Content-Type": "application/json" };

function Avatar({ who }) {
  const name = who.user || who.username;
  return (
    <Link
      href={`/u/${name}`}
      className="cm-avatar"
      style={{ "--a": who.a, "--b": who.b }}
      aria-label={`${name}'s profile`}
    >
      {who.initial}
      {who.hasAvatar && (
        <span
          className="cm-avatar-img"
          style={{
            backgroundImage: `url("/avatar/${name}?v=${who.avatarV}")`,
          }}
        />
      )}
    </Link>
  );
}

// Bottom sheet on phones, centered dialog on desktop. Rendered in a portal
// so the post card's hover transform/overflow can't trap it.
export default function CommentsSheet({ postId, postUser, count, onCountChange, onClose }) {
  const [status, setStatus] = useState("loading");
  const [comments, setComments] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [sort, setSort] = useState("newest");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const sheetRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const drag = useRef({ y: 0, dy: 0, active: false });

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/posts/comments?postId=${encodeURIComponent(postId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setComments(data.comments);
      setViewer(data.viewer);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const close = useCallback(() => {
    const el = sheetRef.current;
    const phone = window.innerWidth <= 640;
    if (el) {
      el.style.transition = "transform .22s ease, opacity .22s ease";
      el.style.transform = phone ? "translateY(105%)" : "scale(.97)";
      el.style.opacity = phone ? "1" : "0";
      el.parentElement?.classList.add("closing");
    }
    setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Lock page scroll while open; focus the box only on desktop so a phone's
  // keyboard doesn't pop up over the comments.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !viewer) return;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, [status, viewer]);

  // Keep the sheet above the on-screen keyboard (iOS Safari especially).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      sheetRef.current?.style.setProperty("--cm-kb", `${kb}px`);
    }
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const sorted = useMemo(() => {
    const copy = [...comments];
    if (sort === "top") {
      copy.sort((a, b) => b.likes - a.likes || b.createdAtMs - a.createdAtMs);
    } else {
      copy.sort((a, b) => b.createdAtMs - a.createdAtMs);
    }
    return copy;
  }, [comments, sort]);

  function patch(id, changes) {
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  async function submit(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending || !viewer) return;

    setSending(true);
    setError("");
    const tempId = `tmp-${Date.now()}`;
    setComments((cs) => [
      {
        id: tempId,
        user: viewer.username,
        initial: viewer.initial,
        a: viewer.a,
        b: viewer.b,
        hasAvatar: viewer.hasAvatar,
        avatarV: viewer.avatarV,
        text: body,
        timeAgo: "just now",
        createdAtMs: Date.now(),
        likes: 0,
        likedByMe: false,
        mine: true,
        canDelete: false,
        pending: true,
      },
      ...cs,
    ]);
    setText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setSort("newest");
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    onCountChange((n) => n + 1);

    try {
      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId, text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't post your comment.");
      setComments((cs) => cs.map((c) => (c.id === tempId ? data.comment : c)));
      onCountChange(data.count);
    } catch (err) {
      setComments((cs) => cs.filter((c) => c.id !== tempId));
      onCountChange((n) => Math.max(0, n - 1));
      setText(body);
      setError(err.message || "Couldn't post your comment.");
    } finally {
      setSending(false);
    }
  }

  async function remove(c) {
    setConfirmId(null);
    setError("");
    const before = comments;
    setComments((cs) => cs.filter((x) => x.id !== c.id));
    onCountChange((n) => Math.max(0, n - 1));
    try {
      const res = await fetch("/api/posts/comments", {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId, commentId: c.id }),
      });
      if (!res.ok) throw new Error("delete failed");
      const data = await res.json();
      onCountChange(data.count);
    } catch {
      setComments(before);
      onCountChange((n) => n + 1);
      setError("Couldn't delete that comment.");
    }
  }

  async function like(c) {
    if (!viewer) {
      setError("Log in to like comments.");
      return;
    }
    if (c.pending) return;
    setError("");
    const next = !c.likedByMe;
    patch(c.id, { likedByMe: next, likes: Math.max(0, c.likes + (next ? 1 : -1)) });
    try {
      const res = await fetch("/api/posts/comments/like", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId, commentId: c.id }),
      });
      if (!res.ok) throw new Error("like failed");
      const data = await res.json();
      patch(c.id, { likedByMe: data.liked, likes: data.likes });
    } catch {
      patch(c.id, { likedByMe: c.likedByMe, likes: c.likes });
    }
  }

  function onKeyDown(e) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      window.matchMedia("(pointer: fine)").matches
    ) {
      e.preventDefault();
      submit();
    }
  }

  function onInput(e) {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  // Swipe the header down to dismiss (phone).
  function touchStart(e) {
    drag.current = { y: e.touches[0].clientY, dy: 0, active: true };
    if (sheetRef.current) sheetRef.current.style.transition = "none";
  }
  function touchMove(e) {
    if (!drag.current.active || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  }
  function touchEnd() {
    const el = sheetRef.current;
    if (!el || !drag.current.active) return;
    drag.current.active = false;
    if (drag.current.dy > 110) {
      close();
    } else {
      el.style.transition = "transform .2s ease";
      el.style.transform = "";
    }
  }

  return createPortal(
    <div
      className="cm-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="cm-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
      >
        <div
          className="cm-top"
          onTouchStart={touchStart}
          onTouchMove={touchMove}
          onTouchEnd={touchEnd}
          onTouchCancel={touchEnd}
        >
          <span className="cm-grab" />
          <div className="cm-head">
            <h2 className="cm-title">
              Comments <em>{formatCount(count)}</em>
            </h2>
            <div className="cm-sort">
              {[
                ["newest", "Newest"],
                ["top", "Top"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`cm-sort-btn${sort === id ? " active" : ""}`}
                  onClick={() => setSort(id)}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="pf-icon-btn"
              onClick={close}
              onTouchStart={(e) => e.stopPropagation()}
              aria-label="Close comments"
            >
              <span className="pf-ico">
                <XIcon />
              </span>
            </button>
          </div>
        </div>

        <div className="cm-list" ref={listRef}>
          {status === "loading" && (
            <ul className="cm-ul" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <li className="cm-skel" key={i}>
                  <span className="cm-skel-dot" />
                  <span className="cm-skel-lines">
                    <span />
                    <span />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {status === "error" && (
            <div className="cm-state">
              <p>Couldn&apos;t load comments.</p>
              <button
                type="button"
                className="pf-btn pf-btn-ghost"
                onClick={() => {
                  setStatus("loading");
                  load();
                }}
              >
                Try again
              </button>
            </div>
          )}

          {status === "ready" && sorted.length === 0 && (
            <div className="cm-state">
              <div className="cm-state-icon">
                <HeartIcon />
              </div>
              <p className="cm-state-title">No comments yet</p>
              <p>Be the first to say something.</p>
            </div>
          )}

          {status === "ready" && sorted.length > 0 && (
            <ul className="cm-ul">
              {sorted.map((c) => (
                <li className={`cm-item${c.pending ? " pending" : ""}`} key={c.id}>
                  <Avatar who={c} />
                  <div className="cm-body">
                    <div className="cm-meta">
                      <Link href={`/u/${c.user}`} className="cm-user">
                        {c.user}
                      </Link>
                      {c.user === postUser && <span className="cm-op">Author</span>}
                      <span className="cm-time">{c.timeAgo}</span>
                    </div>
                    <p className="cm-text">{c.text}</p>
                    {c.canDelete && !c.pending && (
                      <div className="cm-actions">
                        {confirmId === c.id ? (
                          <>
                            <button
                              type="button"
                              className="cm-link-btn danger"
                              onClick={() => remove(c)}
                            >
                              Delete?
                            </button>
                            <button
                              type="button"
                              className="cm-link-btn"
                              onClick={() => setConfirmId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="cm-link-btn"
                            onClick={() => setConfirmId(c.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`cm-like${c.likedByMe ? " liked" : ""}`}
                    onClick={() => like(c)}
                    aria-label={c.likedByMe ? "Unlike comment" : "Like comment"}
                    aria-pressed={c.likedByMe}
                  >
                    <HeartIcon />
                    <span>{c.likes > 0 ? formatCount(c.likes) : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="cm-error" role="alert">
            {error}
          </div>
        )}

        {viewer ? (
          <form className="cm-composer" onSubmit={submit}>
            <Avatar who={viewer} />
            <div className="cm-field">
              <textarea
                ref={inputRef}
                className="cm-input"
                value={text}
                rows={1}
                maxLength={MAX}
                placeholder="Add a comment..."
                aria-label="Add a comment"
                onChange={onInput}
                onKeyDown={onKeyDown}
              />
              {text.length > 400 && (
                <span className="cm-count">{MAX - text.length}</span>
              )}
            </div>
            <button
              type="submit"
              className="cm-send"
              disabled={!text.trim() || sending}
              aria-label="Post comment"
            >
              <SendIcon />
            </button>
          </form>
        ) : (
          status === "ready" && (
            <div className="cm-login">Log in to join the conversation.</div>
          )
        )}
      </div>
    </div>,
    document.body
  );
}
