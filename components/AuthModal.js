"use client";

import { useEffect, useState } from "react";
import {
  UserIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowLeftIcon,
  XIcon,
} from "./icons";

// "login" | "signup" | "forgot"
export default function AuthModal({ onClose, initialView = "login" }) {
  const [view, setView] = useState(initialView);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchView(next) {
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
      setSuccess("Welcome to Leonida. Your account is ready.");
      setTimeout(() => {
        window.location.reload();
      }, 900);
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
      setSuccess("Signed in. Taking you in...");
      setTimeout(() => {
        window.location.reload();
      }, 700);
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

  return (
    <div
      className="auth-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="auth-modal">
        <div className="auth-modal-inner">
          <button className="auth-close-btn" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>

          {view !== "forgot" ? (
            <>
              <div className="auth-header">
                <div className="auth-kicker">Leonida Access</div>
                <h2 className="auth-title">
                  {view === "login" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="auth-subtitle">
                  {view === "login"
                    ? "Sign in to keep up with the crew."
                    : "Join the feed and start posting from the streets of Leonida."}
                </p>
              </div>

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab${view === "login" ? " active" : ""}`}
                  onClick={() => switchView("login")}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className={`auth-tab${view === "signup" ? " active" : ""}`}
                  onClick={() => switchView("signup")}
                >
                  Sign Up
                </button>
              </div>

              <form
                className="auth-form"
                onSubmit={view === "login" ? handleLogin : handleSignup}
              >
                {view === "signup" && (
                  <div className="auth-field">
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
                        required
                      />
                    </div>
                  </div>
                )}

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
                  <label className="auth-label" htmlFor="auth-password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <LockIcon />
                    <input
                      id="auth-password"
                      className="auth-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={
                        view === "login" ? "current-password" : "new-password"
                      }
                      minLength={6}
                      required
                      style={{ paddingRight: 40 }}
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
                </div>

                {view === "login" && (
                  <div className="auth-forgot-row">
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => switchView("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="auth-spinner" />}
                  {loading
                    ? view === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : view === "login"
                    ? "Log In"
                    : "Sign Up"}
                </button>
              </form>

              <div className="auth-footnote">
                {view === "login" ? (
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
            </>
          ) : (
            <>
              <button
                type="button"
                className="auth-back-row"
                onClick={() => switchView("login")}
              >
                <ArrowLeftIcon />
                Back to log in
              </button>

              <div className="auth-header">
                <div className="auth-kicker">Reset Access</div>
                <h2 className="auth-title">Forgot your password?</h2>
                <p className="auth-subtitle">
                  Enter the email on your account and we&apos;ll send a reset
                  link your way.
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

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <button className="auth-submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="auth-spinner" />}
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
