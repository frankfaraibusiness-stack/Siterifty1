"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LockIcon, XIcon } from "../icons";
import {
  CopyIcon, DownloadIcon, Letters, MailIcon, MoreIcon, SmsIcon, TelegramIcon, TickIcon, WhatsAppIcon, XMarkIcon,
} from "./icons";

// The Share sheet for one clip: save the video (plan members only), send it to the big
// social apps, or copy the link. Web share links can't carry the video file itself, so
// they send the clip's page link; "More apps" opens the phone's own share menu, which
// reaches Instagram, TikTok, Snapchat, Messenger and whatever else is installed.
//
// `onShared` is told when the person really did something (opened a target or copied),
// so the Videos tab can pay its once-a-clip share reward.
export default function ShareSheet({ clip, signedIn, canDownload, onClose, onShared }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const [origin, setOrigin] = useState("");

  const url = `${origin}/p/${clip.id}`;
  const title = clip.title || `Clip by ${clip.user}`;
  const text = `${title} on GTAFanbase`;
  const enc = encodeURIComponent;

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNative(typeof navigator.share === "function");
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [onClose]);

  const targets = [
    { id: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon />, href: `https://wa.me/?text=${enc(`${text} ${url}`)}` },
    { id: "facebook", label: "Facebook", icon: <Letters text="f" size={22} />, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { id: "x", label: "X", icon: <XMarkIcon />, href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}` },
    { id: "telegram", label: "Telegram", icon: <TelegramIcon />, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { id: "reddit", label: "Reddit", icon: <Letters text="r/" />, href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}` },
    { id: "threads", label: "Threads", icon: <Letters text="@" size={18} />, href: `https://www.threads.net/intent/post?text=${enc(`${text} ${url}`)}` },
    { id: "bluesky", label: "Bluesky", icon: <Letters text="Bs" size={12} />, href: `https://bsky.app/intent/compose?text=${enc(`${text} ${url}`)}` },
    { id: "linkedin", label: "LinkedIn", icon: <Letters text="in" />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}` },
    { id: "email", label: "Email", icon: <MailIcon />, href: `mailto:?subject=${enc(title)}&body=${enc(`${text}\n${url}`)}`, local: true },
    { id: "sms", label: "Messages", icon: <SmsIcon />, href: `sms:?&body=${enc(`${text} ${url}`)}`, local: true },
  ];

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      onShared?.(clip);
    } catch {
      // Clipboard blocked: select the link so it can be copied by hand.
      const el = document.getElementById("vr-share-url");
      el?.focus();
      el?.select?.();
    }
  }, [url, clip, onShared]);

  const native = useCallback(async () => {
    try {
      await navigator.share({ title, text, url });
      onShared?.(clip);
      onClose();
    } catch {
      // Closed without sharing: nothing to do.
    }
  }, [title, text, url, clip, onShared, onClose]);

  return (
    <div className="vr-sheet-wrap" onClick={onClose}>
      <div className="vr-sheet vr-share" role="dialog" aria-modal="true" aria-label="Share this clip" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vr-sheet-x" onClick={onClose} aria-label="Close">
          <XIcon />
        </button>

        <header className="vr-share-head">
          <span className="vr-share-thumb" style={clip.poster ? { backgroundImage: `url("${clip.poster}")` } : undefined} aria-hidden="true" />
          <div>
            <h2>Share this clip</h2>
            <p>{title}</p>
          </div>
        </header>

        {canDownload ? (
          <a className="vr-share-dl" href={`/video/${clip.id}?download=1`} download onClick={() => onShared?.(clip)}>
            <DownloadIcon />
            <span><b>Download video</b><small>Save the clip to your device</small></span>
          </a>
        ) : (
          <div className="vr-share-dl is-locked">
            <LockIcon />
            <span>
              <b>Download video <em>Members</em></b>
              <small>{signedIn ? "Downloads come with any paid plan." : "Log in and pick a plan to download clips."}</small>
            </span>
            <Link href="/upgrade" className="vr-share-up">{signedIn ? "See plans" : "Plans"}</Link>
          </div>
        )}

        <h3 className="vr-share-sub">Share to</h3>
        <ul className="vr-share-grid">
          {targets.map((t) => (
            <li key={t.id}>
              <a
                className={`vr-share-app app-${t.id}`}
                href={t.href}
                {...(t.local ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => onShared?.(clip)}
              >
                <i>{t.icon}</i>
                <span>{t.label}</span>
              </a>
            </li>
          ))}
          {canNative && (
            <li>
              <button type="button" className="vr-share-app app-more" onClick={native}>
                <i><MoreIcon /></i>
                <span>More apps</span>
              </button>
            </li>
          )}
        </ul>

        <div className="vr-share-link">
          <input id="vr-share-url" type="text" readOnly value={url} aria-label="Clip link" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={copy} className={copied ? "is-done" : ""}>
            {copied ? <TickIcon /> : <CopyIcon />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
