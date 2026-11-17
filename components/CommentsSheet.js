"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HeartIcon, SendIcon, XIcon } from "./icons";
import PlanBadges from "./PlanBadges";
import MemberLogoBadge from "./MemberLogoBadge";
import { formatCount } from "@/lib/format-count";
import { getPlan, pinHours, planRank } from "@/lib/plans";
import { FOREVER_PIN_UNTIL_MS, commentMax, hasPerk } from "@/lib/perks";
import { FlairBadge, FlairName, haloClass } from "./Flair";
import MentionText from "./MentionText";

// Pin colours for Perks Shop > Forever Pin (plan pins use their plan colours).
const FOREVER = { a: "#ffd36b", b: "#ff7a59" };
const JSON_HEADERS = { "Content-Type": "application/json" };
// Longer comments fold behind "Read more".
const FOLD_AT = 280;

// Unsent comment text is kept per post, so closing the sheet by accident
// doesn't lose it. Storage can be blocked, so every touch is guarded.
const draftKey = (postId) => `gta6fb:comment-draft:${postId}`;
function readDraft(postId) {
  try {
    return localStorage.getItem(draftKey(postId)) || "";
  } catch {
    return "";
  }
}
function writeDraft(postId, value) {
  try {
    if (value) localStorage.setItem(draftKey(postId), value);
    else localStorage.removeItem(draftKey(postId));
  } catch {
    // Storage unavailable: the draft just isn't kept.
  }
}

function formatLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// Live countdown for a pinned comment. `offset` lines the browser clock up
// with the server's, so a wrong device clock can't stretch or cut a pin short.
function PinTimer({ until, offset }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const left = until - (Date.now() + offset);
  return (
    <span className="cm-pin" title="This comment is pinned to the top for a limited time">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 3.5l6 6-2.2.9-3.1 3.1.4 4.3-1.4 1.4-3.6-3.6-5 5-1-1 5-5-3.6-3.6 1.4-1.4 4.3.4 3.1-3.1.9-2.2z" />
      </svg>
      Pinned · {formatLeft(left)} left
    </span>
  );
}

function ForeverTag() {
  return (
    <span className="cm-pin cm-pin-forever" title="This comment is pinned to the top forever">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 3.5l6 6-2.2.9-3.1 3.1.4 4.3-1.4 1.4-3.6-3.6-5 5-1-1 5-5-3.6-3.6 1.4-1.4 4.3.4 3.1-3.1.9-2.2z" />
      </svg>
      Pinned forever
    </span>
  );
}

