"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import PlanBadges from "@/components/PlanBadges";
import Bubble from "./Bubble";
import Composer from "./Composer";
import ChatInfo from "./ChatInfo";
import Connect from "./Connect";
import MessageMenu from "./MessageMenu";
import { Avatar, Icon, dayKey, fmtActive, fmtDay } from "./ui";
import { api, makeClientId, post } from "./api";
import { QUICK_REPLIES, snippetFor } from "@/lib/chat-config";
import { useScrollLock } from "@/lib/use-scroll-lock";

const GAP_MS = 4 * 60_000;
const sortMsgs = (a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isPhone = () => typeof window !== "undefined" && window.innerWidth < 900;

// One open chat: loads the history, polls for changes, sends optimistically
// and shows delivery ticks. Remounted (keyed) for each person.
export default function ThreadView({ username, onBack, onListChanged, onToast, onGone }) {
  const [status, setStatus] = useState({ s: "loading", error: "" });
  const [messages, setMessages] = useState([]);
  const [peer, setPeer] = useState(null);
  const [perm, setPerm] = useState(null);
  const [rel, setRel] = useState(null);
  const [flags, setFlags] = useState({ pinned: false, muted: false });
  const [typing, setTyping] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dividerId, setDividerId] = useState(null);
  const [menu, setMenu] = useState(null);
  const [info, setInfo] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [newBelow, setNewBelow] = useState(0);
  const [showJump, setShowJump] = useState(false);

  const messagesRef = useRef([]);
  const convIdRef = useRef(null);
  const cursorRef = useRef(0);
  const meRef = useRef(null);
  const hasMoreRef = useRef(false);
  const scrollRef = useRef(null);
  const atBottom = useRef(true);
  const lastIdRef = useRef(null);
  const prependRef = useRef(0);
  const lastTyping = useRef(0);
  const pollCount = useRef(0);
  const queue = useRef(Promise.resolve());
  const replyRef = useRef(null);

  useScrollLock(isPhone());
  replyRef.current = replyTo;

  const commit = useCallback((next) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const toast = useCallback((t, err = false) => onToast?.(t, err), [onToast]);

  const applyMeta = useCallback((d) => {
    if (d.peer) setPeer(d.peer);
    if (d.perm) setPerm(d.perm);
    if (d.rel) setRel(d.rel);
    if (d.me) meRef.current = d.me;
    if (d.pinned !== undefined) setFlags({ pinned: d.pinned, muted: d.muted });
  }, []);

  // Add / replace / remove messages coming from the server.
  const mergeIn = useCallback(
    (incoming) => {
      const prev = messagesRef.current;
      const known = new Set(prev.map((m) => m.id));
      const map = new Map(prev.map((m) => [m.id, m]));
      const oldest = prev.length ? prev[0].createdAt : 0;
      let freshIncoming = 0;
      for (const raw of incoming) {
        if (raw.gone) {
          map.delete(raw.id);
          continue;
        }
        // An old message that was just reacted to, but isn't loaded yet.
        if (!known.has(raw.id) && hasMoreRef.current && raw.createdAt < oldest) continue;
        if (!known.has(raw.id) && !raw.mine) freshIncoming += 1;
        map.set(raw.id, { ...raw, convId: convIdRef.current });
      }
      commit([...map.values()].sort(sortMsgs));
      if (freshIncoming) onListChanged?.();
    },
    [commit, onListChanged]
  );

  // ---- first load -------------------------------------------------
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const d = await api(`/api/messages/thread?with=${encodeURIComponent(username)}&read=1&meta=1`);
        if (dead) return;
        applyMeta(d);
        convIdRef.current = d.id;
        cursorRef.current = d.cursor;
        hasMoreRef.current = d.hasMore;
        setHasMore(d.hasMore);
        const list = d.messages.map((m) => ({ ...m, convId: d.id })).sort(sortMsgs);
        commit(list);
        if (d.unread > 0) {
          const incoming = list.filter((m) => !m.mine);
          const at = incoming[incoming.length - d.unread];
          if (at) setDividerId(at.id);
        }
        setStatus({ s: "ready", error: "" });
        onListChanged?.();
      } catch (err) {
        if (dead) return;
        if (err.status === 404) onGone?.(err.message);
        setStatus({ s: "error", error: err.message });
      }
    })();
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // ---- polling ----------------------------------------------------
  useEffect(() => {
    if (status.s !== "ready") return undefined;
    let dead = false;
    let timer;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const n = ++pollCount.current;
          const meta = n % 8 === 0 ? "&meta=1" : "";
          const d = await api(`/api/messages/thread?id=${convIdRef.current}&since=${cursorRef.current}&read=1${meta}`);
          if (dead) return;
          cursorRef.current = d.cursor;
          setTyping(!!d.typing);
          if (d.peer) applyMeta(d);
          if (d.messages.length) mergeIn(d.messages);
        } catch {
          // transient network error: try again next tick
        }
      }
      if (!dead) timer = setTimeout(tick, document.hidden ? 8000 : 2500);
    };
    timer = setTimeout(tick, 2500);
    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      dead = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status.s, applyMeta, mergeIn]);

  // ---- phone keyboard: keep the chat exactly as tall as what's visible
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const root = document.documentElement;
    const apply = () => {
      if (window.innerWidth >= 900) {
        root.style.removeProperty("--ms-vh");
        root.style.removeProperty("--ms-top");
        return;
      }
      const zoom = parseFloat(getComputedStyle(root).getPropertyValue("--ui-zoom")) || 1;
      root.style.setProperty("--ms-vh", `${vv.height / zoom}px`);
      root.style.setProperty("--ms-top", `${vv.offsetTop / zoom}px`);
      if (atBottom.current) requestAnimationFrame(() => scrollToBottom(false));
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--ms-vh");
      root.style.removeProperty("--ms-top");
    };
  }, []);

  // ---- scrolling --------------------------------------------------
  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependRef.current) {
      el.scrollTop = el.scrollHeight - prependRef.current;
      prependRef.current = 0;
    }
    const last = messages[messages.length - 1];
    if (!last || last.id === lastIdRef.current) return;
    const first = lastIdRef.current == null;
    lastIdRef.current = last.id;
    if (first) el.scrollTop = el.scrollHeight;
    else if (last.mine || atBottom.current) scrollToBottom(true);
    else setNewBelow((n) => n + 1);
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = dist < 140;
    setShowJump(dist > 420);
    if (dist < 140) setNewBelow(0);
    if (el.scrollTop < 70 && hasMoreRef.current && !loadingMoreRef.current) loadMore();
  }

  const loadingMoreRef = useRef(false);
  async function loadMore() {
    const oldest = messagesRef.current[0]?.createdAt;
    if (!oldest || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const d = await api(`/api/messages/thread?id=${convIdRef.current}&before=${oldest}`);
      const el = scrollRef.current;
      const known = new Set(messagesRef.current.map((m) => m.id));
      const older = d.messages.filter((m) => !known.has(m.id)).map((m) => ({ ...m, convId: convIdRef.current }));
      if (el) prependRef.current = el.scrollHeight - el.scrollTop;
      commit([...older, ...messagesRef.current].sort(sortMsgs));
      hasMoreRef.current = d.hasMore;
      setHasMore(d.hasMore);
    } catch (err) {
      toast(err.message, true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  // ---- sending ----------------------------------------------------
  const upsert = useCallback(
    (m) => {
      const list = messagesRef.current.filter((x) => x.id !== m.id);
      commit([...list, m].sort(sortMsgs));
    },
    [commit]
  );
  const patchMsg = useCallback(
    (id, patch) => commit(messagesRef.current.map((m) => (m.id === id ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m))),
    [commit]
  );

  const send = useCallback(
    (payload, opts = {}, existing = null) => {
      const clientId = existing?.clientId || makeClientId();
      const reply = existing ? existing.replyTo : replyRef.current;
      const now = Date.now();
      const local = existing
        ? { ...existing, state: "sending", local: true, error: null }
        : {
            id: `c${clientId}`,
            clientId,
            convId: convIdRef.current,
            mine: true,
            local: true,
            state: "sending",
            type: payload.type,
            text: payload.text || "",
            sticker: payload.sticker || null,
            invite: payload.invite || null,
            code: payload.code || null,
            meetup: payload.meetup || null,
            media: payload.type === "image" ? { w: payload.w, h: payload.h } : null,
            localSrc: opts.localSrc || null,
            createdAt: now,
            updatedAt: now,
            rx: { mine: null, theirs: null },
            deleted: false,
            replyTo: reply ? { id: reply.id, from: reply.from, name: reply.name, snippet: reply.snippet, type: reply.type } : null,
            payload,
          };
      upsert(local);
      setReplyTo(null);
      atBottom.current = true;

      queue.current = queue.current
        .then(async () => {
          try {
            const r = await post("/api/messages/send", { to: username, clientId, replyTo: reply?.id || undefined, ...payload });
            upsert({ ...r.message, convId: convIdRef.current });
            if (r.perm) setPerm(r.perm);
            onListChanged?.();
          } catch (err) {
            patchMsg(local.id, { state: "failed", error: err.message });
            if (err.data?.perm) setPerm(err.data.perm);
            toast(err.message, true);
          }
          await sleep(320);
        })
        .catch(() => {});
    },
    [username, upsert, patchMsg, toast, onListChanged]
  );

  const retry = (m) => send(m.payload, { localSrc: m.localSrc }, m);

  // ---- message actions -------------------------------------------
  async function react(m, emoji) {
    const before = m.rx;
    patchMsg(m.id, { rx: { ...m.rx, mine: emoji } });
    try {
      await post("/api/messages/message", { convId: convIdRef.current, id: m.id, action: "react", emoji });
    } catch (err) {
      patchMsg(m.id, { rx: before });
      toast(err.message, true);
    }
  }

  function startReply(m) {
    const me = meRef.current;
    setEditing(null);
    setReplyTo({
      id: m.id,
      from: m.mine ? me?.uid : peer.uid,
      name: m.mine ? "yourself" : peer.displayName,
      snippet: snippetFor(m.type, m),
      type: m.type,
    });
  }

  async function saveEdit(text) {
    const m = editing;
    setEditing(null);
    const before = { text: m.text, edited: m.edited };
    patchMsg(m.id, { text, edited: true });
    try {
      await post("/api/messages/message", { convId: convIdRef.current, id: m.id, action: "edit", text });
    } catch (err) {
      patchMsg(m.id, before);
      toast(err.message, true);
    }
  }

  async function removeMessage(m, scope) {
    if (m.local && m.state === "failed") {
      commit(messagesRef.current.filter((x) => x.id !== m.id));
      return;
    }
    const snapshot = messagesRef.current;
    if (scope === "all") {
      patchMsg(m.id, { deleted: true, text: "", sticker: null, invite: null, code: null, meetup: null, media: null, replyTo: null, rx: { mine: null, theirs: null } });
    } else {
      commit(snapshot.filter((x) => x.id !== m.id));
    }
    try {
      await post("/api/messages/message", { convId: convIdRef.current, id: m.id, action: "delete", scope });
      onListChanged?.();
    } catch (err) {
      commit(snapshot);
      toast(err.message, true);
    }
  }

  function onTyping() {
    const now = Date.now();
    if (now - lastTyping.current < 3000 || !convIdRef.current) return;
    lastTyping.current = now;
    post("/api/messages/typing", { convId: convIdRef.current }).catch(() => {});
  }

  // ---- chat-level actions ----------------------------------------
  async function chatAction(action) {
    try {
      await post("/api/messages/conversation", { convId: convIdRef.current, action });
      onListChanged?.();
      return true;
    } catch (err) {
      toast(err.message, true);
      return false;
    }
  }
  async function togglePin(on) {
    if (await chatAction(on ? "pin" : "unpin")) {
      setFlags((f) => ({ ...f, pinned: on }));
      toast(on ? "Chat pinned" : "Chat unpinned");
    }
  }
  async function toggleMute(on) {
    if (await chatAction(on ? "mute" : "unmute")) {
      setFlags((f) => ({ ...f, muted: on }));
      toast(on ? "Chat muted" : "Chat unmuted");
    }
  }
  async function deleteChat() {
    if (await chatAction("delete")) {
      toast("Chat deleted");
      setInfo(false);
      onBack(true);
    }
  }
  async function refreshMeta() {
    try {
      const d = await api(`/api/messages/thread?id=${convIdRef.current}&since=${cursorRef.current}&meta=1`);
      applyMeta(d);
    } catch {
      // next poll will retry
    }
  }
  async function blockAction(action) {
    try {
      await post("/api/settings/blocked", { username, action });
      toast(action === "block" ? `Blocked @${username}` : `Unblocked @${username}`);
      setInfo(false);
      await refreshMeta();
      onListChanged?.();
      if (action === "block") onBack(true);
    } catch (err) {
      toast(err.message, true);
    }
  }
  const onRel = (nextRel, nextPerm) => {
    setRel(nextRel);
    if (nextPerm) {
      setPerm((old) => {
        if (nextPerm.ok && old && !old.ok) toast(`You can message @${username} now`);
        return nextPerm;
      });
    }
  };

  // ---- derived rows ----------------------------------------------
  const rows = useMemo(() => {
    const out = [];
    const byId = new Map(messages.map((m) => [m.id, m]));
    let lastMineId = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].mine && !messages[i].deleted) {
        lastMineId = messages[i].id;
        break;
      }
    }
    let day = "";
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const dk = dayKey(m.createdAt);
      if (dk !== day) {
        out.push({ k: "day", id: `d${dk}`, label: fmtDay(m.createdAt) });
        day = dk;
      }
      if (m.id === dividerId) out.push({ k: "new", id: "new" });
      out.push({
        k: "msg",
        m,
        first: !prev || prev.mine !== m.mine || dayKey(prev.createdAt) !== dk || m.createdAt - prev.createdAt > GAP_MS,
        last: !next || next.mine !== m.mine || dayKey(next.createdAt) !== dk || next.createdAt - m.createdAt > GAP_MS,
        isLastMine: m.id === lastMineId,
        replySource: m.replyTo ? byId.get(m.replyTo.id) : null,
      });
    });
    return out;
  }, [messages, dividerId]);

  // ---- render -----------------------------------------------------
  if (status.s === "loading") {
    return (
      <div className="ms-thread">
        <header className="ms-thead">
          <button type="button" className="ms-back" onClick={() => onBack(false)} aria-label="Back to chats"><Icon.Back size={22} /></button>
          <div className="ms-skel inline"><i /><span><b /></span></div>
        </header>
        <div className="ms-tbody center"><span className="ms-spin big" aria-label="Loading chat" /></div>
      </div>
    );
  }

  if (status.s === "error" || !peer) {
    return (
      <div className="ms-thread">
        <header className="ms-thead">
          <button type="button" className="ms-back" onClick={() => onBack(false)} aria-label="Back to chats"><Icon.Back size={22} /></button>
          <b>Chat</b>
        </header>
        <div className="ms-tbody center">
          <div className="ms-empty-s">
            <b>Couldn’t open this chat</b>
            <span>{status.error || "Something went wrong."}</span>
            <button type="button" className="ms-btn go" onClick={() => onBack(false)}>Back to chats</button>
          </div>
        </div>
      </div>
    );
  }

  const presence = typing ? "typing…" : peer.online ? "Online" : fmtActive(peer.activeAt) || `@${peer.username}`;
  const youBlocked = perm?.code === "youBlocked";
  const canWrite = perm?.ok;
  const needFollow = perm?.need?.includes("follow");
  const needFriend = perm?.need?.includes("friend");
  const show = [needFollow && "follow", needFriend && "friend"].filter(Boolean);

  return (
    <div className="ms-thread">
      <header className="ms-thead">
        <button type="button" className="ms-back" onClick={() => onBack(false)} aria-label="Back to chats">
          <Icon.Back size={22} />
        </button>
        <button type="button" className="ms-who" onClick={() => setInfo(true)} aria-label="Chat info">
          <Avatar person={peer} size={40} online={peer.online} />
          <span className="ms-who-t">
            <b>
              <span className="ms-ell">{peer.displayName}</span>
              <PlanBadges plan={peer.plan} />
            </b>
            <small className={typing ? "typing" : peer.online ? "online" : ""}>{presence}</small>
          </span>
        </button>
        <Link href={`/u/${peer.username}`} className="ms-hbtn" aria-label="View profile" title="View profile">
          <Icon.User size={20} />
        </Link>
        <button type="button" className="ms-hbtn" onClick={() => setInfo(true)} aria-label="Chat info" title="Chat info">
          <Icon.Dots size={20} />
        </button>
      </header>

      <div className="ms-tbody" ref={scrollRef} onScroll={onScroll}>
        {hasMore && (
          <button type="button" className="ms-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load earlier messages"}
          </button>
        )}

        {messages.length === 0 && (
          <div className="ms-hello">
            <Avatar person={peer} size={72} />
            <h3>{peer.displayName}</h3>
            <p>@{peer.username}</p>
            {canWrite ? (
              <>
                <span className="ms-hello-t">Break the ice</span>
                <div className="ms-hello-chips">
                  {QUICK_REPLIES.slice(0, 4).map((t) => (
                    <button key={t} type="button" onClick={() => send({ type: "text", text: t })}>
                      {t.replace(/:[a-z0-9]+:/g, "").trim()}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span className="ms-hello-t">Messages are private between you and @{peer.username}.</span>
            )}
          </div>
        )}

        <div className="ms-msgs">
          {rows.map((r) =>
            r.k === "day" ? (
              <div key={r.id} className="ms-day"><span>{r.label}</span></div>
            ) : r.k === "new" ? (
              <div key={r.id} className="ms-newdiv"><span>New messages</span></div>
            ) : (
              <Bubble
                key={r.m.id}
                m={r.m}
                peer={peer}
                first={r.first}
                last={r.last}
                showAvatar={r.last}
                isLastMine={r.isLastMine}
                replySource={r.replySource}
                onMenu={(m, rect) => setMenu({ m, rect })}
                onReact={(m) => react(m, null)}
                onReply={startReply}
                onRetry={retry}
                onImage={setLightbox}
                onToast={(t) => toast(t)}
              />
            )
          )}
          {typing && (
            <div className="mg-row theirs first last typing-row">
              <div className="mg-av-slot"><Avatar person={peer} size={28} /></div>
              <div className="mg-swipe"><div className="mg-col"><div className="mg-bubble ms-typing" aria-label={`${peer.displayName} is typing`}><i /><i /><i /></div></div></div>
            </div>
          )}
        </div>
      </div>

      {(showJump || newBelow > 0) && (
        <button type="button" className="ms-jump" onClick={() => { scrollToBottom(true); setNewBelow(0); }} aria-label="Jump to latest">
          {newBelow > 0 && <em>{newBelow} new</em>}
          <Icon.Arrow size={18} className="down" />
        </button>
      )}

      {canWrite ? (
        <Composer
          draftKey={username}
          onSend={send}
          onTyping={onTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSaveEdit={saveEdit}
          onToast={toast}
        />
      ) : (
        <div className="ms-banner" role="status">
          <Icon.Lock size={20} />
          <p>{perm?.reason || "You can’t message this person."}</p>
          {youBlocked ? (
            <button type="button" className="ms-btn go" onClick={() => blockAction("unblock")}>Unblock</button>
          ) : show.length > 0 ? (
            <Connect username={username} rel={rel} show={show} onRel={onRel} onError={(t) => toast(t, true)} className="center" />
          ) : null}
        </div>
      )}

      {menu && (
        <MessageMenu
          m={menu.m}
          rect={menu.rect}
          onClose={() => setMenu(null)}
          onReact={react}
          onReply={startReply}
          onEdit={(m) => { setReplyTo(null); setEditing(m); }}
          onDelete={removeMessage}
          onToast={toast}
        />
      )}

      {info && (
        <ChatInfo
          peer={peer}
          rel={rel}
          perm={perm}
          pinned={flags.pinned}
          muted={flags.muted}
          hasChat={messages.length > 0}
          onClose={() => setInfo(false)}
          onRel={onRel}
          onPin={togglePin}
          onMute={toggleMute}
          onDeleteChat={deleteChat}
          onBlock={() => blockAction("block")}
          onUnblock={() => blockAction("unblock")}
          onToast={toast}
        />
      )}

      {lightbox && typeof document !== "undefined" &&
        createPortal(
          <div className="ms-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label="Photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.localSrc || `/api/messages/media/${lightbox.convId}/${lightbox.id}`} alt={lightbox.text || "Photo"} onClick={(e) => e.stopPropagation()} />
            <button type="button" className="ms-x" onClick={() => setLightbox(null)} aria-label="Close"><Icon.Close size={22} /></button>
            {!lightbox.localSrc && (
              <a className="ms-btn ghost" href={`/api/messages/media/${lightbox.convId}/${lightbox.id}`} download={`gta6fanbase-${lightbox.id}.jpg`} onClick={(e) => e.stopPropagation()}>
                <Icon.Download size={16} /> Save
              </a>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

