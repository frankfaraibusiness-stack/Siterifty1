"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { MicIcon } from "./icons";

const subscribe = () => () => {};
const getSupported = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Voice input only: it turns speech into text in the search box and submits
// the form. The search itself still runs on the server. Hidden in browsers
// without the Web Speech API (e.g. Firefox).
export default function VoiceSearchButton() {
  const supported = useSyncExternalStore(subscribe, getSupported, () => false);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");
  const recRef = useRef(null);
  const btnRef = useRef(null);

  if (!supported) return null;

  function flash(message) {
    setHint(message);
    setTimeout(() => setHint(""), 3000);
  }

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const form = btnRef.current?.closest("form");
    const input = form?.querySelector('input[name="q"]');
    if (!input) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = "";
    let errored = false;

    rec.onstart = () => {
      setListening(true);
      setHint("Listening...");
    };
    rec.onresult = (e) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      input.value = (finalText + interim).trim().slice(0, 80);
    };
    rec.onerror = (e) => {
      errored = true;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        flash("Microphone access is blocked.");
      } else if (e.error === "no-speech") {
        flash("Didn't catch that. Try again.");
      } else if (e.error !== "aborted") {
        flash("Voice search failed.");
      }
    };
    rec.onend = () => {
      setListening(false);
      if (!errored) {
        setHint("");
        if (finalText.trim()) form.requestSubmit();
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      flash("Voice search failed.");
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`sb-mic${listening ? " listening" : ""}`}
        onClick={toggle}
        aria-label={listening ? "Stop listening" : "Search by voice"}
        aria-pressed={listening}
        title="Search by voice"
      >
        <MicIcon />
      </button>
      {hint && (
        <span className="sb-hint" role="status">
          {hint}
        </span>
      )}
    </>
  );
}
