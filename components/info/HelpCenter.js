"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import InfoIcon from "./icons";
import { plainText, renderRich } from "./rich";

// Searchable help. Every question and answer is in the server-rendered HTML
// (so search engines read all of it); typing in the box or picking a topic
// only hides what doesn't match.
export default function HelpCenter({ groups }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const visible = useMemo(() => {
    return groups
      .filter((g) => topic === "all" || g.id === topic)
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (!terms.length) return true;
          const hay = plainText(`${it.q} ${(Array.isArray(it.a) ? it.a : [it.a]).join(" ")}`).toLowerCase();
          return terms.every((t) => hay.includes(t));
        }),
      }))
      .filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, topic, query]);

  const total = visible.reduce((n, g) => n + g.items.length, 0);
  const filtering = terms.length > 0 || topic !== "all";

  return (
    <div className="ip-help">
      <div className="ip-search" role="search">
        <InfoIcon name="search" />
        <label className="ip-sr" htmlFor="help-q">
          Search the help center
        </label>
        <input
          id="help-q"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search: reset password, post limits, private account..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="ip-search-x" aria-label="Clear search" onClick={() => setQuery("")}>
            <InfoIcon name="x" />
          </button>
        )}
      </div>

      <div className="ip-topics" role="group" aria-label="Filter by topic">
        <button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>
          All topics
        </button>
        {groups.map((g) => (
          <button key={g.id} type="button" aria-pressed={topic === g.id} onClick={() => setTopic(g.id)}>
            <InfoIcon name={g.icon} />
            {g.title}
          </button>
        ))}
      </div>

      <p className="ip-count" role="status" aria-live="polite">
        {filtering ? `${total} ${total === 1 ? "answer" : "answers"} found` : `${total} answers across ${groups.length} topics`}
      </p>

      {visible.map((g) => (
        <section key={g.id} id={g.id} className="ip-sec ip-helpgroup" aria-labelledby={`${g.id}-h`}>
          <h2 id={`${g.id}-h`} className="ip-h2">
            <span className="ip-h2-ic">
              <InfoIcon name={g.icon} />
            </span>
            <span>{g.title}</span>
          </h2>
          {g.blurb && <p className="ip-lead">{g.blurb}</p>}
          <div className="ip-faq">
            {g.items.map((it) => (
              <details key={it.q} className="ip-q">
                <summary>
                  <span>{it.q}</span>
                  <span className="ip-q-plus" aria-hidden="true" />
                </summary>
                <div className="ip-q-a">
                  {(Array.isArray(it.a) ? it.a : [it.a]).map((para, i) => (
                    <p key={i}>{renderRich(para)}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      {total === 0 && (
        <div className="ip-empty">
          <InfoIcon name="search" />
          <h3>No answers for that yet</h3>
          <p>
            Try fewer or different words, or <Link href="/contact">send us a message</Link> and we will help.
          </p>
          <button
            type="button"
            className="ip-btn ghost"
            onClick={() => {
              setQuery("");
              setTopic("all");
            }}
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
