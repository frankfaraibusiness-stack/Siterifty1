"use client";

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
  const screenRef = useRef(null);
  const closeTimer = useRef(null);
  const [googleState, setGoogleState] = useState(GOOGLE_CLIENT_ID ? "loading" : "off");

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

  function passed(kind) {
    setDone(kind);
    setTimeout(() => window.location.reload(), kind === "signup" ? 1500 : 1300);
  }

  async function handleGoogleCredential(response) {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Google sign-in failed. Try again.");
        setLoading(false);
        return;
      }
      passed("login");
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  // Draw Google's own button whenever the log in / sign up view is showing
  // (it isn't needed on the forgot-password view).
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
        const width = Math.max(200, Math.min(400, Math.floor(googleBox.current.clientWidth) || 340));
        googleBox.current.innerHTML = "";
        google.accounts.id.renderButton(googleBox.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: view === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "left",
          width,
        });
        setGoogleState("ready");
      })
      .catch(() => !cancelled && setGoogleState("error"));
    return () => {
      cancelled = true;
    };
  }, [view]);

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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create your account.");
        return;
      }
      passed("signup");
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
      passed("login");
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
  ];
  const doneCount = objectives.filter((o) => o.ok).length;
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
            width="360"
            height="240"
            decoding="async"
          />
          <span className="brand-word" aria-hidden="true">
            FANBASE<em>.COM</em>
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
              <div className={`auth-mission${doneCount === 3 ? " full" : ""}`} key="mission">
                <div className="auth-mission-head">
                  <span>{doneCount === 3 ? "Ready to roll" : "Setting up your player"}</span>
                  <b>{doneCount}/3</b>
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

                {googleState !== "off" && (
                  <>
                    <div className="auth-google">
                      <div ref={googleBox} className="auth-google-box" />
                      {googleState === "loading" && (
                        <div className="auth-google-skeleton" aria-hidden="true" />
                      )}
                      {googleState === "error" && (
                        <div className="auth-google-error">
                          Google sign-in couldn&apos;t load. Check your connection.
                        </div>
                      )}
                    </div>
                    <div className="auth-divider">
                      <span>or use email</span>
                    </div>
                  </>
                )}

                <form className="auth-form" onSubmit={isLogin ? handleLogin : handleSignup}>
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

                  <button className="auth-submit-btn" type="submit" disabled={loading || !!done}>
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
      {done && (
        <div className="auth-passed" role="status">
          <div className="auth-passed-card">
            <span className="auth-passed-ring">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2>{done === "signup" ? "Welcome to Leonida" : "Welcome back"}</h2>
            <p>{done === "signup" ? "Your account is ready." : "Taking you in..."}</p>
            <span className="auth-passed-bar">
              <i />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
