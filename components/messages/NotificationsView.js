"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StoryViewer from "../StoryViewer";
import { Avatar, Icon, StoryIcon, fmtDay, fmtTime } from "./ui";
import { useConnect } from "./Connect";
import { api } from "./api";
import { agoLong } from "@/lib/time-ago";
import { NOTIF_NAME } from "@/lib/notif-pool";
import { getSnapshot, patchSync } from "@/lib/message-sync";

// The Notifications chat: not a person, but everything that happened to you, one card each, oldest
// at the top and newest at the bottom like any chat:
//   likes, comments, replies, new followers, friend requests, and replies to your stories.
// Every card has the person's avatar, what they did, when, and an arrow to their profile. Story
// replies also get View story (only while the story is up; otherwise "Story expired", and the
// reply stays readable) and Follow. New followers get Follow back.

const TYPE = {
  like: { label: "liked your post", tone: "pink" },
  clike: { label: "liked your comment", tone: "pink" },
  comment: { label: "commented on your post", tone: "cyan" },
  reply: { label: "replied to your comment", tone: "cyan" },
  follow: { label: "started following you", tone: "violet" },
  friend: { label: "sent you a friend request", tone: "violet" },
  friend_ok: { label: "accepted your friend request", tone: "violet" },
  story: { label: "replied to your story", tone: "violet" },
};

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
function TypeIcon({ type, size = 13 }) {
  if (type === "like" || type === "clike") return <svg {...svg} width={size} height={size} fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" /></svg>;
  if (type === "comment" || type === "reply") return <svg {...svg} width={size} height={size}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" /></svg>;
  if (type === "story") return <StoryIcon size={size} />;
  if (type === "follow") return <Icon.UserPlus size={size} />;
  return <Icon.Users size={size} />;
}

// Follow / Follow back / Following, the same buttons and routes as everywhere else in Messages.
function FollowButton({ person, rel, onRel, onError }) {
  const { busy, act } = useConnect({ username: person.username, onRel: (r) => onRel(person.uid, r), onError });
  return rel.following ? (
    <button type="button" className="ms-btn sm on" disabled={!!busy} onClick={() => act("unfollow")} aria-pressed="true">
      <Icon.UserCheck size={15} /> {busy === "unfollow" ? "…" : "Following"}
    </button>
  ) : (
    <button type="button" className="ms-btn sm" disabled={!!busy} onClick={() => act("follow")}>
      <Icon.UserPlus size={15} /> {busy === "follow" ? "…" : rel.followsYou ? "Follow back" : "Follow"}
    </button>
  );
}

function Card({ item, rel, onView, onRel, onError }) {
  const { person, type } = item;
  const meta = TYPE[type] || TYPE.like;
  const quote = type === "like" || type === "clike"; // what they liked, shown quietly
  const said = type === "comment" || type === "reply" || type === "story"; // what they wrote, shown as a bubble
  return (
    <li className={`ms-nt-card tone-${meta.tone}${item.fresh ? " fresh" : ""}`}>
      <div className="ms-nt-top">
        <Link href={`/u/${person.username}`} className="ms-nt-av" aria-label={`${person.username}’s profile`}>
          <Avatar person={person} size={42} />
          <span className="ms-nt-badge"><TypeIcon type={type} /></span>
        </Link>
        <div className="ms-nt-who">
          <b className="ms-ell">
            {person.username} <span>{meta.label}</span>
            {item.fresh && <i className="ms-nt-new">New</i>}
          </b>
        </div>
        <Link href={`/u/${person.username}`} className="ms-nt-go" aria-label={`Open ${person.username}’s profile`} title="View profile">
          <Icon.Chevron size={20} />
        </Link>
      </div>

      {said && item.text && <p className="ms-nt-text">{item.text}</p>}
      {quote && item.text && <p className="ms-nt-quote">{item.text}</p>}

      <div className="ms-nt-foot">
        <time dateTime={new Date(item.atMs).toISOString()} title={`${fmtDay(item.atMs)}, ${fmtTime(item.atMs)}`}>
          {agoLong(item.atMs) || "just now"}
        </time>
        <span className="ms-nt-acts">
          {type === "story" &&
            (item.story ? (
              <button type="button" className="ms-btn sm go" onClick={() => onView(item)}>
                <StoryIcon size={15} /> View story
              </button>
            ) : (
              <span className="ms-nt-expired"><Icon.Clock size={13} /> Story expired</span>
            ))}
          {item.postId && (
            <Link href={`/p/${item.postId}`} className="ms-btn sm go">View post</Link>
          )}
          {(type === "story" || type === "follow") && (
            <FollowButton person={person} rel={rel} onRel={onRel} onError={onError} />
          )}
        </span>
      </div>
    </li>
  );
}

