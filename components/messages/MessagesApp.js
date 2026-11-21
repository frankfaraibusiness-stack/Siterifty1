"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatList from "./ChatList";
import GtaEmoji, { EmojiDefs } from "./GtaEmoji";
import NewMessageSheet from "./NewMessageSheet";
import ThreadView from "./ThreadView";
import NotificationsView from "./NotificationsView";
import { NOTIF_KEY } from "@/lib/notif-pool";
import { Icon } from "./ui";
import { api } from "./api";
import { getServerSnapshot, getSnapshot, pollNow, subscribe } from "@/lib/message-sync";

const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["pinned", "Pinned"],
];

// The whole Messages page: chat list on the left (a full screen on phones),
// the open chat on the right (a full screen on phones), plus the New message
// sheet. Chats are addressed as /messages?with=handle.
export default function MessagesApp({ initialWith = null }) {
  const [convs, setConvs] = useState([]);
  const [bot, setBot] = useState(null); // the "Notifications" row, or null until the first notification
  const [status, setStatus] = useState("loading");
  const [active, setActive] = useState(initialWith);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState(null); // null | "crew" | "requests"
  const [toast, setToast] = useState(null);
  const revRef = useRef(-1);
  const timer = useRef(0);
  const toastTimer = useRef(0);
  const sync = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const loadList = useCallback(async () => {
    try {
      const d = await api("/api/messages/conversations");
      setConvs(d.conversations);
      setBot(d.notifications || null);
      revRef.current = d.rev;
      setStatus("ready");
    } catch (err) {
      setStatus((s) => (s === "loading" ? "error" : s));
    }
  }, []);

  // Many things can ask for a refresh at once; do it once.
  const refreshList = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      loadList();
      pollNow();
    }, 220);
  }, [loadList]);

  useEffect(() => {
    loadList();
    return () => {
      clearTimeout(timer.current);
      clearTimeout(toastTimer.current);
    };
  }, [loadList]);

  // The background check-in says the list moved (new message, tick change...).
  useEffect(() => {
    if (sync.ready && sync.rev !== revRef.current) refreshList();
  }, [sync.rev, sync.ready, refreshList]);

  const showToast = useCallback((text, error = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, error, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // ---- which chat is open <-> the address bar -------------------
  useEffect(() => {
    const onPop = () => {
      const w = new URLSearchParams(window.location.search).get("with");
      setActive(w || null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const openChat = useCallback(
    (username) => {
      setSheet(null);
      const url = `/messages?with=${encodeURIComponent(username)}`;
      if (active) window.history.replaceState({ ms: 1 }, "", url);
      else window.history.pushState({ ms: 1 }, "", url);
      setActive(username);
    },
    [active]
  );

  const closeChat = useCallback(() => {
    if (window.history.state?.ms) window.history.back();
    else {
      window.history.replaceState(null, "", "/messages");
      setActive(null);
    }
  }, []);

  const unreadChats = convs.filter((c) => c.unread > 0 && !c.muted).length + (bot?.unread > 0 ? 1 : 0);
  const requests = sync.requests || 0;

  return (
    <div className="ms" data-view={active ? "thread" : "list"}>
      <EmojiDefs />

      <aside className="ms-side" aria-label="Chats">
        <header className="ms-side-head">
          <h1>
            Messages
            {unreadChats > 0 && <em className="ms-count" aria-label={`${unreadChats} unread chats`}>{unreadChats}</em>}
          </h1>
          <div className="ms-side-acts">
            <button type="button" className="ms-iconbtn" onClick={() => setSheet(requests ? "requests" : "crew")} aria-label="Friends and requests" title="Friends and requests">
              <Icon.Users size={20} />
              {requests > 0 && <b className="ms-dot">{requests > 9 ? "9+" : requests}</b>}
            </button>
            <button type="button" className="ms-iconbtn primary" onClick={() => setSheet("crew")} aria-label="New message" title="New message">
              <Icon.Compose size={20} />
            </button>
          </div>
        </header>

        <label className="ms-search">
          <Icon.Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear"><Icon.Close size={15} /></button>
          )}
        </label>

        <div className="ms-filters" role="tablist">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="ms-side-scroll">
          {status === "error" ? (
            <div className="ms-empty-list small">
              <p>Couldn’t load your chats.</p>
              <button type="button" className="ms-btn ghost sm" onClick={loadList}>Try again</button>
            </div>
          ) : (
            <ChatList convs={convs} bot={bot} status={status} active={active} onOpen={openChat} onNew={() => setSheet("crew")} query={query} filter={filter} />
          )}
        </div>
      </aside>

      <main className="ms-main">
        {active === NOTIF_KEY ? (
          <NotificationsView onBack={closeChat} onListChanged={refreshList} onToast={showToast} />
        ) : active ? (
          <ThreadView
            key={active}
            username={active}
            onBack={closeChat}
            onListChanged={refreshList}
            onToast={showToast}
            onGone={(t) => showToast(t, true)}
          />
        ) : (
          <div className="ms-empty-pane">
            <div className="ms-empty-art" aria-hidden="true">
              <GtaEmoji id="car" size={58} />
              <GtaEmoji id="six" size={68} />
              <GtaEmoji id="palm" size={58} />
            </div>
            <h2>Your messages</h2>
            <p>Plan a heist, swap lobby codes or drop a meet-up pin. Pick a chat, or start a new one.</p>
            <button type="button" className="ms-btn go" onClick={() => setSheet("crew")}>
              <Icon.Compose size={16} /> New message
            </button>
          </div>
        )}
      </main>

      {sheet && (
        <NewMessageSheet
          startTab={sheet === "requests" ? "requests" : "crew"}
          onClose={() => setSheet(null)}
          onOpenChat={openChat}
          onToast={showToast}
        />
      )}

      {toast && (
        <div key={toast.id} className={`ms-toast${toast.error ? " err" : ""}`} role="status" aria-live="polite">
          {toast.error ? <Icon.Alert size={16} /> : <Icon.Check size={16} />} {toast.text}
        </div>
      )}
    </div>
  );
}
