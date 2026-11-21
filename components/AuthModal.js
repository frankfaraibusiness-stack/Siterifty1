"use client";

import CharacterPicker from "./CharacterPicker";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowLeftIcon,
  XIcon,
} from "./icons";
import { Skyline, Glyph } from "./AuthArt";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const CLOSE_MS = 200;
const RANK = { login: 0, signup: 1, forgot: 2 };

// Loads Google Identity Services once and resolves with window.google.
function loadGoogle() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    let tag = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (!tag) {
      tag = document.createElement("script");
      tag.src = GSI_SRC;
      tag.async = true;
      document.head.appendChild(tag);
    }
    tag.addEventListener("load", () => resolve(window.google));
    tag.addEventListener("error", () => reject(new Error("Couldn’t load Google.")));
  });
}

// Google's own four-colour "G" (their brand rules keep it as is).
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// 0-5: how strong the password is.
function passwordScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s += 1;
  if (pw.length >= 10) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return s;
}
const STRENGTH_LABEL = ["Not set", "Weak", "Okay", "Good", "Strong", "Maxed out"];

const HERO = {
  login: {
    lines: ["Leonida is", "calling you back."],
    sub: "New leaks, theories and clips dropped while you were away.",
  },
  signup: {
    lines: ["Start your", "Leonida story."],
    sub: "Free to join. Pick a name, lock it down and you’re in.",
  },
  forgot: {
    lines: ["Locked out?", "We’ve got you."],
    sub: "Enter your email and we’ll send you a way back in.",
  },
};

const PERKS = [
  { glyph: "feed", title: "The live feed", text: "Leaks, theories and clips as they land." },
  { glyph: "crew", title: "Your communities", text: "Find the crew that talks GTA 6 like you do." },
  { glyph: "star", title: "Your own profile", text: "Pick a look and make it yours." },
];

// Grid-rows trick: lets a block animate open and shut without knowing its height.
function Collapse({ open, className = "", children }) {
  return (
    <div className={`auth-collapse ${className}${open ? " open" : ""}`} aria-hidden={!open}>
      <div className="auth-collapse-in">
        <div className="auth-collapse-pad">{children}</div>
      </div>
    </div>
  );
}

function Stars({ score }) {
  return (
    <span className="auth-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={n <= score ? "on" : ""}>
          <path d="M12 3l2.6 6 6.4.6-4.8 4.2 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.6 9.4 9z" />
        </svg>
      ))}
    </span>
  );
}

