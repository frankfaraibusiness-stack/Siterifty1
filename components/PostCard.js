"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PostMedia from "./PostMedia";
import PlanBadges from "./PlanBadges";
import { FlairBadge, FlairName, haloClass } from "./Flair";
import PollCard from "./PollCard";
import TheoryBlock from "./TheoryBlock";
import EventCard from "./EventCard";
import RichText, { TagList } from "./RichText";
import TypeIcon from "./composer/TypeIcon";
import MediaChip from "./MediaChip";
import CommentsSheet from "./CommentsSheet";
import CommentsPreview from "./CommentsPreview";
import { HeartIcon, CommentIcon, ShareIcon, SaveIcon } from "./icons";
import { formatCount } from "@/lib/format-count";
import { useViewed } from "@/components/ads/adHooks";
import { reportClick, reportSeen } from "@/lib/track-client";
import { TYPES } from "@/lib/post-schema";
import { giftsHref } from "@/lib/gifts";

// A link to a member's profile, or the plain contents when it shouldn't be one.
function ProfileLink({ user, inert, className, label, children }) {
  if (inert) return <>{children}</>;
  return (
    <Link href={`/u/${encodeURIComponent(user)}`} className={className} aria-label={label}>
      {children}
    </Link>
  );
}

// `preview` renders the card exactly as it will look in the feed, but inert:
// the composer uses it so the preview can never drift from the real thing.
// `detail` is the post's own full page: media at full size, no click-through.
// `trk` is the server-signed tracking token for this post on this surface (feed, saved...). Without
// it the card is simply not tracked. It only counts as a view once half of it has been on screen.
export default function PostCard({ post, preview = false, detail = false, trk = "" }) {
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
  // Bumped whenever the full sheet closes so the page's comment preview refetches.
  const [previewKey, setPreviewKey] = useState(0);
  const [covered, setCovered] = useState(!!s.spoiler);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [gone, setGone] = useState(false);
  const menuRef = useRef(null);
  const rootRef = useRef(null);
  const navTimer = useRef(null);
  const postHref = `/p/${post.id}`;
  const linkable = !detail && !preview;
  useViewed(rootRef, () => reportSeen(trk), !!trk && linkable);

  useEffect(() => () => clearTimeout(navTimer.current), []);

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
  // Photo posts get a badge too, but only when there is media: older text-only
  // posts are stored as "post" as well and shouldn't be labelled "Photo".
  const badge = typeInfo || (post.type === "post" && post.media ? TYPES.post : null);
  const badgeKey = typeInfo ? post.type : "post";
  const hasTitleBody = post.type === "theory";
  const isEvent = post.type === "event" && !!post.event;

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

  // In the feed, clicking a post (not its buttons, poll or video controls)
  // opens its own page. Photos wait a beat so double-click-to-like still works.
  function openPost(e) {
    if (!linkable || !e.currentTarget.contains(e.target)) return; // ignore portals (comments)
    if (e.target.closest("a,button,input,textarea,select,label,summary,video,iframe,.poll-list,.theory-meter,.post-stats,.post-actions,.post-menu-wrap")) return;
    if (window.getSelection()?.toString()) return;
    reportClick(trk);
    clearTimeout(navTimer.current);
    if (e.target.closest(".post-media")) {
      navTimer.current = setTimeout(() => router.push(postHref), 240);
    } else {
      router.push(postHref);
    }
  }

  function handleDoubleClick() {
    clearTimeout(navTimer.current);
    if (!liked) toggleLike();
    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
  }

  async function copyLink() {
    setMenu(false);
    if (preview) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}${postHref}`);
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
        await navigator.share({ title: post.title || `${post.user} on GTAFanbase`, url });
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
      if (detail) return router.push("/");
      setGone(true);
      router.refresh();
    } else {
      setNote("Couldn’t delete that post");
    }
  }

  return (
    <article
      ref={rootRef}
      id={`post-${post.id}`}
      data-type={badge ? badgeKey : undefined}
      className={`post${typeInfo ? " post-typed" : ""}${detail ? " post-detail" : ""}${detail && post.media ? " has-media" : ""}`}
      style={typeInfo ? { "--a": typeInfo.a, "--b": typeInfo.b } : undefined}
      data-nav={linkable ? "" : undefined}
      onClick={openPost}
    >
      <div className="post-head">
        {/* Avatar and name open the author's profile (not in the composer preview). */}
        <ProfileLink user={post.user} inert={preview} className="post-avatar-link" label={`${post.user}'s profile`}>
          <div className={`post-avatar${haloClass(post.flair)}`} style={{ "--a": post.avatarA, "--b": post.avatarB }}>
            {post.initial}
            {post.hasAvatar && (
              <span
                className="post-avatar-img"
                style={{ backgroundImage: `url("/avatar/${encodeURIComponent(post.user)}?v=${post.avatarV}")` }}
              />
            )}
          </div>
        </ProfileLink>
        <div className="post-meta">
          <div className="post-user">
            <ProfileLink user={post.user} inert={preview} className="post-user-link">
              <FlairName flair={post.flair} a={post.avatarA} b={post.avatarB}>{post.user}</FlairName>
            </ProfileLink>
            <PlanBadges plan={post.plan} />
            <FlairBadge flair={post.flair} />
          </div>
          <div className="post-sub">
            {post.location} &middot;{" "}
            {post.scheduled ? (
              "Scheduled"
            ) : linkable ? (
              <Link href={postHref} className="post-time">{post.timeAgo}</Link>
            ) : (
              post.timeAgo
            )}
            {s.visibility === "private" && <> &middot; {isEvent ? "Private event" : "Only you"}</>}
            {s.pinned && <> &middot; Pinned</>}
          </div>
        </div>
        {badge && (
          <span className="post-type">
            <TypeIcon type={badgeKey} size={13} />
            {badge.label}
          </span>
        )}
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
              {!post.isOwner && !preview && post.user && (
                <Link
                  role="menuitem"
                  href={giftsHref({ type: "post", to: post.user, postId: post.id })}
                  className="post-menu-link"
                  prefetch={false}
                >
                  Send a gift to @{post.user}
                </Link>
              )}
              {!s.allowShare && !post.isOwner && (preview || !post.user) && <span className="post-menu-empty">Nothing here</span>}
            </div>
          )}
        </div>
      </div>

      {post.title && (
        <h3 className="post-title">
          {linkable ? <Link href={postHref}>{post.title}</Link> : post.title}
        </h3>
      )}

      {hasTitleBody ? (
        <>
          <TheoryBlock
            text={post.text}
            confidence={post.theory?.confidence}
            covered={covered}
            onReveal={() => setCovered(false)}
            inert={preview}
            detail={detail}
          />
          <TagList post={post} inert={preview} />
        </>
      ) : (
        !isEvent && (
          <>
            {post.text && (
              <RichText text={post.text} className="post-text" inert={preview} detail={detail} />
            )}
            <TagList post={post} inert={preview} />
          </>
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
        <div className="post-media" onDoubleClick={detail ? undefined : handleDoubleClick}>
          <PostMedia media={post.media} postId={post.id} detail={detail} />
          {!detail && <MediaChip media={post.media} />}
          {linkable && post.media.type === "video" && (
            <Link href={postHref} className="media-open" aria-label="Open post">
              Open <span aria-hidden="true">&#8599;</span>
            </Link>
          )}
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

      {isEvent && <EventCard post={post} preview={preview} detail={detail} />}

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

      {detail && !preview && s.comments && (
        <CommentsPreview
          postId={post.id}
          postUser={post.user}
          count={commentCount}
          refreshKey={previewKey}
          onOpen={() => setCommentsOpen(true)}
        />
      )}

      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          postUser={post.user}
          count={commentCount}
          onCountChange={setCommentCount}
          onClose={() => {
            setCommentsOpen(false);
            setPreviewKey((k) => k + 1);
          }}
        />
      )}
    </article>
  );
}
