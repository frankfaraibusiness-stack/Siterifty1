"use client";

import { useRef, useState } from "react";
import { Icon } from "./ui";
import { api, post } from "./api";

// Follow / friend buttons for one person. Used in the New message sheet, the
// chat info sheet and the "can't message" banner, so every place behaves the
// same. `rel` = { following, followsYou, friend }.
//
// The changes themselves go through the site's own social routes
// (/api/social/follow, /api/social/friend), the same ones the profile page
// uses. Afterwards we ask /api/messages/relation for the new picture, which
// also says whether messaging is now allowed.
//
// onRel(rel, perm) is called with the fresh relationship after each change.
export async function socialAct(username, kind) {
  if (kind === "follow" || kind === "unfollow") {
    await post("/api/social/follow", { username, follow: kind === "follow" });
  } else {
    await post("/api/social/friend", { username, action: kind });
  }
  return api(`/api/messages/relation?username=${encodeURIComponent(username)}`);
}

export function useConnect({ username, onRel, onError }) {
  const [busy, setBusy] = useState("");
  const armed = useRef(null);
  const [armedKind, setArmedKind] = useState("");

  async function act(kind) {
    if (busy) return;
    setBusy(kind);
    try {
      const d = await socialAct(username, kind);
      onRel?.(d.rel, d.perm, kind);
    } catch (err) {
      onError?.(err.message || "Couldn’t do that. Try again.");
    } finally {
      setBusy("");
    }
  }

  // Destructive actions need a second tap within 3 seconds.
  function confirmAct(kind) {
    if (armed.current === kind) {
      clearTimeout(armed.timer);
      armed.current = null;
      setArmedKind("");
      act(kind);
      return;
    }
    armed.current = kind;
    setArmedKind(kind);
    clearTimeout(armed.timer);
    armed.timer = setTimeout(() => {
      armed.current = null;
      setArmedKind("");
    }, 3000);
  }
  return { busy, act, confirmAct, armedKind };
}

export default function Connect({ username, rel, onRel, onError, compact = false, className = "", show = ["follow", "friend"] }) {
  const { busy, act, confirmAct, armedKind } = useConnect({ username, onRel, onError });
  const r = rel || { following: false, friend: "none" };
  const cls = (extra = "") => `ms-btn${compact ? " sm" : ""} ${extra}`.trim();

  return (
    <div className={`ms-connect ${className}`.trim()}>
      {show.includes("follow") && (r.following ? (
        <button type="button" className={cls("on")} disabled={!!busy} onClick={() => act("unfollow")} aria-pressed="true">
          <Icon.UserCheck size={15} /> {busy === "unfollow" ? "…" : "Following"}
        </button>
      ) : (
        <button type="button" className={cls()} disabled={!!busy} onClick={() => act("follow")}>
          <Icon.UserPlus size={15} /> {busy === "follow" ? "…" : r.followsYou ? "Follow back" : "Follow"}
        </button>
      ))}

      {show.includes("friend") && r.friend === "none" && (
        <button type="button" className={cls()} disabled={!!busy} onClick={() => act("request")}>
          <Icon.Users size={15} /> {busy === "request" ? "…" : "Add friend"}
        </button>
      )}
      {show.includes("friend") && r.friend === "pending_out" && (
        <button type="button" className={cls("on")} disabled={!!busy} onClick={() => act("cancel")} title="Cancel request">
          <Icon.Clock size={15} /> {busy === "cancel" ? "…" : "Requested"}
        </button>
      )}
      {show.includes("friend") && r.friend === "pending_in" && (
        <>
          <button type="button" className={cls("go")} disabled={!!busy} onClick={() => act("accept")}>
            <Icon.Check size={15} /> {busy === "accept" ? "…" : "Accept"}
          </button>
          <button type="button" className={cls()} disabled={!!busy} onClick={() => act("decline")}>
            Decline
          </button>
        </>
      )}
      {show.includes("friend") && r.friend === "friends" && (
        <button type="button" className={cls(armedKind === "remove" ? "danger" : "on")} disabled={!!busy} onClick={() => confirmAct("remove")}>
          <Icon.Users size={15} /> {busy === "remove" ? "…" : armedKind === "remove" ? "Remove?" : "Friends"}
        </button>
      )}
    </div>
  );
}
