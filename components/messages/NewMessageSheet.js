"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PlanBadges from "@/components/PlanBadges";
import Connect, { socialAct } from "./Connect";
import { Avatar, Icon, Sheet } from "./ui";
import { api } from "./api";
import { pollNow } from "@/lib/message-sync";

// One person in a list: who they are, how you're connected, and what you can
// do next (message / follow / friend / view profile).
export function PersonRow({ person, onRel, onMessage, onToast }) {
  const { rel, perm } = person;
  const canMsg = perm?.ok;
  return (
    <li className="ms-prow">
      <Avatar person={person} size={46} />
      <div className="ms-prow-id">
        <b>
          <span className="ms-ell">{person.displayName}</span>
          <PlanBadges plan={person.plan} />
        </b>
        <span className="ms-prow-handle">
          @{person.username}
          {rel.friend === "friends" && <i className="chip friend">Friend</i>}
          {rel.following && rel.friend !== "friends" && <i className="chip">Following</i>}
          {rel.followsYou && <i className="chip dim">Follows you</i>}
        </span>
      </div>

      <div className="ms-prow-acts">
        <button
          type="button"
          className={`ms-btn go sm${canMsg ? "" : " locked"}`}
          onClick={() => (canMsg ? onMessage(person.username) : onToast(perm?.reason || "You can’t message this person yet."))}
          aria-disabled={!canMsg}
        >
          {canMsg ? <Icon.Send size={14} /> : <Icon.Lock size={14} />} Message
        </button>
        <Connect username={person.username} rel={rel} compact onRel={onRel} onError={(t) => onToast(t, true)} />
        <Link href={`/u/${person.username}`} className="ms-btn ghost sm">
          <Icon.User size={14} /> Profile
        </Link>
      </div>

      {!canMsg && perm?.reason && (
        <p className="ms-prow-why">
          <Icon.Lock size={13} /> {perm.reason}
        </p>
      )}
    </li>
  );
}

function RequestRow({ person, mode, onDone, onToast }) {
  const [busy, setBusy] = useState("");
  async function act(kind) {
    setBusy(kind);
    try {
      await socialAct(person.username, kind);
      if (kind === "accept") onToast(`You and @${person.username} are friends`);
      onDone();
    } catch (err) {
      onToast(err.message, true);
    } finally {
      setBusy("");
    }
  }
  return (
    <li className="ms-prow slim">
      <Avatar person={person} size={42} />
      <div className="ms-prow-id">
        <b>
          <span className="ms-ell">{person.displayName}</span>
          <PlanBadges plan={person.plan} />
        </b>
        <span className="ms-prow-handle">@{person.username}</span>
      </div>
      <div className="ms-prow-acts inline">
        {mode === "in" ? (
          <>
            <button type="button" className="ms-btn go sm" disabled={!!busy} onClick={() => act("accept")}>
              <Icon.Check size={14} /> {busy === "accept" ? "…" : "Accept"}
            </button>
            <button type="button" className="ms-btn ghost sm" disabled={!!busy} onClick={() => act("decline")}>
              {busy === "decline" ? "…" : "Decline"}
            </button>
          </>
        ) : (
          <button type="button" className="ms-btn ghost sm" disabled={!!busy} onClick={() => act("cancel")}>
            {busy === "cancel" ? "…" : "Cancel request"}
          </button>
        )}
      </div>
    </li>
  );
}

const Section = ({ title, count, children }) => (
  <section className="ms-people-sec">
    <h3>
      {title} {count != null && <em>{count}</em>}
    </h3>
    <ul>{children}</ul>
  </section>
);

