"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GtaEmoji from "./GtaEmoji";
import EmojiTray from "./EmojiTray";
import { CodeForm, InviteForm, MeetupForm, PhotoPreview } from "./Forms";
import { Icon } from "./ui";
import { compressImage } from "@/components/composer/imageTools";
import { CHAT_LIMITS } from "@/lib/chat-config";

const drafts = new Map(); // unsent text, kept per chat while the page is open
const coarse = () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

const ATTACH = [
  { id: "photo", label: "Photo", Icon: Icon.Image, tone: "#2de2c5" },
  { id: "invite", label: "Session invite", Icon: Icon.Gamepad, tone: "#ff3d7f" },
  { id: "code", label: "Share a code", Icon: Icon.Key, tone: "#cdfa4c" },
  { id: "meetup", label: "Meet-up pin", Icon: Icon.MapPin, tone: "#ffb347" },
  { id: "stickers", label: "Stickers", Icon: Icon.Smile, tone: "#a24bff" },
];

export default function Composer({
  draftKey,
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  onSaveEdit,
  onToast,
}) {
  const [text, setText] = useState(() => drafts.get(draftKey) || "");
  const [tray, setTray] = useState(null); // null | "emoji" | "stickers"
  const [attach, setAttach] = useState(false);
  const [form, setForm] = useState(null); // "invite" | "code" | "meetup"
  const [photo, setPhoto] = useState(null);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const area = useRef(null);
  const fileRef = useRef(null);
  const caret = useRef(null);

  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, []);

  useEffect(grow, [text, grow]);
  useEffect(() => {
    drafts.set(draftKey, text);
  }, [text, draftKey]);

  // Reply / edit take over the box.
  useEffect(() => {
    if (editing) setText(editing.text);
    if (editing || replyTo) area.current?.focus();
  }, [editing, replyTo]);

  // Put the caret back after inserting an emoji.
  useEffect(() => {
    if (caret.current != null && area.current) {
      const p = caret.current;
      caret.current = null;
      area.current.setSelectionRange(p, p);
    }
  });

  function insert(snippet) {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${snippet}${text.slice(end)}`.slice(0, CHAT_LIMITS.text);
    caret.current = Math.min(start + snippet.length, next.length);
    setText(next);
    if (!coarse()) el?.focus();
  }

  function submit() {
    const value = text.trim();
    if (editing) {
      if (value && value !== editing.text) onSaveEdit(value);
      else onCancelEdit();
      setText("");
      return;
    }
    if (!value) {
      onSend({ type: "text", text: ":fire:" }); // empty box = quick fire
      return;
    }
    onSend({ type: "text", text: value });
    setText("");
    setTray(null);
    requestAnimationFrame(() => {
      if (area.current) area.current.style.height = "auto";
      if (!coarse()) area.current?.focus();
    });
  }

  function onKey(e) {
    if (e.key === "Escape") {
      if (tray) setTray(null);
      else if (editing) { onCancelEdit(); setText(""); }
      else if (replyTo) onCancelReply();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !coarse() && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyPhoto(true);
    try {
      setPhoto(await compressImage(file, { max: 1280, maxBytes: 440_000 }));
    } catch (err) {
      onToast?.(err.message || "Couldn’t read that photo.", true);
    } finally {
      setBusyPhoto(false);
    }
  }

  function chooseAttach(id) {
    setAttach(false);
    if (id === "photo") fileRef.current?.click();
    else if (id === "stickers") setTray("stickers");
    else setForm(id);
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="ms-composer">
      {replyTo && !editing && (
        <div className="ms-ctx">
          <Icon.Reply size={16} />
          <div>
            <b>Replying to {replyTo.name}</b>
            <span>{replyTo.snippet}</span>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply"><Icon.Close size={16} /></button>
        </div>
      )}
      {editing && (
        <div className="ms-ctx edit">
          <Icon.Edit size={16} />
          <div>
            <b>Editing message</b>
            <span>Press Enter to save, Esc to cancel</span>
          </div>
          <button type="button" onClick={() => { onCancelEdit(); setText(""); }} aria-label="Cancel edit"><Icon.Close size={16} /></button>
        </div>
      )}

      <div className="ms-cbar">
        <div className="ms-attach-wrap">
          <button type="button" className={`ms-cbtn plus${attach ? " open" : ""}`} onClick={() => { setAttach((v) => !v); setTray(null); }} aria-label="Attach" aria-expanded={attach} disabled={!!editing}>
            {busyPhoto ? <span className="ms-spin" /> : <Icon.Plus size={22} />}
          </button>
          {attach && (
            <>
              <div className="ms-attach-scrim" onClick={() => setAttach(false)} />
              <div className="ms-attach" role="menu">
                {ATTACH.map(({ id, label, Icon: Ico, tone }) => (
                  <button key={id} type="button" role="menuitem" onClick={() => chooseAttach(id)}>
                    <span style={{ "--t": tone }}><Ico size={18} /></span>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ms-cfield">
          <textarea
            ref={area}
            rows={1}
            value={text}
            maxLength={CHAT_LIMITS.text}
            placeholder={editing ? "Edit your message" : "Message"}
            aria-label="Message"
            enterKeyHint={coarse() ? "enter" : "send"}
            onChange={(e) => { setText(e.target.value); if (e.target.value) onTyping?.(); }}
            onKeyDown={onKey}
            onFocus={() => { if (coarse()) setTray(null); }}
          />
          <button
            type="button"
            className={`ms-cbtn emoji${tray ? " open" : ""}`}
            onClick={() => {
              setAttach(false);
              setTray((t) => (t ? null : "emoji"));
              if (coarse()) area.current?.blur();
            }}
            aria-label={tray ? "Close emoji" : "Open emoji"}
            aria-expanded={!!tray}
          >
            {tray ? <Icon.Close size={20} /> : <GtaEmoji id="grin" size={24} />}
          </button>
        </div>

        <button type="button" className={`ms-send${hasText || editing ? " ready" : " fire"}`} onClick={submit} aria-label={editing ? "Save edit" : hasText ? "Send" : "Send fire"}>
          {editing ? <Icon.Check size={20} /> : hasText ? <Icon.Send size={19} /> : <GtaEmoji id="fire" size={24} />}
        </button>
      </div>

      {tray && (
        <EmojiTray
          key={tray}
          startTab={tray}
          onEmoji={(id) => insert(`:${id}:`)}
          onSticker={(id) => { onSend({ type: "sticker", sticker: id }); setTray(null); }}
          onQuick={(t) => { onSend({ type: "text", text: t }); setTray(null); }}
        />
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
      {form === "invite" && <InviteForm onClose={() => setForm(null)} onSend={onSend} />}
      {form === "code" && <CodeForm onClose={() => setForm(null)} onSend={onSend} />}
      {form === "meetup" && <MeetupForm onClose={() => setForm(null)} onSend={onSend} />}
      {photo && <PhotoPreview photo={photo} onClose={() => setPhoto(null)} onSend={onSend} />}
    </div>
  );
}

