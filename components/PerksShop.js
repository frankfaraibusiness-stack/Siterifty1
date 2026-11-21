"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import PriceNote from "./PriceNote";
import { useMoney } from "./CurrencyProvider";
import FullScreen from "./FullScreen";
import Toast, { useToast } from "./Toast";
import {
  PERKS,
  PERKS_FREE_WHILE_TESTING,
  cleanPerks,
  hasPerk,
} from "@/lib/perks";

// Where to send someone after they own a perk, so they can use it right away.
const TRY = {
  forever_pin: { href: "/", label: "Go comment on a post" },
  essay_mode: { href: "/", label: "Go write a long comment" },
  neon_glow: { href: "/", label: "Go comment on a post" },
  vice_pack: { href: "/settings", label: "Pick your new accent" },
  story_extender: { href: "/", label: "Go share a story" },
  big_bio: { href: "/settings", label: "Write your longer bio" },
  supporter_badge: { href: (u) => (u ? `/u/${u.username}` : "/"), label: "See it on your profile" },
  gradient_name: { href: (u) => (u ? `/u/${u.username}` : "/"), label: "See your name on your profile" },
  halo_avatar: { href: (u) => (u ? `/u/${u.username}` : "/"), label: "See your halo on your profile" },
  neon_pack: { href: "/settings", label: "Pick your new accent" },
};