// "New message": its own sheet (bottom sheet on phones, dialog on desktop).
export default function NewMessageSheet({ onClose, onOpenChat, onToast, startTab = "crew" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [crew, setCrew] = useState(null);
  const [tab, setTab] = useState(startTab);
  const [error, setError] = useState("");
  const seq = useRef(0);

  const loadCrew = useCallback(async () => {
    try {
      const d = await api("/api/messages/people");
      setCrew(d.crew);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    pollNow();
  }, []);

  useEffect(() => {
    loadCrew();
  }, [loadCrew]);

  // Debounced handle search.
  useEffect(() => {
    const term = q.trim().replace(/^@/, "");
    if (!term) {
      setResults(null);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const d = await api(`/api/messages/people?q=${encodeURIComponent(term)}`);
        if (mine === seq.current) {
          setResults(d.results);
          setError("");
        }
      } catch (err) {
        if (mine === seq.current) setError(err.message);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const patch = (list, username, rel, perm) =>
    list.map((p) => (p.username === username ? { ...p, rel, perm } : p));
  const onRel = (username) => (rel, perm) => {
    setResults((r) => r && patch(r, username, rel, perm));
    setCrew((c) => c && { ...c, friends: patch(c.friends, username, rel, perm), following: patch(c.following, username, rel, perm) });
    pollNow();
  };

  const incoming = crew?.incoming || [];
  const outgoing = crew?.outgoing || [];
  const reqCount = incoming.length;
  const hasCrew = crew && (crew.friends.length || crew.following.length);

  const row = (p) => <PersonRow key={p.username} person={p} onRel={onRel(p.username)} onMessage={onOpenChat} onToast={onToast} />;

  return (
    <Sheet title="New message" onClose={onClose} size="lg" className="ms-people">
      <div className="ms-people-search">
        <Icon.Search size={18} />
        <span className="at" aria-hidden="true">@</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.replace(/\s/g, ""))}
          placeholder="Search a handle"
          aria-label="Search a handle"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={21}
          autoFocus
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search">
            <Icon.Close size={16} />
          </button>
        )}
      </div>

      {error && <p className="ms-error" role="alert"><Icon.Alert size={15} /> {error}</p>}

      {q.trim() ? (
        <div className="ms-people-list">
          {searching && !results && <p className="ms-muted">Searching…</p>}
          {results && results.length === 0 && !searching && (
            <div className="ms-empty-s">
              <b>No one goes by “{q.replace(/^@/, "")}”</b>
              <span>Handles are searched by what they start with. Check the spelling, or the person may have hidden themselves from search.</span>
            </div>
          )}
          {results && results.length > 0 && <ul>{results.map(row)}</ul>}
        </div>
      ) : (
        <>
          <div className="ms-seg ms-people-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "crew"} className={tab === "crew" ? "on" : ""} onClick={() => setTab("crew")}>
              Your crew
            </button>
            <button type="button" role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}>
              Requests {reqCount > 0 && <i className="ms-count">{reqCount}</i>}
            </button>
          </div>

          <div className="ms-people-list">
            {!crew && !error && <p className="ms-muted">Loading your crew…</p>}

            {crew && tab === "crew" && (
              <>
                {!hasCrew && (
                  <div className="ms-empty-s">
                    <b>No crew yet</b>
                    <span>Search a handle above to message someone, follow them or send a friend request.</span>
                  </div>
                )}
                {crew.friends.length > 0 && <Section title="Friends" count={crew.friends.length}>{crew.friends.map(row)}</Section>}
                {crew.following.length > 0 && <Section title="Following" count={crew.following.length}>{crew.following.map(row)}</Section>}
              </>
            )}

            {crew && tab === "requests" && (
              <>
                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="ms-empty-s">
                    <b>No friend requests</b>
                    <span>When someone adds you, it shows up here.</span>
                  </div>
                )}
                {incoming.length > 0 && (
                  <Section title="Wants to be friends" count={incoming.length}>
                    {incoming.map((p) => <RequestRow key={p.username} person={p} mode="in" onDone={loadCrew} onToast={onToast} />)}
                  </Section>
                )}
                {outgoing.length > 0 && (
                  <Section title="Sent by you" count={outgoing.length}>
                    {outgoing.map((p) => <RequestRow key={p.username} person={p} mode="out" onDone={loadCrew} onToast={onToast} />)}
                  </Section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
