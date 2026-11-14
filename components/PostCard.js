"use client";

import { useState } from "react";
import PostMedia from "./PostMedia";
import { HeartIcon, CommentIcon, ShareIcon, SaveIcon } from "./icons";
import { formatCount } from "@/lib/format-count";

export default function PostCard({ post }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [pulse, setPulse] = useState(false);
  const [saved, setSaved] = useState(post.savedByMe);
  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);

  const displayedLikes = formatCount(likesCount);

  async function toggleLike() {
    if (busy) return;
    const nowLiked = !liked;

    // optimistic update
    setLiked(nowLiked);
    setLikesCount((c) => (nowLiked ? c + 1 : Math.max(0, c - 1)));
    setPulse(false);
    if (nowLiked) {
      requestAnimationFrame(() => setPulse(true));
    }

    setBusy(true);
    try {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      if (!res.ok) {
        // roll back on failure (e.g. not signed in)
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
      const data = await res.json();
      setSaved(data.saved);
    } catch {
      setSaved(!nowSaved);
    }
  }

  function handleDoubleClick() {
    if (!liked) {
      toggleLike();
    }
    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
  }

  return (
    <article className="post">
      <div className="post-head">
        <div
          className="post-avatar"
          style={{ "--a": post.avatarA, "--b": post.avatarB }}
        >
          {post.initial}
        </div>
        <div className="post-meta">
          <div className="post-user">{post.user}</div>
          <div className="post-sub">
            {post.location} &middot; {post.timeAgo}
          </div>
        </div>
        <button className="post-more" aria-label="More options">
          &hellip;
        </button>
      </div>

      <p className="post-text">
        {post.text}
        {post.tag && <> <span className="tag">{post.tag}</span></>}
      </p>

      {post.media && (
        <div className="post-media" onDoubleClick={handleDoubleClick}>
          <PostMedia media={post.media} />
          <svg
            className={`burst-heart${burst ? " show" : ""}`}
            viewBox="0 0 24 24"
            onAnimationEnd={() => setBurst(false)}
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </div>
      )}

      <div className="post-stats">
        <span className="like-count">{displayedLikes} likes</span>
        <span>
          {post.comments} comments &middot; {post.shares} shares
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
        <button className="act-btn">
          <CommentIcon />
          Comment
        </button>
        <button className="act-btn">
          <ShareIcon />
          Share
        </button>
        <button
          className={`act-btn save-btn${saved ? " saved" : ""}`}
          aria-label="Save post"
          onClick={toggleSave}
        >
          <SaveIcon />
        </button>
      </div>
    </article>
  );
}