// ---- small icons -----------------------------------------------------------
const ICONS = {
  pin: <path d="M14.5 3.5l6 6-2.2.9-3.1 3.1.4 4.3-1.4 1.4-3.6-3.6-5 5-1-1 5-5-3.6-3.6 1.4-1.4 4.3.4 3.1-3.1.9-2.2z" />,
  text: (
    <>
      <path d="M4 6h16M4 11h16M4 16h10" />
    </>
  ),
  glow: (
    <>
      <path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z" />
      <path d="M18.5 15.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2.1-.5-1.1.1-2.4 1.5-2.4h1.6a3.9 3.9 0 0 0 3.9-3.9C20 7.3 16.5 3.5 12 3.5z" />
      <path d="M8 11.5h.01M11 8h.01M15 8.8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.7-3.7 3.6-5.6 7.2-5.6s6.5 1.9 7.2 5.6" />
    </>
  ),
  badge: <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />,
  type: (
    <>
      <path d="M5 19l5.2-14h1.6L17 19M7.2 14h7.6" />
      <path d="M18.5 7.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" />
    </>
  ),
  halo: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="8.4" strokeDasharray="2.4 3.2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

function Icon({ name, filled = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

// ---- banner art: one little scene per perk ---------------------------------
function Line({ w }) {
  return <i className="pk-line" style={{ width: `${w}%` }} />;
}

function Scene({ id }) {
  if (id === "forever_pin") {
    return (
      <div className="pk-scene pk-scene-pin" aria-hidden="true">
        <div className="pk-mini pk-mini-gold">
          <span className="pk-dot" />
          <span className="pk-lines">
            <span className="pk-tag"><Icon name="pin" filled />Pinned forever</span>
            <Line w={88} />
            <Line w={52} />
          </span>
        </div>
        <div className="pk-mini pk-mini-faded">
          <span className="pk-dot" />
          <span className="pk-lines"><Line w={70} /><Line w={45} /></span>
        </div>
        <div className="pk-mini pk-mini-faded pk-mini-faded-2">
          <span className="pk-dot" />
          <span className="pk-lines"><Line w={60} /></span>
        </div>
      </div>
    );
  }
  if (id === "essay_mode") {
    return (
      <div className="pk-scene pk-scene-essay" aria-hidden="true">
        <div className="pk-box">
          <Line w={96} /><Line w={90} /><Line w={98} /><Line w={84} /><Line w={92} /><Line w={46} />
        </div>
        <span className="pk-limit"><s>500</s><b>1,500</b></span>
      </div>
    );
  }
  if (id === "big_bio") {
    return (
      <div className="pk-scene pk-scene-essay" aria-hidden="true">
        <div className="pk-box">
          <div className="pk-bio-head"><span className="pk-dot" /><Line w={34} /></div>
          <Line w={96} /><Line w={90} /><Line w={94} /><Line w={52} />
        </div>
        <span className="pk-limit"><s>160</s><b>400</b></span>
      </div>
    );
  }
  if (id === "supporter_badge") {
    return (
      <div className="pk-scene" aria-hidden="true">
        <div className="pk-mini">
          <span className="pk-dot" />
          <span className="pk-lines">
            <span className="pk-namerow">
              <b>lucia.ray</b>
              <span className="pk-sup"><Icon name="badge" filled /></span>
            </span>
            <Line w={84} />
            <Line w={50} />
          </span>
        </div>
      </div>
    );
  }
  if (id === "gradient_name") {
    return (
      <div className="pk-scene" aria-hidden="true">
        <span className="pk-gname-wrap"><span className="pk-gname">lucia.ray</span></span>
      </div>
    );
  }
  if (id === "halo_avatar") {
    return (
      <div className="pk-scene" aria-hidden="true">
        <span className="pk-halo-av">L</span>
      </div>
    );
  }
  if (id === "neon_pack") {
    return (
      <div className="pk-scene pk-scene-pack" aria-hidden="true">
        <span className="pk-swatch" style={{ "--s1": "#8a5cff", "--s2": "#00e5ff" }} />
        <span className="pk-swatch pk-swatch-mid" style={{ "--s1": "#b6ff3b", "--s2": "#00c853" }} />
        <span className="pk-swatch" style={{ "--s1": "#ff2e63", "--s2": "#ff8a5c" }} />
      </div>
    );
  }
  if (id === "neon_glow") {
    return (
      <div className="pk-scene pk-scene-glow" aria-hidden="true">
        <div className="pk-mini pk-mini-neon">
          <span className="pk-dot" />
          <span className="pk-lines"><Line w={86} /><Line w={58} /></span>
        </div>
      </div>
    );
  }
  if (id === "vice_pack") {
    return (
      <div className="pk-scene pk-scene-pack" aria-hidden="true">
        <span className="pk-swatch" style={{ "--s1": "#ff6ec7", "--s2": "#ffb347" }} />
        <span className="pk-swatch pk-swatch-mid" style={{ "--s1": "#00e5ff", "--s2": "#3d5afe" }} />
        <span className="pk-swatch" style={{ "--s1": "#ffd36b", "--s2": "#e8590c" }} />
      </div>
    );
  }
  return (
    <div className="pk-scene pk-scene-clock" aria-hidden="true">
      <div className="pk-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" className="pk-ring-bg" />
          <circle cx="50" cy="50" r="42" className="pk-ring-fg" />
        </svg>
        <span><b>72h</b><small>was 24h</small></span>
      </div>
    </div>
  );
}

function Banner({ perk, large = false }) {
  return (
    <span className={`pk-banner${large ? " pk-banner-lg" : ""}`}>
      <span className="pk-banner-grid" />
      <span className="pk-banner-icon">
        <Icon name={perk.icon} />
      </span>
      <Scene id={perk.id} />
    </span>
  );
}

// ---- detail screen ---------------------------------------------------------
// A perk opens on its own full screen: banner, what it does, how it works, and
// the buy button pinned at the bottom.
function PerkSheet({ perk, owned, busy, user, onBuy, onClose }) {
  const money = useMoney();
  const try_ = TRY[perk.id];

  return (
    <FullScreen
      title={perk.name}
      subtitle={`${money(perk.price)} · one time`}
      onClose={onClose}
      size="md"
      className="pk-fs"
      style={{ "--a": perk.a, "--b": perk.b }}
      footer={
        owned ? (
          <>
            <button type="button" className="pk-buy is-owned" disabled>
              <Icon name="check" /> You own this
            </button>
            {try_ && (
              <Link href={typeof try_.href === "function" ? try_.href(user) : try_.href} className="pk-try">
                {try_.label} →
              </Link>
            )}
          </>
        ) : (
          <>
            <button type="button" className="pk-buy" onClick={onBuy} disabled={busy} aria-busy={busy}>
              {busy ? "Unlocking…" : `Get ${perk.name} · ${money(perk.price)}`}
            </button>
            <p className="pk-foot-note">
              {PERKS_FREE_WHILE_TESTING ? "Free while we test. Nothing is charged." : "One payment. Yours forever."}
            </p>
          </>
        )
      }
    >
      <div className="pk-fs-banner">
        <Banner perk={perk} large />
      </div>

      <div className="pk-sheet-body">
        <div className="pk-sheet-head">
          <h2 className="pk-sheet-title">{perk.name}</h2>
          <span className="pk-price-pill">{money(perk.price)} · one time</span>
        </div>
        <p className="pk-sheet-sum">{perk.summary}</p>

        {perk.description.map((p) => (
          <p key={p} className="pk-p">{p}</p>
        ))}

        <h3 className="pk-h3">How it works</h3>
        <ol className="pk-steps">
          {perk.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="pk-note">
          <Icon name="check" />
          <span>{perk.fine}</span>
        </div>
      </div>
    </FullScreen>
  );
}

// ---- the shop --------------------------------------------------------------
export default function PerksShop({ user, initialOwned }) {
  const money = useMoney();
  const router = useRouter();
  const [owned, setOwned] = useState(() => cleanPerks(initialOwned));
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState("");
  const { toast, show, hide } = useToast();
  const [authOpen, setAuthOpen] = useState(false);

  const open = PERKS.find((p) => p.id === openId) || null;

  async function buy(perk) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (busy) return;
    setBusy(perk.id);
    try {
      const res = await fetch("/api/perks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perk: perk.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn’t unlock that perk.");
      setOwned(cleanPerks(data.perks));
      show(`${perk.name} unlocked.`, "success");
      router.refresh();
    } catch (err) {
      show(err.message || "Couldn’t unlock that perk.", "error");
    } finally {
      setBusy("");
    }
  }

  const ownedCount = PERKS.filter((p) => hasPerk(owned, p.id)).length;

  return (
    <>
      <section className="pk-hero">
        <div className="pk-hero-glow" aria-hidden="true" />
        <p className="pk-eyebrow">Perks Shop</p>
        <h1 className="pk-title">Make your account yours</h1>
        <p className="pk-sub">
          Small upgrades you buy once and keep forever. No subscription, no renewals.
        </p>
        <div className="pk-chips">
          <span className="pk-chip">One-time payments</span>
          <span className="pk-chip">Yours forever</span>
          {PERKS_FREE_WHILE_TESTING && (
            <span className="pk-chip pk-chip-test">Free while we test</span>
          )}
          {user && (
            <span className="pk-chip pk-chip-own">
              You own {ownedCount} of {PERKS.length}
            </span>
          )}
        </div>
      </section>

      <section className="pk-grid" aria-label="Perks">
        {PERKS.map((perk) => {
          const isOwned = hasPerk(owned, perk.id);
          return (
            <button
              key={perk.id}
              type="button"
              className={`pk-card${perk.flagship || perk.wide ? " pk-card-flagship" : ""}${perk.wide ? " pk-card-wide" : ""}${isOwned ? " is-owned" : ""}`}
              style={{ "--a": perk.a, "--b": perk.b }}
              onClick={() => setOpenId(perk.id)}
              aria-haspopup="dialog"
            >
              <Banner perk={perk} />
              {perk.flagship && <span className="pk-best">Most popular</span>}
              {isOwned && (
                <span className="pk-owned-badge"><Icon name="check" /> Owned</span>
              )}
              <span className="pk-card-body">
                <span className="pk-card-row">
                  <span className="pk-card-title">{perk.name}</span>
                  <span className="pk-card-price">{money(perk.price)}</span>
                </span>
                <span className="pk-card-desc">{perk.tagline}</span>
                <span className="pk-card-more">
                  {isOwned ? "See details" : "Read more"} <i aria-hidden="true">→</i>
                </span>
              </span>
            </button>
          );
        })}
      </section>
      <PriceNote />

      <section className="pk-how" aria-label="How perks work">
        <div>
          <b>Pay once</b>
          <span>Every perk is a single one-time payment.</span>
        </div>
        <div>
          <b>Keep it forever</b>
          <span>No renewals. Perks stay on your account.</span>
        </div>
        <div>
          <b>Stack them</b>
          <span>Own as many as you like. They work with any plan.</span>
        </div>
      </section>

      <p className="pk-plans-link">
        Looking for monthly plans with bigger limits and badges?{" "}
        <Link href="/upgrade">Compare plans</Link>
      </p>

      {open && (
        <PerkSheet
          perk={open}
          owned={hasPerk(owned, open.id)}
          busy={busy === open.id}
          user={user}
          onBuy={() => buy(open)}
          onClose={() => setOpenId(null)}
        />
      )}

      <Toast toast={toast} onClose={hide} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
