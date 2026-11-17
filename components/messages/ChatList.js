"use client";

import { memo } from "react";
import PlanBadges from "@/components/PlanBadges";
import GtaEmoji from "./GtaEmoji";
import { Avatar, Icon, RichText, Ticks, fmtListTime } from "./ui";

const TYPE_ICON = {
  invite: <Icon.Gamepad size={14} />,
  code: <Icon.Key size={14} />,
  meetup: <Icon.MapPin size={14} />,
  image: <Icon.Image size={14} />,
};

const Item = memo(function Item({ c, active, onOpen }) {
  const { peer, last } = c;
  const state = last.seen ? "seen" : last.delivered ? "delivered" : "sent";
  return (
    <li>
      <button type="button" className={`ms-item${active ? " active" : ""}${c.unread && !c.muted ? " unread" : ""}`} onClick={() => onOpen(peer.username)}>
        <Avatar person={peer} size={48} online={c.online} />
        <span className="ms-item-body">
          <span className="ms-item-top">
            <b className="ms-ell">{peer.displayName}</b>
            <PlanBadges plan={peer.plan} />
            {c.pinned && <Icon.Pin size={12} className="ms-pinned" aria-label="Pinned" />}
            {c.muted && <Icon.BellOff size={12} className="ms-muted-i" aria-label="Muted" />}
            <time>{fmtListTime(last.at)}</time>
          </span>
          <span className="ms-item-bot">
            {last.mine && !last.deleted && <Ticks state={state} size={14} />}
            {!last.deleted && TYPE_ICON[last.type]}
            <span className={`ms-prev ms-ell${last.deleted ? " gone" : ""}`}>
              {last.mine && !last.deleted && <i>You: </i>}
              {last.type === "sticker" && !last.deleted ? (
                <><GtaEmoji id="star" size={14} /> {last.text}</>
              ) : (
                <RichText text={last.text} emojiSize={14} />
              )}
            </span>
            {c.unread > 0 && <em className={`ms-unread${c.muted ? " quiet" : ""}`}>{c.unread > 99 ? "99+" : c.unread}</em>}
          </span>
        </span>
      </button>
    </li>
  );
});

export default function ChatList({ convs, status, active, onOpen, onNew, query, filter }) {
  if (status === "loading" && !convs.length) {
    return (
      <ul className="ms-list" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="ms-skel">
            <i />
            <span><b /><b /></span>
          </li>
        ))}
      </ul>
    );
  }

  const term = query.trim().toLowerCase().replace(/^@/, "");
  const items = convs.filter((c) => {
    if (filter === "unread" && !(c.unread > 0)) return false;
    if (filter === "pinned" && !c.pinned) return false;
    if (term && !`${c.peer.username} ${c.peer.displayName}`.toLowerCase().includes(term)) return false;
    return true;
  });

  if (!convs.length) {
    return (
      <div className="ms-empty-list">
        <div className="ms-empty-art" aria-hidden="true">
          <GtaEmoji id="palm" size={44} />
          <GtaEmoji id="controller" size={52} />
          <GtaEmoji id="car" size={44} />
        </div>
        <h3>No chats yet</h3>
        <p>Find a crew for your next session. Search a handle, add a friend, then plan a heist or a cruise.</p>
        <button type="button" className="ms-btn go" onClick={onNew}>
          <Icon.Compose size={16} /> Start a chat
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="ms-empty-list small">
        <p>{term ? `No chats match “${query.trim()}”.` : filter === "unread" ? "You’re all caught up." : "Nothing pinned yet."}</p>
      </div>
    );
  }

  return (
    <ul className="ms-list">
      {items.map((c) => (
        <Item key={c.id} c={c} active={active === c.peer.username} onOpen={onOpen} />
      ))}
    </ul>
  );
}
