"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import AuthModal from "../AuthModal";
import { refPath } from "@/lib/referrals";

// The address the page is open on, read in the browser so the link always matches the site the member is
// using right now (localhost, a preview deploy or the real domain). Empty on the server render.
const noop = () => () => {};
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");
const useCanShare = () =>
  useSyncExternalStore(noop, () => typeof navigator !== "undefined" && typeof navigator.share === "function", () => false);

const enc = encodeURIComponent;
const PITCH = "I'm on GTAFanbase, the home for GTA 6 fans. Come hang out with me:";

function Icon({ d, extra }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {extra}
    </svg>
  );
}

// The member's personal link with copy and share buttons. Signed-out visitors see the same card
// with the sign-up and log-in buttons in its place.
export default function LinkPanel({ signedIn, code }) {
  const origin = useOrigin();
  const canShare = useCanShare();
  const [authView, setAuthView] = useState(null); // null | "signup" | "login"
  const [note, setNote] = useState("");
  const field = useRef(null);
  const timer = useRef(0);

  const ready = signedIn && !!code;
  const path = ready ? refPath(code) : refPath("YOURCODE");
  const shown = `${origin}${path}`;
  const link = ready ? shown : "";

  function flash(msg) {
    setNote(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(""), 2400);
  }

  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      // Clipboard blocked (older browsers, some in-app browsers): select it so a long press / Ctrl+C works.
      field.current?.focus();
      field.current?.select();
      flash("Select the link and copy it");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "GTAFanbase", text: PITCH, url: link });
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <div className="rf-link" id="your-link">
      <label className="rf-link-label" htmlFor="rf-link-field">
        Your personal link
      </label>

      <div className={`rf-link-row${ready ? "" : " is-idle"}`}>
        <input
          id="rf-link-field"
          ref={field}
          className="rf-link-field"
          readOnly
          value={shown}
          disabled={!ready}
          spellCheck={false}
          autoComplete="off"
          onFocus={(e) => ready && e.currentTarget.select()}
          aria-describedby="rf-link-note"
        />
        {ready ? (
          <button type="button" className="rf-btn rf-btn-primary" onClick={() => copy(link, "Link copied")}>
            <Icon d="M9 9h9.5a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 20v-9.5A1.5 1.5 0 0 1 9 9z" extra={<path d="M16 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9.5A1.5 1.5 0 0 0 5 16h1.5" />} />
            Copy link
          </button>
        ) : null}
      </div>

      {ready ? (
        <>
          <div className="rf-share" role="group" aria-label="Share your link">
            {canShare && (
              <button type="button" className="rf-chipbtn" onClick={share}>
                <Icon d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
                Share
              </button>
            )}
            <a className="rf-chipbtn" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${enc(PITCH)}&url=${enc(link)}`}>
              Post on X
            </a>
            <a className="rf-chipbtn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${enc(`${PITCH} ${link}`)}`}>
              WhatsApp
            </a>
            <a className="rf-chipbtn" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${enc(link)}&text=${enc(PITCH)}`}>
              Telegram
            </a>
            <button type="button" className="rf-chipbtn" onClick={() => copy(`${PITCH} ${link}`, "Caption and link copied")}>
              Copy with caption
            </button>
          </div>
          <p id="rf-link-note" className="rf-note" role="status" aria-live="polite">
            {note || "Works from your bio, stream panels, video descriptions, Discord and anywhere else you share links."}
          </p>
        </>
      ) : signedIn ? (
        <p id="rf-link-note" className="rf-note" role="status">
          We couldn’t load your link just now. Refresh the page to try again.
        </p>
      ) : (
        <>
          <div className="rf-cta">
            <button type="button" className="rf-btn rf-btn-primary" onClick={() => setAuthView("signup")}>
              Create a free account
            </button>
            <button type="button" className="rf-btn rf-btn-ghost" onClick={() => setAuthView("login")}>
              Log in
            </button>
          </div>
          <p id="rf-link-note" className="rf-note">
            Your unique link appears here the moment you’re signed in. It’s free for every member.
          </p>
        </>
      )}

      {authView && <AuthModal initialView={authView} onClose={() => setAuthView(null)} />}
    </div>
  );
}
