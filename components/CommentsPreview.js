"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CommentIcon, HeartIcon } from "./icons";
import MentionText from "./MentionText";
import SpoilerText from "./SpoilerText";
import { FlairName, haloClass } from "./Flair";
import { formatCount } from "@/lib/format-count";
import { planRank } from "@/lib/plans";

// How many comments the preview shows before "View all".
const SHOW = 3;

// A small taste of the conversation on a post's own page. It reads the same
// endpoint the full sheet uses, shows the top few comments (live pins first,
// then most liked, then newest) and hands everything else to the sheet through
// `onOpen`. `refreshKey` changes whenever the sheet closes so new comments
// appear here without a reload.
export default function CommentsPreview({ postId, postUser, count, refreshKey, onOpen }) {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState({ comments: [], viewer: null, nowMs: 0 });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/posts/comments?postId=${encodeURIComponent(postId)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("load failed");
        const json = await res.json();
        if (!live) return;
        setData({ comments: json.comments || [], viewer: json.viewer || null, nowMs: json.serverNow || Date.now() });
        setStatus("ready");
      } catch {
        if (live) setStatus((s) => (s === "ready" ? s : "error"));
      }
    })();
    return () => {
      live = false;
    };
  }, [postId, refreshKey]);

  const top = useMemo(() => {
    const pinRank = (c) =>
      c.pinnedUntilMs > data.nowMs ? (c.pinForever ? 99 : planRank(c.pinPlan || c.plan)) : 0;
    return data.comments
      .filter((c) => !c.parentId)
      .sort(
        (a, b) =>
          pinRank(b) - pinRank(a) || b.likes - a.likes || b.createdAtMs - a.createdAtMs
      )
      .slice(0, SHOW);
  }, [data]);

  const total = Math.max(count, top.length);
  const hidden = total - top.length;
  const viewer = data.viewer;

  return (
    <section className="cpv" aria-label="Comments">
      <div className="cpv-head">
        <h2 className="cpv-title">
          Comments
          {total > 0 && <span className="cpv-count">{formatCount(total)}</span>}
        </h2>
        {total > 0 && (
          <button type="button" className="cpv-all" onClick={onOpen} aria-haspopup="dialog">
            View all
          </button>
        )}
      </div>

      {status === "loading" && (
        <ul className="cpv-list" aria-hidden="true">
          {[0, 1].map((i) => (
            <li key={i} className="cpv-item cpv-skel">
              <span className="cpv-avatar" />
              <span className="cpv-skel-lines">
                <i />
                <i />
              </span>
            </li>
          ))}
        </ul>
      )}

      {status === "ready" && top.length === 0 && (
        <div className="cpv-empty">
          <span className="cpv-empty-icon" aria-hidden="true">
            <CommentIcon />
          </span>
          <p>No comments yet. Start the conversation.</p>
        </div>
      )}

      {status === "ready" && top.length > 0 && (
        <ul className="cpv-list">
          {top.map((c) => {
            const pinned = c.pinnedUntilMs > data.nowMs;
            return (
              <li key={c.id} className="cpv-item">
                <Link
                  href={`/u/${encodeURIComponent(c.user)}`}
                  className={`cpv-avatar${haloClass(c.flair)}`}
                  style={{ "--a": c.a, "--b": c.b }}
                  aria-label={`${c.user}'s profile`}
                >
                  {c.initial}
                  {c.hasAvatar && (
                    <span
                      className="cpv-avatar-img"
                      style={{ backgroundImage: `url("/avatar/${encodeURIComponent(c.user)}?v=${c.avatarV}")` }}
                    />
                  )}
                </Link>
                <div className="cpv-body">
                  <div className="cpv-meta">
                    <Link href={`/u/${encodeURIComponent(c.user)}`} className="cpv-user">
                      <FlairName flair={c.flair} a={c.a} b={c.b}>{c.user}</FlairName>
                    </Link>
                    {c.user === postUser && <span className="cm-op">Author</span>}
                    {pinned && <span className="cpv-pin">Pinned</span>}
                    <span className="cpv-time">{c.timeAgo}</span>
                  </div>
                  <SpoilerText spoiler={c.spoiler} topic={c.spoilerTopic} mine={c.mine}>
                    <p className="cpv-text">
                      <MentionText text={c.text} />
                    </p>
                  </SpoilerText>
                  {(c.likes > 0 || c.replyCount > 0) && (
                    <div className="cpv-foot">
                      {c.likes > 0 && (
                        <span className={`cpv-like${c.likedByMe ? " on" : ""}`}>
                          <HeartIcon />
                          {formatCount(c.likes)}
                        </span>
                      )}
                      {c.replyCount > 0 && (
                        <span>
                          {formatCount(c.replyCount)} {c.replyCount === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {status === "error" && <p className="cpv-note">Couldn’t load comments right now.</p>}

      {hidden > 0 && status === "ready" && (
        <button type="button" className="cpv-more" onClick={onOpen} aria-haspopup="dialog">
          View all {formatCount(total)} comments
        </button>
      )}

      <button type="button" className="cpv-compose" onClick={onOpen} aria-haspopup="dialog">
        <span
          className={`cpv-avatar cpv-avatar-sm${haloClass(viewer?.flair)}`}
          style={{ "--a": viewer?.a || "#ff3d7f", "--b": viewer?.b || "#ff9a3d" }}
          aria-hidden="true"
        >
          {viewer?.initial || "+"}
          {viewer?.hasAvatar && (
            <span
              className="cpv-avatar-img"
              style={{ backgroundImage: `url("/avatar/${encodeURIComponent(viewer.username)}?v=${viewer.avatarV}")` }}
            />
          )}
        </span>
        <span className="cpv-compose-text">Add a comment...</span>
      </button>
    </section>
  );
}