export default function NotificationsView({ onBack, onListChanged, onToast }) {
  const [items, setItems] = useState([]); // newest first, as the server sends them
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [more, setMore] = useState(false);
  const [next, setNext] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rels, setRels] = useState({}); // uid -> relation, after a follow / unfollow here
  const [viewing, setViewing] = useState(null); // the story open in the viewer
  const [overrides, setOverrides] = useState({});
  const patch = useCallback((id, p) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...p } })), []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const d = await api("/api/messages/notifications?read=1");
      setItems(d.items);
      setMore(d.more);
      setNext(d.next);
      setStatus("ready");
      if (d.unread > 0) {
        // Opening the chat marked it read on the server: bring the Messages badge down right away.
        patchSync({ unread: Math.max(0, getSnapshot().unread - 1) });
        onListChanged?.();
      }
    } catch {
      setStatus("error");
    }
  }, [onListChanged]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (loadingMore || next === null) return;
    setLoadingMore(true);
    try {
      const d = await api(`/api/messages/notifications?before=${next}`);
      setItems((cur) => [...cur, ...d.items.filter((n) => !cur.some((c) => c.id === n.id))]);
      setMore(d.more);
      setNext(d.next);
    } catch (err) {
      onToast?.(err.message || "Couldn’t load more.", true);
    } finally {
      setLoadingMore(false);
    }
  }

  // Oldest first on screen, like a chat.
  const ordered = useMemo(() => [...items].reverse(), [items]);

  // The viewer wants groups of stories; this is just the one the reply came from.
  const groups = useMemo(
    () => (viewing ? [{ username: viewing.story.username, mine: true, stories: [viewing.story] }] : []),
    [viewing]
  );

  return (
    <div className="ms-thread">
      <header className="ms-thead">
        <button type="button" className="ms-back" onClick={() => onBack(false)} aria-label="Back to chats">
          <Icon.Back size={22} />
        </button>
        <div className="ms-who ms-nt-head">
          <span className="ms-nt-bot" aria-hidden="true"><Icon.Bell size={20} /></span>
          <span className="ms-who-t">
            <b><span className="ms-ell">{NOTIF_NAME}</span></b>
            <small>Likes, comments, followers and story replies</small>
          </span>
        </div>
      </header>

      <div className="ms-tbody ms-nt-body">
        {status === "loading" && <p className="ms-muted">Loading notifications…</p>}

        {status === "error" && (
          <div className="ms-nt-empty">
            <p>Couldn’t load your notifications.</p>
            <button type="button" className="ms-btn ghost sm" onClick={load}>Try again</button>
          </div>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="ms-nt-empty">
            <span className="ms-nt-bot big" aria-hidden="true"><Icon.Bell size={30} /></span>
            <h3>Nothing yet</h3>
            <p>Likes, comments, new followers, friend requests and replies to your stories show up here.</p>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <>
            {more && (
              <button type="button" className="ms-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load earlier notifications"}
              </button>
            )}
            <ul className="ms-nt-list">
              {ordered.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  rel={rels[item.person.uid] || { following: item.following, followsYou: item.followsYou }}
                  onView={setViewing}
                  onRel={(uid, r) => setRels((cur) => ({ ...cur, [uid]: r }))}
                  onError={(m) => onToast?.(m, true)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {viewing && (
        <StoryViewer
          groups={groups}
          startGroup={0}
          onClose={() => setViewing(null)}
          onDeleted={() => {
            // Deleted from the viewer: it can no longer be watched, but its replies stay readable.
            const id = viewing.story.id;
            setItems((cur) => cur.map((i) => (i.story?.id === id ? { ...i, story: null } : i)));
            setViewing(null);
          }}
          canHeart={false}
          onNeedAuth={() => setViewing(null)}
          overrides={overrides}
          onOverride={patch}
        />
      )}
    </div>
  );
}
