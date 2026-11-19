"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Skyline } from "@/components/AuthArt";
import Money from "@/components/Money";
import { PLANS } from "@/lib/plans";
import OIcon from "./Icons";
import {
  FEATURES,
  FIRST_MOVES,
  FORMATS,
  GLANCE,
  PILLARS,
  QUICK_ANSWERS,
  STEPS,
  YOURS,
} from "./content";

// The 3-step welcome tour (/welcome). One screen, three steps, Back and Next
// only: there is no skip and no close button. Finishing step three tells the
// server (POST /api/onboarding) and sends the member to the home feed.
// The words are in ./content.js, the look is in app/welcome/welcome.css.

const STORE_KEY = "gfb_onboarding_step";
const LAST = STEPS.length - 1;

// ---------------------------------------------------------------- pieces

// One-open-at-a-time list of questions / topics. Panels animate open with the
// grid-rows trick and are `inert` while shut, so Tab never lands inside them.
function Accordion({ items, initial = 0, className = "" }) {
  const base = useId();
  const [open, setOpen] = useState(initial);
  return (
    <div className={`ob-acc ${className}`}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.key} className={`ob-acc-item${isOpen ? " open" : ""}${it.tone ? ` ob-t-${it.tone}` : ""}`}>
            <h3 className="ob-acc-h">
              <button
                type="button"
                className="ob-acc-btn"
                aria-expanded={isOpen}
                aria-controls={`${base}-p${i}`}
                id={`${base}-b${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                {it.icon && (
                  <span className="ob-ico ob-ico-sm">
                    <OIcon name={it.icon} />
                  </span>
                )}
                <span className="ob-acc-title">{it.title}</span>
                <OIcon name="chevron" className="ob-acc-chev" />
              </button>
            </h3>
            <div
              className="ob-acc-panel"
              id={`${base}-p${i}`}
              role="region"
              aria-labelledby={`${base}-b${i}`}
              inert={!isOpen}
            >
              <div className="ob-acc-in">
                <div className="ob-acc-body">{it.body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanStrip() {
  return (
    <ul className="ob-plans" aria-label="Plans">
      {PLANS.map((p) => (
        <li key={p.id} className="ob-plan" style={{ "--a": p.a, "--b": p.b }}>
          <b>{p.short}</b>
          <span>{p.price === 0 ? "Free forever" : <><Money usd={p.price} />/mo</>}</span>
        </li>
      ))}
    </ul>
  );
}

// Heading block shared by the three steps. The h1 takes focus when the step
// changes, so screen readers announce where they are.
function Head({ kicker, children, lead, titleRef, logo }) {
  return (
    <header className="ob-head">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ob-head-logo" src="/logo.webp" alt="" width="540" height="300" decoding="async" />
      )}
      <div className="ob-head-text">
        <p className="ob-kicker ob-rise" style={{ "--i": 0 }}>
          {kicker}
        </p>
        <h1 className="ob-title ob-rise" style={{ "--i": 1 }} tabIndex={-1} ref={titleRef}>
          {children}
        </h1>
        <p className="ob-lead ob-rise" style={{ "--i": 2 }}>
          {lead}
        </p>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- step 1

function StepWelcome({ name, titleRef }) {
  return (
    <>
      <Head
        kicker="Step 1 of 3 · The big picture"
        lead="GTAFanbase is the social media for GTA fans. Share what you love, talk it through with people who get it, and meet your crew for GTA 6, all in one neon-lit place."
        titleRef={titleRef}
      >
        <span>You’re in, </span>
        <span className="ob-grad ob-name">{name}</span>
        <span>.</span>{" "}
        <span className="ob-title-2">Welcome to Leonida.</span>
      </Head>

      <div className="ob-banner ob-rise" style={{ "--i": 3 }}>
        <span className="ob-banner-glow" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner.webp"
          alt="GTAFanbase.com: the social media for GTA fans"
          width="1660"
          height="513"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      <ul className="ob-glance ob-rise" style={{ "--i": 4 }} aria-label="At a glance">
        {GLANCE.map((g) => (
          <li key={g.label}>
            <b>{g.value}</b>
            <span>{g.label}</span>
            <small>{g.hint}</small>
          </li>
        ))}
      </ul>

      <div className="ob-split">
        <ul className="ob-pillars">
          {PILLARS.map((p, i) => (
            <li key={p.title} className={`ob-pillar ob-t-${p.tone} ob-rise`} style={{ "--i": 5 + i }}>
              <span className="ob-ico">
                <OIcon name={p.icon} />
              </span>
              <div>
                <h2>{p.title}</h2>
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <section className="ob-block ob-rise" style={{ "--i": 6 }} aria-labelledby="ob-qa">
          <h2 className="ob-block-title" id="ob-qa">
            Quick answers
          </h2>
          <Accordion
            initial={0}
            items={QUICK_ANSWERS.map((q) => ({ key: q.q, title: q.q, body: <p>{q.a}</p> }))}
          />
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- step 2

function StepExplore({ titleRef }) {
  const [id, setId] = useState(FEATURES[0].id);
  const [seen, setSeen] = useState(() => new Set([FEATURES[0].id]));
  const tabs = useRef({});
  const moved = useRef(false);
  const feat = FEATURES.find((f) => f.id === id) || FEATURES[0];
  const idx = FEATURES.indexOf(feat);

  const pick = useCallback((nextId, focus = false) => {
    moved.current = true;
    setId(nextId);
    setSeen((s) => (s.has(nextId) ? s : new Set(s).add(nextId)));
    if (focus) tabs.current[nextId]?.focus();
  }, []);

  // On a phone the tabs are a sideways strip: keep the chosen one in view.
  useEffect(() => {
    if (!moved.current) return;
    tabs.current[id]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [id]);

  function onKeyDown(e) {
    const last = FEATURES.length - 1;
    let n = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = idx >= last ? 0 : idx + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = idx <= 0 ? last : idx - 1;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = last;
    if (n === null) return;
    e.preventDefault();
    pick(FEATURES[n].id, true);
  }

  return (
    <>
      <Head
        kicker="Step 2 of 3 · Explore the city"
        lead="Seven places, one account. Tap each one to see what it does and where to find it. You can open them all from the bar at the top once you are in."
        titleRef={titleRef}
        logo
      >
        Everything lives in <span className="ob-grad">one city.</span>
      </Head>

      <div className="ob-explore ob-rise" style={{ "--i": 3 }}>
        <div
          className="ob-tabs"
          role="tablist"
          aria-label="Parts of GTAFanbase"
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
        >
          {FEATURES.map((f) => {
            const on = f.id === id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                id={`ob-tab-${f.id}`}
                aria-selected={on}
                aria-controls="ob-detail"
                tabIndex={on ? 0 : -1}
                ref={(el) => {
                  tabs.current[f.id] = el;
                }}
                className={`ob-tab ob-t-${f.tone}${on ? " on" : ""}${seen.has(f.id) && !on ? " seen" : ""}`}
                onClick={() => pick(f.id)}
              >
                <span className="ob-ico ob-ico-sm">
                  <OIcon name={f.icon} />
                </span>
                <span className="ob-tab-txt">
                  <b>{f.title}</b>
                  <small>{f.tag}</small>
                </span>
              </button>
            );
          })}
        </div>

        <article
          className={`ob-detail ob-t-${feat.tone}`}
          id="ob-detail"
          role="tabpanel"
          aria-labelledby={`ob-tab-${feat.id}`}
          key={feat.id}
        >
          <div className="ob-detail-top">
            <span className="ob-ico ob-ico-lg">
              <OIcon name={feat.icon} />
            </span>
            <div>
              <span className="ob-tag">{feat.tag}</span>
              <h2 className="ob-detail-title">{feat.title}</h2>
            </div>
          </div>
          <p className="ob-detail-headline">{feat.headline}</p>
          <p className="ob-detail-text">{feat.text}</p>

          {feat.id === "feed" && (
            <ul className="ob-formats" aria-label="Post formats">
              {FORMATS.map((f) => (
                <li key={f.label}>
                  <OIcon name={f.icon} />
                  {f.label}
                </li>
              ))}
            </ul>
          )}

          <ul className="ob-points">
            {feat.points.map((p) => (
              <li key={p}>
                <span className="ob-tick">
                  <OIcon name="check" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <p className="ob-where">
            <OIcon name="pin" />
            <span>
              <small>Find it</small> {feat.where}
            </span>
          </p>
        </article>
      </div>

      <p className="ob-count ob-rise" style={{ "--i": 4 }} aria-live="polite">
        Looked at <b>{seen.size}</b> of {FEATURES.length}
      </p>
    </>
  );
}

// ---------------------------------------------------------------- step 3

function StepYours({ titleRef, agreed, onAgree, nudge }) {
  return (
    <>
      <Head
        kicker="Step 3 of 3 · Make it yours"
        lead="Your account, your rules. Here is how to set the site up the way you like it, how spoilers and safety work, and what to do first so your feed is never empty."
        titleRef={titleRef}
        logo
      >
        Almost there. <span className="ob-grad">Own your city.</span>
      </Head>

      <div className="ob-split">
        <section className="ob-block ob-rise" style={{ "--i": 3 }} aria-labelledby="ob-first">
          <h2 className="ob-block-title" id="ob-first">
            Your first five minutes
          </h2>
          <ol className="ob-moves">
            {FIRST_MOVES.map((m, i) => (
              <li key={m.title} className={`ob-move ob-t-${m.tone}`}>
                <span className="ob-move-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="ob-ico ob-ico-sm">
                  <OIcon name={m.icon} />
                </span>
                <div>
                  <b>{m.title}</b>
                  <p>{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ob-block ob-rise" style={{ "--i": 4 }} aria-labelledby="ob-know">
          <h2 className="ob-block-title" id="ob-know">
            Good to know
          </h2>
          <Accordion
            initial={0}
            items={YOURS.map((y) => ({
              key: y.id,
              title: y.title,
              icon: y.icon,
              tone: y.tone,
              body: (
                <>
                  <p>{y.text}</p>
                  {y.plans && <PlanStrip />}
                  {y.link && (
                    <a className="ob-link" href={y.link.href} target="_blank" rel="noopener">
                      {y.link.label}
                    </a>
                  )}
                </>
              ),
            }))}
          />
        </section>
      </div>

      <p className="ob-ready ob-rise" style={{ "--i": 5 }}>
        <OIcon name="spark" />
        That is the whole tour. Tick the box below, then tap <b>Enter Leonida</b>.
      </p>

      <label className={`ob-agree ob-rise${agreed ? " on" : ""}${nudge ? " nudge" : ""}`} style={{ "--i": 6 }} key={nudge}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
          aria-describedby="ob-agree-txt"
        />
        <span className="ob-agree-box" aria-hidden="true">
          <OIcon name="check" />
        </span>
        <span className="ob-agree-txt" id="ob-agree-txt">
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener">
            Privacy Policy
          </a>
          , and I will keep it GTA 6 and be good to the community.
        </span>
      </label>
    </>
  );
}

// ---------------------------------------------------------------- the screen

export default function Onboarding({ name }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState("none"); // which way the step slides in
  const [finishing, setFinishing] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(0); // bumps to shake the Terms box when Enter is tapped without it
  const stageRef = useRef(null);
  const titleRef = useRef(null);
  const first = useRef(true);

  // The tour owns the screen: hide the floating bubble, switch off shortcuts.
  useEffect(() => {
    document.documentElement.dataset.onboarding = "1";
    return () => {
      delete document.documentElement.dataset.onboarding;
    };
  }, []);

  // A refresh keeps your place.
  useEffect(() => {
    let n = 0;
    try {
      n = Number(sessionStorage.getItem(STORE_KEY));
    } catch {}
    if (!Number.isInteger(n) || n <= 0 || n > LAST) return undefined;
    const t = setTimeout(() => setStep(n), 0);
    return () => clearTimeout(t);
  }, []);

  // Each step starts at the top, and its heading gets focus.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, String(step));
    } catch {}
    if (first.current) {
      first.current = false;
      return;
    }
    stageRef.current?.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const go = useCallback((to) => {
    setError("");
    setDir(to > step ? "fwd" : "back");
    setStep(to);
  }, [step]);

  // Arrow keys (when nothing that uses them is focused) and a sideways swipe
  // on the page both do the same as Back / Next. The last step is never
  // finished by accident: only the Enter Leonida button does that.
  const busy = finishing || launched;
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || busy) return;
      if (e.target?.closest?.('[role="tablist"], input, textarea, select')) return;
      if (e.key === "ArrowRight" && step < LAST) go(step + 1);
      else if (e.key === "ArrowLeft" && step > 0) go(step - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, busy]);

  const touch = useRef(null);
  function onTouchStart(e) {
    // the feature strip scrolls sideways by hand, so a swipe there is not a step change
    if (e.touches.length !== 1 || e.target.closest?.('[role="tablist"]')) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e) {
    const t = touch.current;
    touch.current = null;
    if (!t || busy) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.5) return;
    if (dx < 0 && step < LAST) go(step + 1);
    else if (dx > 0 && step > 0) go(step - 1);
  }

  async function finish() {
    if (finishing) return;
    if (!agreed) {
      setError("Please tick the box to agree to the Terms and Privacy Policy.");
      setNudge((n) => n + 1);
      return;
    }
    setFinishing(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptTerms: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn’t finish just now. Please try again.");
      }
      try {
        sessionStorage.removeItem(STORE_KEY);
      } catch {}
      setLaunched(true);
      setTimeout(() => window.location.assign("/"), 1300);
    } catch (e) {
      setError(e?.message || "Couldn’t finish just now. Please try again.");
      setFinishing(false);
    }
  }

  const isLast = step === LAST;
  const view = [
    <StepWelcome key="s0" name={name} titleRef={titleRef} />,
    <StepExplore key="s1" titleRef={titleRef} />,
    <StepYours
      key="s2"
      titleRef={titleRef}
      agreed={agreed}
      nudge={nudge}
      onAgree={(v) => {
        setAgreed(v);
        if (v) setError("");
      }}
    />,
  ][step];

  return (
    <div className="ob" data-step={step}>
      {/* ---------- backdrop: dusk over Leonida ---------- */}
      <div className="ob-bg" aria-hidden="true">
        <i className="ob-stars" />
        <i className="ob-sun" />
        <Skyline />
      </div>

      {/* ---------- top bar: logo + progress ---------- */}
      <header className="ob-top">
        <div className="brand ob-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/logo.webp" alt="" width="540" height="300" decoding="async" />
          <span className="brand-word" aria-hidden="true">
            GTAFANBASE<em>.COM</em>
          </span>
        </div>

        <ol className="ob-steps" aria-label="Welcome tour progress">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={i === step ? "on" : i < step ? "done" : ""}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="ob-node">{i < step ? <OIcon name="check" /> : i + 1}</span>
              <span className="ob-steplabel">{s.label}</span>
            </li>
          ))}
        </ol>

        <span className="ob-bar" aria-hidden="true">
          <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </span>
      </header>

      <p className="ob-sr" aria-live="polite">
        Step {step + 1} of {STEPS.length}: {STEPS[step].label}
      </p>

      {/* ---------- the step ---------- */}
      <main className="ob-stage" ref={stageRef} id="main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <section className={`ob-step ob-in-${dir}`} key={step} aria-label={STEPS[step].label}>
          {view}
        </section>
      </main>

      {/* ---------- bottom dock: Back and Next, always in reach ---------- */}
      <footer className="ob-dock">
        <div className="ob-dock-in">
          <button
            type="button"
            className="ob-btn ob-btn-back"
            onClick={() => go(step - 1)}
            disabled={step === 0 || finishing}
            aria-hidden={step === 0}
            tabIndex={step === 0 ? -1 : 0}
          >
            <OIcon name="arrowLeft" />
            <span>Back</span>
          </button>

          <p className="ob-dock-mid" aria-hidden="true">
            {error ? (
              <span className="ob-error">{error}</span>
            ) : (
              <>
                <b>{step + 1}</b> / {STEPS.length}
              </>
            )}
          </p>

          {isLast ? (
            <button
              type="button"
              className={`ob-btn ob-btn-go${agreed ? "" : " is-locked"}`}
              onClick={finish}
              disabled={finishing}
              aria-disabled={!agreed}
            >
              {finishing && <span className="ob-spin" aria-hidden="true" />}
              <span>{finishing ? "Opening the city..." : "Enter Leonida"}</span>
              {!finishing && <OIcon name="spark" />}
            </button>
          ) : (
            <button type="button" className="ob-btn ob-btn-next" onClick={() => go(step + 1)}>
              <span>Next</span>
              <OIcon name="arrowRight" />
            </button>
          )}
        </div>
        {error && (
          <p className="ob-error ob-error-m" role="alert">
            {error}
          </p>
        )}
      </footer>

      {/* ---------- the moment before the feed ---------- */}
      {launched && (
        <div className="ob-launch" role="status">
          <span className="ob-sparks" aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ "--a": `${i * 25.7}deg`, "--d": `${0.05 + (i % 5) * 0.06}s` }} />
            ))}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" width="540" height="300" />
          <h2>Welcome to Leonida</h2>
          <p>Taking you to your feed...</p>
          <span className="ob-launch-bar">
            <i />
          </span>
        </div>
      )}
    </div>
  );
}
