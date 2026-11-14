"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PostMedia from "./PostMedia";
import PollCard from "./PollCard";
import TheoryBlock from "./TheoryBlock";
import CommentsSheet from "./CommentsSheet";
import { HeartIcon, CommentIcon, ShareIcon, SaveIcon } from "./icons";
import { formatCount } from "@/lib/format-count";
import { TYPES } from "@/lib/post-schema";

// `preview` renders the card exactly as it will look in the feed, but inert:
// the composer uses it so the preview can never drift from the real thing.
export default function PostCard({ post, preview = false }) {
  const router = useRouter();
  const s = post.settings;
  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [pulse, setPulse] = useState(false);
  const [saved, setSaved] = useState(post.savedByMe);
  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [covered, setCovered] = useState(!!s.spoiler);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [gone, setGone] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 2200);
    return () => clearTimeout(t);
  }, [note]);

  if (gone) return null;

  const displayedLikes = formatCount(likesCount);
  const typeInfo = post.type && post.type !== "post" ? TYPES[post.type] : null;
  const hasTitleBody = post.type === "theory";

  async function toggleLike() {
    if (busy || preview) return;
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikesCount((c) => (nowLiked ? c + 1 : Math.max(0, c - 1)));
    setPulse(false);
    if (nowLiked) requestAnimationFrame(() => setPulse(true));

    setBusy(true);
    try {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) {
        setLiked(!nowLiked);
        setLikesCount((c) => (nowLiked ? Math.max(0, c - 1) : c + 1));
        return;
      }
      const data = await res.json();
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch {
      setLiked(!nowLiked);
      setLikesCount((c) => (nowLiked ? Math.max(0, c - 1) : c + 1));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSave() {
    if (preview) return;
    const nowSaved = !saved;
    setSaved(nowSaved);
    try {
      const res = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) {
        setSaved(!nowSaved);
        return;
      }
      setSaved((await res.json()).saved);
    } catch {
      setSaved(!nowSaved);
    }
  }

  function handleDoubleClick() {
    if (!liked) toggleLike();
    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
  }

  async function copyLink() {
    setMenu(false);
    if (preview) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/p/${post.id}`);
      setNote("Link copied");
    } catch {
      setNote("Couldn’t copy the link");
    }
  }

  async function share() {
    if (preview) return;
    const url = `${location.origin}/p/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || `${post.user} on GTA6FanBase`, url });
      } catch {
        // The share sheet was dismissed.
      }
    } else {
      copyLink();
    }
  }

  async function remove() {
    setMenu(false);
    if (preview || !window.confirm("Delete this post? This can’t be undone.")) return;
    const res = await fetch("/api/posts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id }),
    });
    if (res.ok) {
      setGone(true);
      router.refresh();
    } else {
      setNote("Couldn’t delete that post");
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className={`post${typeInfo ? " post-typed" : ""}`}
      style={typeInfo ? { "--a": typeInfo.a, "--b": typeInfo.b } : undefined}
    >
      <div className="post-head">
        <div className="post-avatar" style={{ "--a": post.avatarA, "--b": post.avatarB }}>
          {post.initial}
        </div>
        <div className="post-meta">
          <div className="post-user">{post.user}</div>
          <div className="post-sub">
            {post.location} &middot; {post.scheduled ? "Scheduled" : post.timeAgo}
            {s.visibility === "private" && <> &middot; Only you</>}
            {s.pinned && <> &middot; Pinned</>}
          </div>
        </div>
        {typeInfo && <span className="post-type">{typeInfo.label}</span>}
        <div className="post-menu-wrap" ref={menuRef}>
          <button
            className="post-more"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            &hellip;
          </button>
          {menu && (
            <div className="post-menu" role="menu">
              {s.allowShare && (
                <button role="menuitem" onClick={copyLink}>Copy link</button>
              )}
              {post.isOwner && (
                <button role="menuitem" className="danger" onClick={remove}>Delete post</button>
              )}
              {!s.allowShare && !post.isOwner && <span className="post-menu-empty">Nothing here</span>}
            </div>
          )}
        </div>
      </div>

      {post.title && <h3 className="post-title">{post.title}</h3>}

      {hasTitleBody ? (
        <>
          <TheoryBlock
            text={post.text}
            confidence={post.theory?.confidence}
            covered={covered}
            onReveal={() => setCovered(false)}
          />
          {post.tag && (
            <p className="post-text">
              <span className="tag">{post.tag}</span>
            </p>
          )}
        </>
      ) : (
        (post.text || post.tag) && (
          <p className="post-text">
            {post.text}
            {post.tag && <>{post.text ? " " : ""}<span className="tag">{post.tag}</span></>}
          </p>
        )
      )}

      {post.type === "poll" && post.poll && (
        <PollCard
          postId={post.id}
          poll={post.poll}
          isOwner={post.isOwner}
          resultsFirst={s.resultsFirst}
          preview={preview}
        />
      )}

      {post.media && (
        <div className="post-media" onDoubleClick={handleDoubleClick}>
          <PostMedia media={post.media} postId={post.id} />
          {s.spoiler && covered && post.type !== "theory" && (
            <button type="button" className="spoiler-cover media" onClick={() => setCovered(false)}>
              <strong>Spoiler</strong>
              <span>Tap to reveal</span>
            </button>
          )}
          {s.spoiler && covered && post.type === "theory" && (
            <button type="button" className="spoiler-cover media" onClick={() => setCovered(false)}>
              <strong>Evidence hidden</strong>
              <span>Tap to reveal</span>
            </button>
          )}
          <svg
            className={`burst-heart${burst ? " show" : ""}`}
            viewBox="0 0 24 24"
            onAnimationEnd={() => setBurst(false)}
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </div>
      )}

      {post.type === "theory" && post.poll && (
        <div className="verdict">
          <p className="verdict-ask">Your call: is it facts or cap?</p>
          <PollCard postId={post.id} poll={post.poll} isOwner={post.isOwner} preview={preview} />
        </div>
      )}

      <div className="post-stats">
        <span className="like-count">
          {s.hideLikes && !post.isOwner ? "Likes hidden" : `${displayedLikes} likes`}
          {s.hideLikes && post.isOwner && <em className="hint-inline"> (hidden from others)</em>}
        </span>
        <span>
          {s.comments ? (
            <button
              type="button"
              className="stat-link"
              onClick={() => !preview && setCommentsOpen(true)}
            >
              {commentCount} comments
            </button>
          ) : (
            <span>Comments off</span>
          )}
          {s.allowShare && <> &middot; {post.shares} shares</>}
        </span>
      </div>

      <div className="post-actions">
        <button
          className={`act-btn like-btn${liked ? " liked" : ""}${pulse ? " pulse" : ""}`}
          onClick={toggleLike}
          onAnimationEnd={() => setPulse(false)}
        >
          <HeartIcon />
          Like
        </button>
        {s.comments ? (
          <button
            className="act-btn"
            aria-haspopup="dialog"
            onClick={() => !preview && setCommentsOpen(true)}
          >
            <CommentIcon />
            Comment
          </button>
        ) : (
          <button className="act-btn" disabled title="The author turned comments off">
            <CommentIcon />
            Off
          </button>
        )}
        {s.allowShare && (
          <button className="act-btn" onClick={share}>
            <ShareIcon />
            Share
          </button>
        )}
        <button
          className={`act-btn save-btn${saved ? " saved" : ""}`}
          aria-label="Save post"
          onClick={toggleSave}
        >
          <SaveIcon />
        </button>
      </div>

      {note && <div className="post-note" role="status">{note}</div>}

      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          postUser={post.user}
          count={commentCount}
          onCountChange={setCommentCount}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </article>
  );
}
