"use client";

import Link from "next/link";
import { useState } from "react";
import PlanBadges from "@/components/PlanBadges";
import Connect from "./Connect";
import { Avatar, Icon, Sheet, fmtActive } from "./ui";

// Everything about the chat and the person, in one sheet.
export default function ChatInfo({
  peer,
  rel,
  perm,
  pinned,
  muted,
  hasChat,
  onClose,
  onRel,
  onPin,
  onMute,
  onDeleteChat,
  onBlock,
  onUnblock,
  onToast,
}) {
  const [confirm, setConfirm] = useState("");
  const youBlocked = perm?.code === "youBlocked";
  const active = peer.online ? "Online now" : fmtActive(peer.activeAt);

  return (
    <Sheet title="Chat info" onClose={onClose} size="md">
      <div className="ms-info-card">
        <Avatar person={peer} size={76} online={peer.online} />
        <h3>
          <span>{peer.displayName}</span>
          <PlanBadges plan={peer.plan} />
        </h3>
        <p className="h">@{peer.username}</p>
        {active && <p className={`ms-active${peer.online ? " on" : ""}`}>{active}</p>}
        {peer.bio && <p className="bio">{peer.bio}</p>}
        <Connect username={peer.username} rel={rel} onRel={onRel} onError={(t) => onToast(t, true)} className="center" />
        <Link href={`/u/${peer.username}`} className="ms-btn ghost" onClick={onClose}>
          <Icon.User size={15} /> View profile
        </Link>
      </div>

      <div className="ms-menu list">
        {hasChat && (
          <>
            <button type="button" onClick={() => onPin(!pinned)}>
              <Icon.Pin size={18} /> {pinned ? "Unpin chat" : "Pin chat to top"}
            </button>
            <button type="button" onClick={() => onMute(!muted)}>
              {muted ? <Icon.Bell size={18} /> : <Icon.BellOff size={18} />} {muted ? "Unmute notifications" : "Mute this chat"}
              <small>{muted ? "Unread count shows again" : "Hides the unread badge"}</small>
            </button>
          </>
        )}
        <Link href="/settings#wanted" className="ms-menu-link" onClick={onClose}>
          <Icon.Lock size={18} /> Who can message you
          <Icon.Chevron size={16} />
        </Link>
        {hasChat && (
          <button type="button" className="danger" onClick={() => (confirm === "chat" ? onDeleteChat() : setConfirm("chat"))}>
            <Icon.Trash size={18} /> {confirm === "chat" ? "Tap again to delete this chat for you" : "Delete chat"}
          </button>
        )}
        {youBlocked ? (
          <button type="button" onClick={onUnblock}>
            <Icon.Ban size={18} /> Unblock @{peer.username}
          </button>
        ) : (
          <button type="button" className="danger" onClick={() => (confirm === "block" ? onBlock() : setConfirm("block"))}>
            <Icon.Ban size={18} /> {confirm === "block" ? "Tap again to block @" + peer.username : `Block @${peer.username}`}
          </button>
        )}
      </div>
    </Sheet>
  );
}