// "login" | "signup" | "forgot"
export default function AuthModal({ onClose, initialView = "login" }) {
  const [view, setView] = useState(initialView);
  const [dir, setDir] = useState("fwd"); // which way the heading slides (log in <-> sign up)
  const [paneDir, setPaneDir] = useState("none"); // which way the whole form slides (to / from forgot)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [done, setDone] = useState(null); // null | "login" | "signup"
  const [closing, setClosing] = useState(false);
  const googleBox = useRef(null);
  const googleWrap = useRef(null);
  const screenRef = useRef(null);
  const closeTimer = useRef(null);
  const [googleState, setGoogleState] = useState(GOOGLE_CLIENT_ID ? "loading" : "off");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMsg, setGoogleMsg] = useState(""); // shown right under the Google button
  const [googleTry, setGoogleTry] = useState(0); // bump to try loading Google again
  const [character, setCharacter] = useState(""); // "lucia" | "jason" (required to create an account)
  const [gate, setGate] = useState(null); // a new Google account waiting for its character: { credential, pick }

  useScrollLock(true);

  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => onClose(), CLOSE_MS);
  }, [onClose]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Escape closes; Tab stays inside the screen.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !screenRef.current) return;
      const items = [
        ...screenRef.current.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => !el.closest(".auth-collapse:not(.open)") && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  // Focus: first field on desktop (no keyboard pop-up on phones), and hand
  // focus back to whatever opened the screen when it closes.
  useEffect(() => {
    const prev = document.activeElement;
    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    const t = setTimeout(() => {
      const el = fine
        ? screenRef.current?.querySelector(".auth-input:not(:disabled)")
        : screenRef.current;
      el?.focus({ preventScroll: true });
    }, 420);
    return () => {
      clearTimeout(t);
      prev?.focus?.();
    };
  }, []);

  // `welcome` = this account still has the 3-step welcome tour to do, so it
  // goes straight to /welcome instead of reloading the page it was on.
  function passed(kind, welcome = false) {
    setDone(welcome ? "signup" : kind);
    setTimeout(() => {
      if (welcome) window.location.assign("/welcome");
      else window.location.reload();
    }, kind === "signup" || welcome ? 1500 : 1300);
  }

  async function handleGoogleCredential(response) {
    setError("");
    setSuccess("");
    setGoogleMsg("");
    setLoading(true);
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, ...(view === "signup" && character ? { character } : null) }),
      });
      const data = await res.json().catch(() => ({}));
      // A brand-new Google account has to pick Lucia or Jason before it exists.
      if (res.ok && data.needsCharacter) {
        setGate({ credential: response.credential, pick: character || "" });
        setLoading(false);
        setGoogleBusy(false);
        return;
      }
      if (!res.ok) {
        setGoogleMsg(data.error || "Google sign-in failed. Try again.");
        setLoading(false);
        setGoogleBusy(false);
        return;
      }
      passed("login", !!data.onboarding);
    } catch {
      setGoogleMsg("Network error. Try again.");
      setLoading(false);
      setGoogleBusy(false);
    }
  }

  // New Google account, character picked in the "one last thing" step: send the same credential again with the pick.
  async function submitGate() {
    if (!gate?.pick || loading) return;
    setGoogleMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: gate.credential, character: gate.pick }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setGoogleMsg(data.error || "Google sign-in failed. Try again.");
        setGate(null);
        setLoading(false);
        return;
      }
      setGate(null);
      passed("login", !!data.onboarding);
    } catch {
      setGoogleMsg("Network error. Try again.");
      setLoading(false);
    }
  }

  // Tapping our themed button when Google isn't ready: say why, or try again.
  function googleFallback() {
    if (googleState === "off") {
      setGoogleMsg("Google sign-in isn’t switched on for this site yet.");
      return;
    }
    setGoogleMsg("");
    setGoogleState("loading");
    setGoogleTry((n) => n + 1);
  }

  // Google's own button is drawn invisibly on top of our themed one (below), so
  // a tap still goes through Google's real, secure sign-in while the look is
  // ours. It is only needed while the log in / sign up view is showing.
  const handlerRef = useRef(handleGoogleCredential);
  handlerRef.current = handleGoogleCredential;
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || view === "forgot") return undefined;
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !googleBox.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => handlerRef.current(r),
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        const width = Math.max(200, Math.min(400, Math.floor(googleWrap.current?.clientWidth || googleBox.current.clientWidth) || 340));
        googleBox.current.innerHTML = "";
        google.accounts.id.renderButton(googleBox.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width,
        });
        setGoogleState("ready");
      })
      .catch(() => !cancelled && setGoogleState("error"));
    return () => {
      cancelled = true;
    };
  }, [view === "forgot", googleTry]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchView(next) {
    if (next === view) return;
    setDir(RANK[next] > RANK[view] ? "fwd" : "back");
    if (next === "forgot" || view === "forgot") setPaneDir(next === "forgot" ? "fwd" : "back");
    setView(next);
    setError("");
    setSuccess("");
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!character) {
      setError("Pick your character, Lucia or Jason, to create your account.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, character }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create your account.");
        return;
      }
      passed("signup", true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't sign you in.");
        return;
      }
      passed("login", !!data.onboarding);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't process that request.");
        return;
      }
      setSuccess(
        "If that email has an account, a reset link has been generated. You'll receive it shortly."
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = view === "login";
  const isSignup = view === "signup";
  const hero = HERO[view];

  // Sign-up progress: three small objectives that tick off as the fields are valid.
  const objectives = [
    { label: "Pick your name", ok: /^[a-zA-Z0-9_.]{3,20}$/.test(username) },
    { label: "Add your email", ok: /^\S+@\S+\.\S+$/.test(email) },
    { label: "Lock it down", ok: password.length >= 6 },
    { label: "Choose your character", ok: !!character },
  ];
  const doneCount = objectives.filter((o) => o.ok).length;
  const allDone = doneCount === objectives.length;
  const pct = Math.round((doneCount / objectives.length) * 100);
  const score = passwordScore(password);

  const submitLabel = loading
    ? isLogin
      ? "Signing in..."
      : "Creating account..."
    : isLogin
    ? "Log in"
    : "Create account";

  return (
    <div
      ref={screenRef}
      className={`auth-screen${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      tabIndex={-1}
    >
      {/* ---------- sticky header ---------- */}
      <header className="auth-top">
        <div className="brand auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand-logo"
            src="/logo.webp"
            alt=""
            width="540"
            height="300"
            decoding="async"
          />
          <span className="brand-word" aria-hidden="true">
            GTAFANBASE<em>.COM</em>
          </span>
        </div>
        <div className="auth-top-right">
          <span className="auth-esc" aria-hidden="true">
            Esc
          </span>
          <button type="button" className="auth-x" onClick={requestClose} aria-label="Close">
            <XIcon />
            <span>Close</span>
          </button>
        </div>
      </header>

      <div className="auth-body">
        {/* ---------- left: the world ---------- */}
        <aside className="auth-hero">
          <div className="auth-hero-bg" aria-hidden="true">
            <i className="auth-hero-stars" />
            <i className="auth-sun" />
            <i className="auth-floor" />
            <Skyline />
          </div>

          <div className="auth-hero-in">
            <h2 className="auth-hero-title" key={`t-${view}`}>
              <span>{hero.lines[0]}</span>
              <span className="auth-grad">{hero.lines[1]}</span>
            </h2>
            <p className="auth-hero-sub" key={`s-${view}`}>
              {hero.sub}
            </p>

            {isLogin && (
              <ul className="auth-perks" key="perks">
                {PERKS.map((p, i) => (
                  <li className="auth-perk" key={p.title} style={{ "--i": i }}>
                    <span className="auth-perk-ico">
                      <Glyph name={p.glyph} />
                    </span>
                    <span className="auth-perk-txt">
                      <b>{p.title}</b>
                      <span>{p.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {isSignup && (
              <div className={`auth-mission${allDone ? " full" : ""}`} key="mission">
                <div className="auth-mission-head">
                  <span>{allDone ? "Ready to roll" : "Setting up your player"}</span>
                  <b>{doneCount}/{objectives.length}</b>
                </div>
                <div className="auth-xp" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                  <i style={{ width: `${pct}%` }} />
                </div>
                <ul className="auth-objs">
                  {objectives.map((o) => (
                    <li key={o.label} className={o.ok ? "ok" : ""}>
                      <span className="auth-tick">
                        <Glyph name="check" />
                      </span>
                      {o.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {view === "forgot" && (
              <div className="auth-perks" key="forgot-card">
                <div className="auth-perk" style={{ "--i": 0 }}>
                  <span className="auth-perk-ico">
                    <Glyph name="mail" />
                  </span>
                  <span className="auth-perk-txt">
                    <b>One email, one link</b>
                    <span>Open it, choose a new password, and log back in.</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ---------- right: the form ---------- */}
        <main className="auth-panel">
          <div className="auth-panel-in">
            {view !== "forgot" ? (
              <div className={`auth-pane auth-dir-${paneDir}`} key="main">
                <div className="auth-seg" role="tablist" aria-label="Log in or sign up">
                  <i className="auth-seg-thumb" style={{ transform: isSignup ? "translateX(100%)" : "none" }} />
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isLogin}
                    className={isLogin ? "on" : ""}
                    onClick={() => switchView("login")}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSignup}
                    className={isSignup ? "on" : ""}
                    onClick={() => switchView("signup")}
                  >
                    Sign up
                  </button>
                </div>

                <div className={`auth-head auth-dir-${dir}`} key={`h-${view}`}>
                  <h1 className="auth-title" id="auth-title">
                    {isLogin ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="auth-subtitle">
                    {isLogin
                      ? "Sign in to keep up with the crew."
                      : "Join the feed and start posting from the streets of Leonida."}
                  </p>
                </div>

                <Collapse open={isSignup} className="auth-mobile-only pb16">
                  <div className="auth-xp auth-xp-mobile" aria-hidden="true">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </Collapse>

                <div className={`auth-google${googleBusy ? " is-busy" : ""}${loading && !googleBusy ? " is-locked" : ""}`} ref={googleWrap}>
                  {googleState === "ready" ? (
                    <div className="auth-gbtn" aria-hidden="true">
                      <span className="auth-gbtn-g"><GoogleG /></span>
                      <span className="auth-gbtn-label">{googleBusy ? "Signing you in…" : "Continue with Google"}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`auth-gbtn is-button${googleState === "loading" ? " is-loading" : ""}`}
                      onClick={googleFallback}
                      disabled={googleState === "loading" || loading}
                    >
                      <span className="auth-gbtn-g"><GoogleG /></span>
                      <span className="auth-gbtn-label">Continue with Google</span>
                    </button>
                  )}
                  {/* Google's real button: invisible, stretched over ours once it is ready. */}
                  {GOOGLE_CLIENT_ID && <div className={`auth-ghit${googleState === "ready" ? "" : " is-off"}`} ref={googleBox} />}
                  {googleState === "error" && !googleMsg && (
                    <p className="auth-google-error" role="status">
                      Couldn’t reach Google. Tap the button to try again.
                    </p>
                  )}
                  {googleMsg && (
                    <p className="auth-google-error is-bad" role="alert" key={googleMsg}>
                      {googleMsg}
                    </p>
                  )}
                </div>
                <div className="auth-divider">
                  <span>or use email</span>
                </div>

                <form className="auth-form" onSubmit={isLogin ? handleLogin : handleSignup}>
                  <Collapse open={isSignup} className="pb14">
                    <div className="auth-field-flat chp-field">
                      <span className="auth-label" id="auth-character-label">
                        Choose your character <em className="chp-req">required</em>
                      </span>
                      <CharacterPicker value={character} onChange={setCharacter} disabled={!isSignup} tabbable={isSignup} />
                    </div>
                  </Collapse>

                  <Collapse open={isSignup} className="pb14">
                    <div className="auth-field-flat">
                      <label className="auth-label" htmlFor="auth-username">
                        Username
                      </label>
                      <div className="auth-input-wrap">
                        <UserIcon />
                        <input
                          id="auth-username"
                          className="auth-input"
                          type="text"
                          placeholder="tommy_v"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoComplete="username"
                          disabled={!isSignup}
                          required={isSignup}
                        />
                      </div>
                    </div>
                  </Collapse>

                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-email">
                      Email
                    </label>
                    <div className="auth-input-wrap">
                      <MailIcon />
                      <input
                        id="auth-email"
                        className="auth-input"
                        type="email"
                        placeholder="you@leonida.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field">
                    <div className="auth-label-row">
                      <label className="auth-label" htmlFor="auth-password">
                        Password
                      </label>
                      <button
                        type="button"
                        className="auth-forgot-link"
                        onClick={() => switchView("forgot")}
                        tabIndex={isLogin ? 0 : -1}
                        style={{ opacity: isLogin ? 1 : 0, pointerEvents: isLogin ? "auto" : "none" }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="auth-input-wrap">
                      <LockIcon />
                      <input
                        id="auth-password"
                        className="auth-input"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        minLength={6}
                        required
                        style={{ paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        className="auth-toggle-visibility"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    <Collapse open={isSignup} className="pt8">
                      <div className="auth-strength">
                        <Stars score={score} />
                        <span className={`auth-strength-label s${score}`}>{STRENGTH_LABEL[score]}</span>
                      </div>
                    </Collapse>
                  </div>

                  {error && (
                    <div className="auth-error" role="alert" key={error}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="auth-success" role="status">
                      {success}
                    </div>
                  )}

                  <button className="auth-submit-btn" type="submit" disabled={loading || !!done || (isSignup && !character)}>
                    {loading && <span className="auth-spinner" />}
                    <span className="auth-btn-label" key={submitLabel}>
                      {submitLabel}
                    </span>
                  </button>

                  <Collapse open={isSignup} className="pt12">
                    <p className="auth-terms">
                      By creating an account you agree to our{" "}
                      <a href="/terms" target="_blank" rel="noopener" tabIndex={isSignup ? 0 : -1}>
                        Terms &amp; Conditions
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" target="_blank" rel="noopener" tabIndex={isSignup ? 0 : -1}>
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </Collapse>
                </form>

                <div className="auth-footnote">
                  {isLogin ? (
                    <>
                      New to Leonida?{" "}
                      <button type="button" onClick={() => switchView("signup")}>
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button type="button" onClick={() => switchView("login")}>
                        Log in
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className={`auth-pane auth-dir-${paneDir}`} key="forgot">
                <button type="button" className="auth-back-row" onClick={() => switchView("login")}>
                  <ArrowLeftIcon />
                  Back to log in
                </button>

                <div className="auth-head">
                  <h1 className="auth-title" id="auth-title">
                    Forgot your password?
                  </h1>
                  <p className="auth-subtitle">
                    Enter the email on your account and we&apos;ll send a reset link your way.
                  </p>
                </div>

                <form className="auth-form" onSubmit={handleForgotPassword}>
                  <div className="auth-field">
                    <label className="auth-label" htmlFor="auth-forgot-email">
                      Email
                    </label>
                    <div className="auth-input-wrap">
                      <MailIcon />
                      <input
                        id="auth-forgot-email"
                        className="auth-input"
                        type="email"
                        placeholder="you@leonida.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="auth-error" role="alert" key={error}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="auth-success" role="status">
                      {success}
                    </div>
                  )}

                  <button className="auth-submit-btn" type="submit" disabled={loading}>
                    {loading && <span className="auth-spinner" />}
                    <span className="auth-btn-label">{loading ? "Sending..." : "Send reset link"}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ---------- success moment, right before the page reloads signed in ---------- */}
      {gate && !done && (
        <div className="auth-passed auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-gate-title">
          <div className="auth-passed-card auth-gate-card">
            <h2 id="auth-gate-title">One last thing</h2>
            <p>Pick your character to create your account. You can swap in your own photo any time.</p>
            <CharacterPicker value={gate.pick} onChange={(pick) => setGate((g) => ({ ...g, pick }))} disabled={loading} />
            <button type="button" className="auth-submit-btn" onClick={submitGate} disabled={!gate.pick || loading}>
              {loading && <span className="auth-spinner" />}
              <span className="auth-btn-label">{loading ? "Creating account..." : gate.pick ? "Continue as " + (gate.pick === "lucia" ? "Lucia" : "Jason") : "Pick a character"}</span>
            </button>
            <button type="button" className="auth-gate-back" onClick={() => setGate(null)} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="auth-passed" role="status">
          <div className="auth-passed-card">
            <span className="auth-passed-ring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2>{done === "signup" ? "Welcome to Leonida" : "Welcome back"}</h2>
            <p>{done === "signup" ? "Your account is ready. Let’s show you around." : "Taking you in..."}</p>
            <span className="auth-passed-bar">
              <i />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