function Avatar({ who }) {
  const name = who.user || who.username;
  return (
    <Link
      href={`/u/${name}`}
      className={`cm-avatar${haloClass(who.flair)}`}
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
  const [text, setText] = useState(() => readDraft(postId));
  // Editing your own comment in place: { id, text, saving }.
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  // Replying to a comment: { id (what was clicked), rootId (top-level comment it
  // hangs under), user }. Threads are one level deep, like most feeds.
  const [replyTo, setReplyTo] = useState(null);
  const [openThreads, setOpenThreads] = useState(() => new Set());
  const [loadingThreads, setLoadingThreads] = useState(() => new Set());
  // Server-clock time of the last pin check, and how far the browser clock is
  // from the server's. Pins are decided against these, never a cron job.
  const [offset, setOffset] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const max = commentMax(viewer?.perks);
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
      setOffset(data.serverNow - Date.now());
      setNowMs(data.serverNow);
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

  // When the next pin runs out, re-check so that comment drops out of the
  // pinned group (and its countdown disappears) without a reload.
  useEffect(() => {
    if (status !== "ready") return;
    // Forever pins never run out, so they are skipped (a timer that long would
    // overflow setTimeout and fire at once).
    const upcoming = comments
      .filter((c) => !c.pinForever)
      .map((c) => c.pinnedUntilMs)
      .filter((ms) => ms > nowMs);
    if (upcoming.length === 0) return;
    const wait = Math.min(Math.min(...upcoming) - (Date.now() + offset), 2_000_000_000);
    const t = setTimeout(() => setNowMs(Date.now() + offset), Math.max(wait, 0) + 300);
    return () => clearTimeout(t);
  }, [comments, nowMs, offset, status]);

  // Replies grouped under their top-level comment, oldest first.
  const byParent = useMemo(() => {
    const map = new Map();
    for (const c of comments) {
      if (!c.parentId) continue;
      if (!map.has(c.parentId)) map.set(c.parentId, []);
      map.get(c.parentId).push(c);
    }
    for (const list of map.values()) list.sort((a, b) => a.createdAtMs - b.createdAtMs);
    return map;
  }, [comments]);

  const sorted = useMemo(() => {
    const copy = comments.filter((c) => !c.parentId);
    // Comments whose pin is still running come first (higher plan first),
    // then the chosen order (newest or most liked). Once a pin runs out the
    // comment ranks like everyone else's.
    // Forever Pin comments sit above every plan pin.
    const pinRank = (c) =>
      c.pinnedUntilMs > nowMs ? (c.pinForever ? 99 : planRank(c.pinPlan || c.plan)) : 0;
    const byPlan = (a, b) => pinRank(b) - pinRank(a);
    if (sort === "top") {
      copy.sort((a, b) => byPlan(a, b) || b.likes - a.likes || b.createdAtMs - a.createdAtMs);
    } else {
      copy.sort((a, b) => byPlan(a, b) || b.createdAtMs - a.createdAtMs);
    }
    return copy;
  }, [comments, sort, nowMs]);

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
    const target = replyTo;
    const tempComment = {
        id: tempId,
        user: viewer.username,
        initial: viewer.initial,
        a: viewer.a,
        b: viewer.b,
        hasAvatar: viewer.hasAvatar,
        avatarV: viewer.avatarV,
        plan: viewer.plan,
        glow: hasPerk(viewer.perks, "neon_glow"),
        flair: viewer.flair,
        pinForever: hasPerk(viewer.perks, "forever_pin"),
        pinPlan: pinHours(viewer.plan) ? viewer.plan : null,
        pinnedUntilMs: hasPerk(viewer.perks, "forever_pin")
          ? FOREVER_PIN_UNTIL_MS
          : pinHours(viewer.plan)
          ? Date.now() + offset + pinHours(viewer.plan) * 3_600_000
          : 0,
        text: body,
        timeAgo: "just now",
        createdAtMs: Date.now(),
        likes: 0,
        likedByMe: false,
        mine: true,
        canDelete: false,
        pending: true,
        parentId: target ? target.rootId : null,
        replyToUser: target && target.id !== target.rootId ? target.user : null,
        replyCount: 0,
    };
    setComments((cs) => {
      const next = [tempComment, ...cs];
      return target
        ? next.map((c) =>
            c.id === target.rootId ? { ...c, replyCount: c.replyCount + 1 } : c
          )
        : next;
    });
    setText("");
    if (!target) writeDraft(postId, "");
    setReplyTo(null);
    if (inputRef.current) inputRef.current.style.height = "auto";
    if (target) {
      setOpenThreads((s) => new Set(s).add(target.rootId));
    } else {
      setSort("newest");
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    onCountChange((n) => n + 1);

    try {
      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId, text: body, parentId: target ? target.id : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't post your comment.");
      setComments((cs) => cs.map((c) => (c.id === tempId ? data.comment : c)));
      onCountChange(data.count);
    } catch (err) {
      setComments((cs) =>
        cs
          .filter((c) => c.id !== tempId)
          .map((c) =>
            target && c.id === target.rootId
              ? { ...c, replyCount: Math.max(0, c.replyCount - 1) }
              : c
          )
      );
      onCountChange((n) => Math.max(0, n - 1));
      setReplyTo(target);
      setText(body);
      if (!target) writeDraft(postId, body);
      setError(err.message || "Couldn't post your comment.");
    } finally {
      setSending(false);
    }
  }

  async function remove(c) {
    setConfirmId(null);
    setError("");
    const before = comments;
    // A top-level comment takes its replies with it.
    const gone = 1 + (c.parentId ? 0 : c.replyCount);
    setComments((cs) =>
      cs
        .filter((x) => x.id !== c.id && x.parentId !== c.id)
        .map((x) =>
          c.parentId && x.id === c.parentId
            ? { ...x, replyCount: Math.max(0, x.replyCount - 1) }
            : x
        )
    );
    if (replyTo && (replyTo.id === c.id || replyTo.rootId === c.id)) setReplyTo(null);
    onCountChange((n) => Math.max(0, n - gone));
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
      onCountChange((n) => n + gone);
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
      patch(c.id, {
        likedByMe: data.liked,
        likes: data.likes,
        ...(viewer.username === postUser ? { likedByAuthor: data.liked } : null),
      });
    } catch {
      patch(c.id, { likedByMe: c.likedByMe, likes: c.likes });
    }
  }

  async function saveEdit() {
    if (!editing || editing.saving) return;
    const body = editing.text.trim();
    if (!body) return;
    setError("");
    setEditing({ ...editing, saving: true });
    try {
      const res = await fetch("/api/posts/comments", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ postId, commentId: editing.id, text: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save that edit.");
      patch(editing.id, { text: data.text, edited: true });
      setEditing(null);
    } catch (err) {
      setEditing((e) => (e ? { ...e, saving: false } : e));
      setError(err.message || "Couldn't save that edit.");
    }
  }

  function startReply(c) {
    if (!viewer || c.pending) return;
    setError("");
    // Tapping Reply only starts a reply; it never expands the thread. Replies
    // open when the person taps "View replies" (or after they post their own).
    setReplyTo({ id: c.id, rootId: c.parentId || c.id, user: c.user });
    inputRef.current?.focus();
  }

  // Opens or closes a thread; replies that weren't in the first load (the page
  // only carries the newest) are fetched the first time it opens.
  async function toggleThread(root) {
    const isOpen = openThreads.has(root.id);
    setOpenThreads((s) => {
      const next = new Set(s);
      if (isOpen) next.delete(root.id);
      else next.add(root.id);
      return next;
    });
    if (isOpen) return;
    const loaded = byParent.get(root.id)?.length || 0;
    if (loaded >= root.replyCount || loadingThreads.has(root.id)) return;
    setLoadingThreads((s) => new Set(s).add(root.id));
    try {
      const res = await fetch(
        `/api/posts/comments?postId=${encodeURIComponent(postId)}&parentId=${encodeURIComponent(root.id)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setComments((cs) => [...cs.filter((c) => c.parentId !== root.id), ...data.comments]);
    } catch {
      setError("Couldn't load those replies.");
    } finally {
      setLoadingThreads((s) => {
        const next = new Set(s);
        next.delete(root.id);
        return next;
      });
    }
  }

  // One comment or reply: avatar, name (tap either for the profile), text,
  // small Reply / Delete links and the like heart.
  function renderRow(c, isReply) {
    const pinned = !isReply && c.pinnedUntilMs > nowMs;
    const replies = isReply ? [] : byParent.get(c.id) || [];
    const threadOpen = openThreads.has(c.id);
    return (
      <li
        className={`cm-item${isReply ? " cm-reply" : ""}${c.pending ? " pending" : ""}${
          pinned
            ? c.pinForever
              ? " is-plan is-forever"
              : ` is-plan plan-${c.pinPlan || c.plan}`
            : ""
        }${c.glow ? " has-glow" : ""}`}
        style={{
          ...(pinned
            ? {
                "--pa": c.pinForever ? FOREVER.a : getPlan(c.pinPlan || c.plan).a,
                "--pb": c.pinForever ? FOREVER.b : getPlan(c.pinPlan || c.plan).b,
              }
            : null),
          ...(c.glow ? { "--ga": c.a, "--gb": c.b } : null),
        }}
        key={c.id}
      >
        <Avatar who={c} />
        <div className="cm-body">
          <div className="cm-meta">
            <Link href={`/u/${c.user}`} className="cm-user">
              <FlairName flair={c.flair} a={c.a} b={c.b}>{c.user}</FlairName>
            </Link>
            <MemberLogoBadge plan={c.plan} />
            <PlanBadges plan={c.plan} />
            <FlairBadge flair={c.flair} />
            {c.user === postUser && <span className="cm-op">Author</span>}
            <span className="cm-time">
              {c.timeAgo}
              {c.edited && <em className="cm-edited"> · edited</em>}
            </span>
            {c.likedByAuthor && (
              <span className="cm-byauthor" title="The author liked this comment">
                <HeartIcon /> Author
              </span>
            )}
            {pinned &&
              (c.pinForever ? (
                <ForeverTag />
              ) : (
                <PinTimer until={c.pinnedUntilMs} offset={offset} />
              ))}
          </div>
          {editing?.id === c.id ? (
            <div className="cm-edit">
              <textarea
                className="cm-input"
                value={editing.text}
                maxLength={max}
                rows={3}
                autoFocus
                aria-label="Edit your comment"
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setEditing(null);
                  }
                }}
              />
              <div className="cm-edit-bar">
                <button type="button" className="cm-link-btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn-primary pf-btn-sm"
                  onClick={saveEdit}
                  disabled={!editing.text.trim() || editing.saving}
                >
                  {editing.saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="cm-text">
              {c.replyToUser && (
                <Link href={`/u/${c.replyToUser}`} className="cm-mention">
                  @{c.replyToUser}
                </Link>
              )}
              {c.replyToUser ? " " : ""}
              <MentionText
                text={
                  c.text.length > FOLD_AT && !expanded.has(c.id)
                    ? `${c.text.slice(0, FOLD_AT).trimEnd()}…`
                    : c.text
                }
              />
              {c.text.length > FOLD_AT && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="cm-more"
                    onClick={() =>
                      setExpanded((set) => {
                        const next = new Set(set);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  >
                    {expanded.has(c.id) ? "Show less" : "Read more"}
                  </button>
                </>
              )}
            </p>
          )}
          {!c.pending && (
            <div className="cm-actions">
              {viewer && (
                <button type="button" className="cm-link-btn" onClick={() => startReply(c)}>
                  Reply
                </button>
              )}
              {c.mine && editing?.id !== c.id && (
                <button
                  type="button"
                  className="cm-link-btn"
                  onClick={() => setEditing({ id: c.id, text: c.text, saving: false })}
                >
                  Edit
                </button>
              )}
              {c.canDelete &&
                (confirmId === c.id ? (
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
                ))}
            </div>
          )}
          {!isReply && c.replyCount > 0 && (
            <button
              type="button"
              className="cm-thread-btn"
              onClick={() => toggleThread(c)}
              aria-expanded={threadOpen}
            >
              <span className="cm-thread-line" />
              {threadOpen
                ? "Hide replies"
                : `View ${formatCount(c.replyCount)} ${c.replyCount === 1 ? "reply" : "replies"}`}
              {loadingThreads.has(c.id) && <em> · loading…</em>}
            </button>
          )}
          {!isReply && threadOpen && replies.length > 0 && (
            <ul className="cm-ul cm-replies">{replies.map((r) => renderRow(r, true))}</ul>
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
    );
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
    if (!replyTo) writeDraft(postId, e.target.value);
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
              {sorted.map((c) => renderRow(c, false))}
            </ul>
          )}
        </div>

        {error && (
          <div className="cm-error" role="alert">
            {error}
          </div>
        )}

        {viewer && replyTo && (
          <div className="cm-replying">
            <span>
              Replying to <b>@{replyTo.user}</b>
            </span>
            <button
              type="button"
              className="cm-replying-x"
              onClick={() => setReplyTo(null)}
              aria-label="Cancel reply"
            >
              <XIcon />
            </button>
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
                maxLength={max}
                placeholder={replyTo ? `Reply to @${replyTo.user}...` : "Add a comment..."}
                aria-label={replyTo ? "Write a reply" : "Add a comment"}
                onChange={onInput}
                onKeyDown={onKeyDown}
              />
              {text.length > max - 100 && (
                <span className="cm-count">{max - text.length}</span>
              )}
            </div>
            <button
              type="submit"
              className="cm-send"
              disabled={!text.trim() || sending}
              aria-label={replyTo ? "Post reply" : "Post comment"}
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
