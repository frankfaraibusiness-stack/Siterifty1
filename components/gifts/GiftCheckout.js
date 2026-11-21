"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthModal from "../AuthModal";
import { GiftTile, RarityTag } from "./GiftCard";
import { RecipientAvatar, SendingTo } from "./Recipient";
import Stepper from "./Stepper";
import WalletCard from "./WalletCard";
import {
  NOTE_MAX,
  cleanContext,
  cleanHandleInput,
  contextBackHref,
  contextLabel,
  formatMills,
  formatPrice,
  getCategory,
  getGame,
  giftQuote,
  giftsHref,
} from "@/lib/gifts";

const JSON_HEADERS = { "Content-Type": "application/json" };
const SHOP_CTX = { type: "shop", postId: "", commentId: "", to: "" };

function newRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// The price breakdown. Every number here is also worked out on the server when
// the gift is sent; this is only what is shown.
function Receipt({ gift, quote, balance, signedIn, showBalance = true }) {
  const short = quote.total - balance;
  return (
    <dl className="gf-receipt">
      <div>
        <dt>{gift.name}</dt>
        <dd>{formatMills(quote.price)}</dd>
      </div>
      <div>
        <dt>Fixed fee</dt>
        <dd>{formatMills(quote.flat)}</dd>
      </div>
      <div>
        <dt>Tax (5% of gift price)</dt>
        <dd>{formatMills(quote.percent)}</dd>
      </div>
      <div className="gf-receipt-total">
        <dt>Total from your wallet</dt>
        <dd>{formatMills(quote.total)}</dd>
      </div>
      {showBalance && signedIn && (
        <>
          <div className="gf-receipt-soft">
            <dt>Your wallet now</dt>
            <dd>{formatMills(balance)}</dd>
          </div>
          <div className={`gf-receipt-soft${short > 0 ? " is-short" : ""}`}>
            <dt>{short > 0 ? "You still need" : "Wallet after sending"}</dt>
            <dd>{short > 0 ? formatMills(short) : formatMills(balance - quote.total)}</dd>
          </div>
        </>
      )}
    </dl>
  );
}

