"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "./icons";
import { formatCount } from "@/lib/format-count";

// The four profile cards (Posts, Likes, Comments, Saves). Each one is a
// dropdown that starts closed; the number stays visible and the detail opens
// on tap, so the profile header stays short.
export default function ProfileStats({ stats, insights }) {
  const [open, setOpen] = useState(() => new Set());

  function toggle(key) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const posts = stats.posts;
  const avg = (n) => (posts > 0 ? (n / posts).toFixed(1).replace(/\.0$/, "") : "0");
  const top = insights?.top || {};

  function topRow(entry, noun) {
    return entry ? (
      <Link href={`/p/${entry.id}`} className="pf-stat-top">
        <span>Top post</span>
        <b>{entry.label}</b>
        <em>
          {formatCount(entry.n)} {noun}
        </em>
      </Link>
    ) : (
      <p className="pf-stat-empty">Nothing here yet.</p>
    );
  }

  const cards = [
    {
      key: "posts",
      label: "Posts",
      value: stats.posts,
      body:
        insights?.breakdown?.length > 0 ? (
          <ul className="pf-stat-list">
            {insights.breakdown.map((row) => (
              <li key={row.type}>
                <span>{row.label}</span>
                <b>{formatCount(row.n)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pf-stat-empty">No posts yet.</p>
        ),
    },
    {
      key: "likes",
      label: "Likes",
      value: stats.likes,
      body: (
        <>
          <p className="pf-stat-line">
            <span>Average per post</span>
            <b>{avg(stats.likes)}</b>
          </p>
          {topRow(top.likes, stats.likes === 1 ? "like" : "likes")}
        </>
      ),
    },
    {
      key: "comments",
      label: "Comments",
      value: stats.comments,
      body: (
        <>
          <p className="pf-stat-line">
            <span>Average per post</span>
            <b>{avg(stats.comments)}</b>
          </p>
          {topRow(top.comments, top.comments?.n === 1 ? "comment" : "comments")}
        </>
      ),
    },
    {
      key: "saves",
      label: "Saves",
      value: stats.saves,
      body: (
        <>
          <p className="pf-stat-line">
            <span>Average per post</span>
            <b>{avg(stats.saves)}</b>
          </p>
          {topRow(top.saves, top.saves?.n === 1 ? "save" : "saves")}
        </>
      ),
    },
  ];

  return (
    <div className="pf-stats">
      {cards.map((c) => {
        const isOpen = open.has(c.key);
        return (
          <div className={`pf-stat${isOpen ? " open" : ""}`} key={c.key}>
            <button
              type="button"
              className="pf-stat-head"
              onClick={() => toggle(c.key)}
              aria-expanded={isOpen}
              aria-controls={`pf-stat-${c.key}`}
            >
              <span className="pf-stat-text">
                <span className="pf-stat-num">{formatCount(c.value)}</span>
                <span className="pf-stat-label">{c.label}</span>
              </span>
              <span className="pf-stat-chev" aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </button>
            <div
              className="pf-stat-drop"
              id={`pf-stat-${c.key}`}
              role="region"
              aria-label={`${c.label} details`}
              inert={!isOpen}
            >
              <div className="pf-stat-drop-in">{c.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
