"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, UserPlusIcon, XIcon } from "./icons";
import { formatCount } from "@/lib/format-count";
import FullScreen from "./FullScreen";
import { pollNow } from "@/lib/message-sync";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Follow + friend-request state for one profile, shared by the buttons and the
// counts line. Updates are optimistic and roll back if the server says no.
export function useSocial({ username, initial, signedIn, flash, askLogin }) {
  const [following, setFollowing] = useState(initial.relationship.following);
  const [friend, setFriend] = useState(initial.relationship.friend);
  const [counts, setCounts] = useState(initial.counts);
  const [busy, setBusy] = useState(false);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const confirmTimer = useRef(null);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  async function call(url, payload, apply, rollback) {
    if (!signedIn) {
      askLogin();
      return;
    }
    if (busy) return;
    setBusy(true);
    apply();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ username, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update that right now.");
      if (data.counts) setCounts(data.counts);
      if (typeof data.following === "boolean") setFollowing(data.following);
      if (data.friend) setFriend(data.friend);
      return data;
    } catch (err) {
      rollback();
      flash(err.message || "Couldn't update that right now.");
    } finally {
      setBusy(false);
    }
  }

  function toggleFollow() {
    const prev = following;
    const prevCounts = counts;
    return call(
      "/api/social/follow",
      { follow: !prev },
      () => {
        setFollowing(!prev);
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (prev ? -1 : 1)) }));
      },
      () => {
        setFollowing(prev);
        setCounts(prevCounts);
      }
    );
  }

  function friendAction(action) {
    const prev = friend;
    const next =
      action === "request" ? (prev === "pending_in" ? "friends" : "pending_out")
      : action === "accept" ? "friends"
      : "none";
    return call(
      "/api/social/friend",
      { action },
      () => setFriend(next),
      () => setFriend(prev)
    ).then((data) => {
      if (data) pollNow(); // accepting / declining changes the header badge
      if (data && action === "request" && data.friend === "friends") flash(`You and @${username} are friends`);
      else if (data && action === "request" && data.friend === "pending_out") flash("Friend request sent");
      else if (data && action === "accept") flash(`You and @${username} are friends`);
      return data;
    });
  }

  // Unfriending asks twice (tap again within 3 seconds) so it can't happen by accident.
  function unfriend() {
    if (!confirmUnfriend) {
      setConfirmUnfriend(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmUnfriend(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmUnfriend(false);
    friendAction("remove");
  }

  return { followsMe: initial.relationship.followsMe, following, friend, counts, setCounts, busy, confirmUnfriend, toggleFollow, friendAction, unfriend };
}

// Buttons shown on someone else's profile.
export function SocialButtons({ social }) {
  const { following, friend, busy, confirmUnfriend, toggleFollow, friendAction, unfriend } = social;
  return (
    <>
      <button
        type="button"
        className={`pf-btn ${following ? "pf-btn-ghost pf-btn-on" : "pf-btn-primary"}`}
        onClick={toggleFollow}
        disabled={busy}
        aria-pressed={following}
      >
        {following ? (
          <>
            <span className="pf-ico"><CheckIcon /></span>
            Following
          </>
        ) : (
          "Follow"
        )}
      </button>

      {friend === "none" && (
        <button type="button" className="pf-btn pf-btn-ghost" onClick={() => friendAction("request")} disabled={busy}>
          <span className="pf-ico"><UserPlusIcon /></span>
          Add friend
        </button>
      )}
      {friend === "pending_out" && (
        <button
          type="button"
          className="pf-btn pf-btn-ghost pf-btn-on"
          onClick={() => friendAction("cancel")}
          disabled={busy}
          title="Tap to cancel your request"
        >
          Requested
        </button>
      )}
      {friend === "pending_in" && (
        <>
          <button type="button" className="pf-btn pf-btn-ghost pf-btn-on" onClick={() => friendAction("accept")} disabled={busy}>
            <span className="pf-ico"><CheckIcon /></span>
            Accept
          </button>
          <button
            type="button"
            className="pf-btn pf-btn-ghost pf-btn-icon"
            onClick={() => friendAction("decline")}
            disabled={busy}
            aria-label="Decline friend request"
          >
            <span className="pf-ico"><XIcon /></span>
          </button>
        </>
      )}
      {friend === "friends" && (
        <button
          type="button"
          className={`pf-btn pf-btn-ghost ${confirmUnfriend ? "pf-btn-danger" : "pf-btn-on"}`}
          onClick={unfriend}
          disabled={busy}
        >
          {confirmUnfriend ? (
            "Unfriend?"
          ) : (
            <>
              <span className="pf-ico"><CheckIcon /></span>
              Friends
            </>
          )}
        </button>
      )}
    </>
  );
}

// "12 followers · 4 following · 3 friends", under the bio. Each opens its list.
export function SocialCounts({ counts, username, canOpen = true }) {
  const [list, setList] = useState(null); // null, or which tab the people screen opens on
  const items = [
    ["followers", counts.followers, counts.followers === 1 ? "follower" : "followers"],
    ["following", counts.following, "following"],
    ["friends", counts.friends, counts.friends === 1 ? "friend" : "friends"],
  ];
  return (
    <>
      <div className="pf-social" aria-label="Followers, following and friends">
        {items.map(([type, n, label]) =>
          canOpen ? (
            <button type="button" key={type} className="pf-social-btn" onClick={() => setList(type)}>
              <b>{formatCount(n)}</b> {label}
            </button>
          ) : (
            <span key={type}>
              <b>{formatCount(n)}</b> {label}
            </span>
          )
        )}
      </div>
      {list && <PeopleList username={username} counts={counts} start={list} onClose={() => setList(null)} />}
    </>
  );
}

const PEOPLE_TABS = [
  ["followers", "Followers"],
  ["following", "Following"],
  ["friends", "Friends"],
];

const EMPTY_NOTE = {
  followers: "Nobody follows @{u} yet.",
  following: "@{u} isn't following anyone yet.",
  friends: "No friends here yet.",
};

// The people behind the three counts: a full screen with a tab for each list.
// Lists load the first time their tab opens and are kept while the screen stays open.
function PeopleList({ username, counts, start, onClose }) {
  const [type, setType] = useState(start);
  const [lists, setLists] = useState({}); // type -> { status, people, error }
  const [retry, setRetry] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A list keeps loading if you switch tabs meanwhile; it only stops when the screen closes.
  useEffect(() => {
    if (lists[type]) return;
    setLists((l) => ({ ...l, [type]: { status: "loading", people: [], error: "" } }));
    fetch(`/api/social/list?username=${encodeURIComponent(username)}&type=${type}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load that list.");
        if (mounted.current) setLists((l) => ({ ...l, [type]: { status: "ready", people: data.people, error: "" } }));
        // Opening your own Followers list clears the header badge; refresh it now.
        if (type === "followers") pollNow();
      })
      .catch((err) => {
        if (mounted.current) setLists((l) => ({ ...l, [type]: { status: "error", people: [], error: err.message } }));
      });
    // `lists` is read only to skip a list that is already loaded or loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, type, retry]);

  const state = lists[type] || { status: "loading", people: [], error: "" };

  return (
    <FullScreen
      title={`@${username}`}
      subtitle="Followers, following and friends"
      onClose={onClose}
      size="sm"
      subhead={
        <div className="fs-tabs" role="tablist" aria-label="People">
          {PEOPLE_TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={type === id} onClick={() => setType(id)}>
              {label} <em>{formatCount(counts[id] ?? 0)}</em>
            </button>
          ))}
        </div>
      }
    >
      {state.status === "loading" && <p className="pl-note">Loading...</p>}
      {state.status === "error" && (
        <p className="pl-note">
          {state.error}{" "}
          <button type="button" className="pl-retry" onClick={() => {
              setLists((l) => {
                const next = { ...l };
                delete next[type];
                return next;
              });
              setRetry((n) => n + 1);
            }}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ready" && state.people.length === 0 && (
        <p className="pl-note">{EMPTY_NOTE[type].replace("{u}", username)}</p>
      )}
      {state.status === "ready" && state.people.length > 0 && (
        <ul className="pl-list">
          {state.people.map((p) => (
            <li key={p.uid}>
              <Link href={`/u/${p.username}`} className="pf-reqs-who" onClick={onClose}>
                <span className="pf-reqs-av" style={{ "--a": p.a, "--b": p.b }}>
                  {p.username.charAt(0).toUpperCase()}
                  {p.hasAvatar && (
                    <span className="pf-reqs-img" style={{ backgroundImage: `url("/avatar/${p.username}?v=${p.avatarV}")` }} />
                  )}
                </span>
                <span className="pf-reqs-name">
                  <b>{p.displayName}</b>
                  <small>@{p.username}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FullScreen>
  );
}

export function FriendRequests({ initial, onCountsChange, flash }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  if (rows.length === 0) return null;

  async function answer(row, action) {
    if (busyId) return;
    setBusyId(row.uid);
    try {
      const res = await fetch("/api/social/friend", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ username: row.username, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update that right now.");
      setRows((r) => r.filter((x) => x.uid !== row.uid));
      pollNow(); // the friend-request count in the header badge just changed
      if (action === "accept") {
        flash(`You and @${row.username} are friends`);
        onCountsChange?.((c) => ({ ...c, friends: c.friends + 1 }));
      }
    } catch (err) {
      flash(err.message || "Couldn't update that right now.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={`pf-reqs${open ? " open" : ""}`}>
      <button
        type="button"
        className="pf-reqs-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="pf-ico"><UserPlusIcon /></span>
        Friend requests
        <span className="pf-reqs-n">{rows.length}</span>
      </button>
      {open && (
        <ul className="pf-reqs-list">
          {rows.map((r) => (
            <li key={r.uid}>
              <Link href={`/u/${r.username}`} className="pf-reqs-who">
                <span className="pf-reqs-av" style={{ "--a": r.a, "--b": r.b }}>
                  {r.username.charAt(0).toUpperCase()}
                  {r.hasAvatar && (
                    <span
                      className="pf-reqs-img"
                      style={{ backgroundImage: `url("/avatar/${r.username}?v=${r.avatarV}")` }}
                    />
                  )}
                </span>
                <span className="pf-reqs-name">
                  <b>{r.displayName}</b>
                  <small>@{r.username}</small>
                </span>
              </Link>
              <button type="button" className="pf-btn pf-btn-primary pf-btn-sm" onClick={() => answer(r, "accept")} disabled={busyId === r.uid}>
                Accept
              </button>
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={() => answer(r, "decline")} disabled={busyId === r.uid}>
                Decline
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
