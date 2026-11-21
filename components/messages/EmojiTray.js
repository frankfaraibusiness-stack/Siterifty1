"use client";

import { useMemo, useState } from "react";
import GtaEmoji from "./GtaEmoji";
import { Icon } from "./ui";
import { EMOJI, EMOJI_CATEGORIES, QUICK_REPLIES, STICKERS } from "@/lib/chat-config";
import { RichText } from "./ui";

const RECENT_KEY = "gta6fb_recent_emoji";

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list.filter((id) => EMOJI.some((e) => e.id === id)).slice(0, 8) : [];
  } catch {
    return [];
  }
}
export function rememberEmoji(id) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: recents just won't persist
  }
}

// Emoji, stickers and quick replies, all our own artwork / copy.
export default function EmojiTray({ onEmoji, onSticker, onQuick, startTab = "emoji" }) {
  const [tab, setTab] = useState(startTab);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [recent] = useState(readRecent);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return EMOJI.filter((e) => {
      if (term) return `${e.id} ${e.n} ${e.k}`.toLowerCase().includes(term);
      return cat === "all" || e.c === cat;
    });
  }, [q, cat]);

  const pick = (id) => {
    rememberEmoji(id);
    onEmoji(id);
  };

  return (
    <div className="ms-tray" role="region" aria-label="Emoji and stickers">
      <div className="ms-tray-tabs" role="tablist">
        {[
          ["emoji", "Emoji"],
          ["stickers", "Stickers"],
          ["quick", "Quick"],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {id === "quick" && <Icon.Bolt size={13} />} {label}
          </button>
        ))}
      </div>

      {tab === "emoji" && (
        <>
          <div className="ms-tray-tools">
            <label className="ms-tray-search">
              <Icon.Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emoji" aria-label="Search emoji" />
            </label>
            {!q && (
              <div className="ms-tray-cats">
                <button type="button" className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>All</button>
                {EMOJI_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ms-tray-scroll">
            {!q && cat === "all" && recent.length > 0 && (
              <>
                <p className="ms-tray-h">Recent</p>
                <div className="ms-egrid">
                  {recent.map((id) => (
                    <button key={id} type="button" onClick={() => pick(id)} aria-label={id}>
                      <GtaEmoji id={id} size={30} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {!q && cat === "all" && <p className="ms-tray-h">All emoji</p>}
            {shown.length === 0 ? (
              <p className="ms-tray-empty">No emoji match “{q}”.</p>
            ) : (
              <div className="ms-egrid">
                {shown.map((e) => (
                  <button key={e.id} type="button" onClick={() => pick(e.id)} aria-label={e.n} title={e.n}>
                    <GtaEmoji id={e.id} size={30} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "stickers" && (
        <div className="ms-tray-scroll">
          <p className="ms-tray-h">Tap to send</p>
          <div className="ms-sgrid">
            {STICKERS.map((s) => (
              <button key={s.id} type="button" className="mg-sticker sm" style={{ "--s1": s.a, "--s2": s.b }} onClick={() => onSticker(s.id)}>
                {s.t}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "quick" && (
        <div className="ms-tray-scroll">
          <p className="ms-tray-h">Quick replies</p>
          <div className="ms-qgrid">
            {QUICK_REPLIES.map((text) => (
              <button key={text} type="button" onClick={() => onQuick(text)}>
                <RichText text={text} emojiSize={16} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