export default function GiftCheckout({
  gift,
  signedIn,
  balanceMills,
  initialReceiver,
  initialContext,
  problem: initialProblem,
}) {
  const quote = giftQuote(gift);
  const game = getGame(gift.game);

  const [ctx, setCtx] = useState(() => cleanContext(initialContext));
  const [receiver, setReceiver] = useState(initialProblem ? null : initialReceiver);
  const [step, setStep] = useState(2);
  const [balance, setBalance] = useState(balanceMills);
  const [note, setNote] = useState("");
  const [error, setError] = useState(initialProblem || "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  // Typed handle + what the server said about it.
  const [handle, setHandle] = useState("");
  const [lookup, setLookup] = useState({ state: "idle", message: "" });
  const requestId = useRef("");

  const fromContext = ctx.type !== "shop";
  const stepNumber = done ? 4 : step;
  const short = quote.total > balance;

  // Look the typed @handle up on the server (after a short pause), so people
  // see who they are about to gift before moving on.
  useEffect(() => {
    if (receiver || fromContext || !signedIn) return undefined;
    const clean = cleanHandleInput(handle);
    if (!handle.trim()) {
      setLookup({ state: "idle", message: "" });
      return undefined;
    }
    if (!clean) {
      setLookup({ state: "error", message: "Handles are 3 to 20 letters, numbers, dots or underscores." });
      return undefined;
    }
    setLookup({ state: "loading", message: "" });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/gifts?handle=${encodeURIComponent(clean)}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn’t look that up.");
        setLookup({ state: "found", message: "", person: data.recipient });
      } catch (err) {
        if (err.name === "AbortError") return;
        setLookup({ state: "error", message: err.message || "Couldn’t look that up." });
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [handle, receiver, fromContext, signedIn]);

  function chooseFound() {
    if (lookup.state !== "found") return;
    setReceiver(lookup.person);
    setCtx({ ...SHOP_CTX, to: lookup.person.username });
    setError("");
  }

  // "Change": a different person means the gift is no longer tied to the
  // comment / post / profile it started from.
  function changeReceiver() {
    setReceiver(null);
    setCtx(SHOP_CTX);
    setHandle("");
    setLookup({ state: "idle", message: "" });
    setError("");
    requestId.current = "";
    setStep(2);
  }

  const goReview = useCallback(() => {
    if (!receiver) return;
    setError("");
    setStep(3);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [receiver]);

  async function send() {
    if (!signedIn) {
      setAuthOpen(true);
      return;
    }
    if (busy || !receiver || short) return;
    if (!requestId.current) requestId.current = newRequestId();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          giftId: gift.id,
          to: receiver.username,
          context: ctx,
          note: note.trim(),
          requestId: requestId.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof data.balanceMills === "number") setBalance(data.balanceMills);
        throw new Error(data.error || "Couldn’t send that gift. Nothing was charged.");
      }
      setBalance(data.balanceMills);
      setDone(data);
      requestId.current = "";
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Couldn’t send that gift. Nothing was charged.");
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------- success
  if (done) {
    const back = contextBackHref(done.context, done.to.username);
    return (
      <>
        <WalletCard mills={balance} signedIn />
        <Stepper step={4} />
        <section className="gf-done" aria-live="polite">
          <div className="gf-done-art">
            <GiftTile gift={gift} large />
            <span className="gf-done-tick" aria-hidden="true">✓</span>
          </div>
          <h1 className="gf-done-title">Gift sent!</h1>
          <p className="gf-done-sub">
            <b>{gift.name}</b> is on its way to <b>@{done.to.username}</b>
            {done.context.type !== "shop" && <> from {contextLabel(done.context)}</>}.
          </p>
          <div className="gf-done-card">
            <Receipt gift={gift} quote={done.quote} balance={done.balanceMills} signedIn showBalance={false} />
            <p className="gf-done-bal">
              New wallet balance <b>{formatMills(done.balanceMills)}</b>
            </p>
            <p className="gf-done-id">Receipt {done.receiptId.slice(-8).toUpperCase()}</p>
          </div>
          <div className="gf-actions gf-actions-center">
            <Link href={giftsHref(done.context)} className="gf-btn gf-btn-primary">
              Send another gift
            </Link>
            <Link href={back} className="gf-btn gf-btn-ghost">
              {back === "/" ? "Return home" : "Back to where you were"}
            </Link>
          </div>
        </section>
      </>
    );
  }

  // ------------------------------------------------------------ checkout
  return (
    <>
      <WalletCard mills={balance} signedIn={signedIn} />
      <Stepper step={stepNumber} />

      <div className="gf-checkout">
        <aside className="gf-summary" aria-label="Your gift">
          <GiftTile gift={gift} large />
          <div className="gf-summary-body">
            <h1 className="gf-summary-name">{gift.name}</h1>
            <p className="gf-summary-meta">
              <span>{game.name}</span>
              <span>{getCategory(gift.category).name}</span>
              <RarityTag gift={gift} />
            </p>
            <p className="gf-summary-blurb">{gift.blurb}</p>
            <p className="gf-summary-price">{formatPrice(gift.price)}</p>
            <Link href={giftsHref(ctx)} className="gf-summary-change">
              ← Change gift
            </Link>
          </div>
        </aside>

        <section className="gf-panel" aria-live="polite">
          {step === 2 && (
            <>
              <h2 className="gf-panel-title">Who is it for?</h2>

              {receiver ? (
                <SendingTo person={receiver} ctx={ctx}>
                  <button type="button" className="gf-to-change" onClick={changeReceiver}>
                    Change
                  </button>
                </SendingTo>
              ) : fromContext ? (
                <>
                  <p className="gf-help">{initialProblem || "We couldn’t use that recipient."}</p>
                  <button type="button" className="gf-btn gf-btn-ghost" onClick={changeReceiver}>
                    Choose someone else
                  </button>
                </>
              ) : !signedIn ? (
                <div className="gf-login-box">
                  <p>Log in to choose who gets this gift.</p>
                  <button type="button" className="gf-btn gf-btn-primary" onClick={() => setAuthOpen(true)}>
                    Log in
                  </button>
                </div>
              ) : (
                <>
                  <label className="gf-field-label" htmlFor="gf-handle">
                    Their handle
                  </label>
                  <div className={`gf-handle is-${lookup.state}`}>
                    <span className="gf-handle-at" aria-hidden="true">@</span>
                    <input
                      id="gf-handle"
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/^@+/, ""))}
                      placeholder="username"
                      maxLength={21}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="text"
                      enterKeyHint="go"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          chooseFound();
                        }
                      }}
                      aria-describedby="gf-handle-status"
                    />
                    {lookup.state === "loading" && <span className="gf-spin" aria-label="Looking up" />}
                  </div>
                  <div id="gf-handle-status" className="gf-handle-status" role="status">
                    {lookup.state === "error" && <p className="gf-bad">{lookup.message}</p>}
                    {lookup.state === "found" && lookup.person && (
                      <button type="button" className="gf-found" onClick={chooseFound}>
                        <RecipientAvatar person={lookup.person} size={40} />
                        <span>
                          <b>{lookup.person.displayName}</b>
                          <i>@{lookup.person.username}</i>
                        </span>
                        <em>Select</em>
                      </button>
                    )}
                    {lookup.state === "idle" && (
                      <p className="gf-help">Type the exact handle of the person you want to gift.</p>
                    )}
                  </div>
                </>
              )}

              {receiver && (
                <>
                  <label className="gf-field-label" htmlFor="gf-note">
                    Add a message <span>(optional)</span>
                  </label>
                  {fromContext && ctx.type !== "profile" && (
                    <p className="gf-help gf-help-tight">
                      Your gift and message show publicly in the comments{ctx.type === "comment" ? ", under that comment" : ""}.
                    </p>
                  )}
                  <p className="gf-help gf-help-tight">Leave it empty and we’ll add a friendly message for you.</p>
                  <div className="gf-note">
                    <textarea
                      id="gf-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                      placeholder="Say something nice…"
                      rows={3}
                      maxLength={NOTE_MAX}
                    />
                    <span className="gf-note-count">{NOTE_MAX - note.length}</span>
                  </div>
                  <div className="gf-actions">
                    <button type="button" className="gf-btn gf-btn-primary" onClick={goReview}>
                      Continue to review
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 3 && receiver && (
            <>
              <h2 className="gf-panel-title">Review and pay</h2>

              <div className="gf-review-rows">
                <div className="gf-review-row">
                  <span className="gf-review-k">To</span>
                  <span className="gf-review-v">
                    <RecipientAvatar person={receiver} size={26} />
                    <b>@{receiver.username}</b>
                  </span>
                  <button type="button" className="gf-link" onClick={() => setStep(2)}>
                    Edit
                  </button>
                </div>
                <div className="gf-review-row">
                  <span className="gf-review-k">Sent from</span>
                  <span className="gf-review-v">{ctx.type === "shop" ? "The Gift Shop" : contextLabel(ctx)}</span>
                </div>
                {note.trim() && (
                  <div className="gf-review-row gf-review-note">
                    <span className="gf-review-k">Message</span>
                    <span className="gf-review-v">“{note.trim()}”</span>
                    <button type="button" className="gf-link" onClick={() => setStep(2)}>
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <h3 className="gf-h3">What leaves your wallet</h3>
              <Receipt gift={gift} quote={quote} balance={balance} signedIn={signedIn} />
              <p className="gf-fineprint">
                Tax is a fixed {formatMills(quote.flat)} plus 5% of the gift price. Gifts are paid from your
                wallet only, never a card, and can’t be refunded once sent.
              </p>

              {signedIn && short && (
                <p className="gf-alert" role="alert">
                  Your wallet is short by <b>{formatMills(quote.total - balance)}</b>. Top-ups are coming soon.
                </p>
              )}
              {error && (
                <p className="gf-alert" role="alert">
                  {error}
                </p>
              )}

              <div className="gf-actions gf-actions-split">
                <button type="button" className="gf-btn gf-btn-ghost" onClick={() => setStep(2)} disabled={busy}>
                  Back
                </button>
                <button
                  type="button"
                  className="gf-btn gf-btn-primary"
                  onClick={send}
                  disabled={busy || (signedIn && short)}
                  aria-busy={busy}
                >
                  {busy
                    ? "Sending…"
                    : !signedIn
                      ? "Log in to send"
                      : `Send gift · ${formatMills(quote.total)}`}
                </button>
              </div>
            </>
          )}

          {step === 2 && error && (
            <p className="gf-alert" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      {authOpen && <AuthModal initialView="login" onClose={() => setAuthOpen(false)} />}
    </>
  );
}
