"use client";

import { useState } from "react";
import GtaEmoji from "./GtaEmoji";
import { Icon, Sheet, copyText, fmtTime, fmtWhen } from "./ui";
import { CHAT_LIMITS, EMOJI, QUICK_REACTIONS } from "@/lib/chat-config";

export function copyableOf(m) {
  if (m.deleted) return "";
  if (m.type === "text") return m.text;
  if (m.type === "code") return m.code?.code || "";
  if (m.type === "invite") return m.invite?.code || "";
  if (m.type === "meetup") return m.meetup?.place || "";
  if (m.type === "image") return m.text || "";
  return "";
}

export function canEditMessage(m) {
  return m.mine && m.type === "text" && !m.deleted && !m.local && Date.now() - m.createdAt < CHAT_LIMITS.editMinutes * 60_000;
}

// The 3-dots menu for one message: react, reply, copy, edit, info, delete.
// A bottom sheet on phones, a small popover beside the message on desktop.
export default function MessageMenu({ m, rect, onClose, onReact, onReply, onEdit, onDelete, onToast, receipts = true }) {
  const [view, setView] = useState("main"); // main | more | delete | info
  const copy = copyableOf(m);
  const mine = m.mine;

  const done = (fn) => () => {
    onClose();
    fn();
  };

  if (m.deleted) {
    return (
      <Sheet title="Deleted message" onClose={onClose} anchor={rect} size="sm">
        <div className="ms-menu">
          <button type="button" className="danger" onClick={done(() => onDelete(m, "me"))}>
            <Icon.Trash size={18} /> Remove from my view
          </button>
        </div>
      </Sheet>
    );
  }

  if (view === "more") {
    return (
      <Sheet title="React" onClose={onClose} anchor={rect} size="sm">
        <button type="button" className="ms-linkback" onClick={() => setView("main")}><Icon.Back size={16} /> Back</button>
        <div className="ms-egrid pad">
          {EMOJI.map((e) => (
            <button key={e.id} type="button" aria-label={e.n} title={e.n} onClick={done(() => onReact(m, m.rx?.mine === e.id ? null : e.id))}>
              <GtaEmoji id={e.id} size={30} />
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  if (view === "delete") {
    return (
      <Sheet title="Delete message?" onClose={onClose} anchor={rect} size="sm">
        <div className="ms-menu">
          {mine && (
            <button type="button" className="danger" onClick={done(() => onDelete(m, "all"))}>
              <Icon.Trash size={18} />
              <span>Delete for everyone<small>They’ll see “This message was deleted”.</small></span>
            </button>
          )}
          <button type="button" className="danger" onClick={done(() => onDelete(m, "me"))}>
            <Icon.Trash size={18} />
            <span>Delete for me<small>Removes it from your view only.</small></span>
          </button>
          <button type="button" onClick={() => setView("main")}>
            <Icon.Close size={18} /> Cancel
          </button>
        </div>
      </Sheet>
    );
  }

  if (view === "info") {
    const rows = [
      ["Sent", fmtWhen(m.createdAt)],
      ["Delivered", m.deliveredAt ? fmtWhen(m.deliveredAt) : "Not delivered yet"],
      ["Seen", m.seenAt ? fmtWhen(m.seenAt) : m.deliveredAt ? "Not seen yet" : "Not seen yet"],
    ];
    return (
      <Sheet title="Message info" onClose={onClose} anchor={rect} size="sm">
        <button type="button" className="ms-linkback" onClick={() => setView("main")}><Icon.Back size={16} /> Back</button>
        <ul className="ms-info">
          {rows.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </li>
          ))}
        </ul>
        <p className="ms-hint pad">
          “Seen” only shows when the other person has read receipts turned on. Time zone: yours ({fmtTime(Date.now())} now).
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} anchor={rect} size="sm" title="Message options">
      <div className="ms-reactbar" role="group" aria-label="React">
        {QUICK_REACTIONS.map((id) => (
          <button key={id} type="button" className={m.rx?.mine === id ? "on" : ""} aria-label={`React ${id}`} onClick={done(() => onReact(m, m.rx?.mine === id ? null : id))}>
            <GtaEmoji id={id} size={28} />
          </button>
        ))}
        <button type="button" className="more" aria-label="More reactions" onClick={() => setView("more")}>
          <Icon.Plus size={20} />
        </button>
      </div>

      <div className="ms-menu">
        <button type="button" onClick={done(() => onReply(m))}>
          <Icon.Reply size={18} /> Reply
        </button>
        {copy && (
          <button
            type="button"
            onClick={async () => {
              onClose();
              onToast((await copyText(copy)) ? "Copied" : "Couldn’t copy", false);
            }}
          >
            <Icon.Copy size={18} /> {m.type === "code" || m.type === "invite" ? "Copy code" : "Copy text"}
          </button>
        )}
        {canEditMessage(m) && (
          <button type="button" onClick={done(() => onEdit(m))}>
            <Icon.Edit size={18} /> Edit
          </button>
        )}
        {mine && !m.local && (
          <button type="button" onClick={() => setView("info")}>
            <Icon.Info size={18} /> Message info
          </button>
        )}
        <button type="button" className="danger" onClick={() => setView("delete")}>
          <Icon.Trash size={18} /> Delete
        </button>
      </div>
    </Sheet>
  );
}
