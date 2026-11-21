"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import GiftCard from "./GiftCard";
import { SendingTo } from "./Recipient";
import Select from "@/components/ui/Select";
import {
  CATEGORIES,
  GAMES,
  GIFTS,
  RARITIES,
  filterGifts,
  getCategory,
  getGame,
} from "@/lib/gifts";

const SORTS = [
  ["featured", "Featured"],
  ["new", "Newest game"],
  ["low", "Price: low to high"],
  ["high", "Price: high to low"],
  ["az", "Name: A to Z"],
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

// The catalog: search, filter by game / category / rarity, sort. Every gift is
// rendered on the server first (so search engines see the whole catalog) and
// the controls below only narrow what is shown.
export default function GiftsShop({ ctx, receiver, problem, initial }) {
  const [q, setQ] = useState(initial.q);
  const [game, setGame] = useState(initial.game);
  const [category, setCategory] = useState(initial.category);
  const [rarity, setRarity] = useState(initial.rarity);
  const [sort, setSort] = useState(initial.sort);
  const first = useRef(true);

  // Keep the filters in the address bar (shareable), without touching the
  // gift destination (to / ctx / post / c) that is already there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const url = new URL(window.location.href);
    const set = (k, v, empty) => (v && v !== empty ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    set("q", q.trim(), "");
    set("game", game, "all");
    set("cat", category, "all");
    set("rarity", rarity, "all");
    set("sort", sort, "featured");
    window.history.replaceState(window.history.state, "", url);
  }, [q, game, category, rarity, sort]);

  const list = useMemo(
    () => filterGifts(GIFTS, { q, game, category, rarity, sort }),
    [q, game, category, rarity, sort]
  );

  const active = (q.trim() ? 1 : 0) + (game !== "all") + (category !== "all") + (rarity !== "all");
  function reset() {
    setQ("");
    setGame("all");
    setCategory("all");
    setRarity("all");
    setSort("featured");
  }

  return (
    <>
      {receiver && (
        <SendingTo person={receiver} ctx={ctx}>
          <Link href="/gifts" className="gf-to-change">
            Change
          </Link>
        </SendingTo>
      )}
      {problem && <p className="gf-alert" role="alert">{problem}</p>}

      <section className="gf-tools" aria-label="Find a gift">
        <label className="gf-search">
          <SearchIcon />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gifts, games or cars…"
            aria-label="Search gifts"
            enterKeyHint="search"
            autoComplete="off"
          />
          {q && (
            <button type="button" className="gf-search-x" onClick={() => setQ("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>

        <div className="gf-chips" role="group" aria-label="Filter by game">
          <button type="button" className={`gf-chip${game === "all" ? " is-on" : ""}`} onClick={() => setGame("all")}>
            All games
          </button>
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`gf-chip${game === g.id ? " is-on" : ""}`}
              style={{ "--g": g.color }}
              onClick={() => setGame(game === g.id ? "all" : g.id)}
              aria-pressed={game === g.id}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="gf-chips" role="group" aria-label="Filter by type">
          <button type="button" className={`gf-chip gf-chip-alt${category === "all" ? " is-on" : ""}`} onClick={() => setCategory("all")}>
            All types
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`gf-chip gf-chip-alt${category === c.id ? " is-on" : ""}`}
              onClick={() => setCategory(category === c.id ? "all" : c.id)}
              aria-pressed={category === c.id}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="gf-selects">
          <label className="gf-select">
            <span>Rarity</span>
            <Select label="Rarity" value={rarity} onChange={setRarity} options={[{ value: "all", label: "Any rarity" }, ...RARITIES.map((r) => ({ value: r.id, label: r.name }))]} />
          </label>
          <label className="gf-select">
            <span>Sort by</span>
            <Select label="Sort by" value={sort} onChange={setSort} options={SORTS.map(([id, label]) => ({ value: id, label }))} />
          </label>
        </div>
      </section>

      <div className="gf-count" role="status" aria-live="polite">
        <span>
          {list.length} {list.length === 1 ? "gift" : "gifts"}
          {game !== "all" && <> · {getGame(game).name}</>}
          {category !== "all" && <> · {getCategory(category).name}</>}
        </span>
        {active > 0 && (
          <button type="button" className="gf-reset" onClick={reset}>
            Clear filters
          </button>
        )}
      </div>

      {list.length > 0 ? (
        <section className="gf-grid" aria-label="Gifts">
          {list.map((g) => (
            <GiftCard key={g.id} gift={g} ctx={ctx} />
          ))}
        </section>
      ) : (
        <div className="gf-empty">
          <span aria-hidden="true">🔍</span>
          <p>No gifts match that.</p>
          <button type="button" className="gf-btn gf-btn-ghost" onClick={reset}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
