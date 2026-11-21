"use client";

import { useRef, useState } from "react";
import { CameraIcon } from "./icons";
import FullScreen from "./FullScreen";
import Link from "next/link";
import { PERK_THEMES, THEMES, getTheme } from "@/lib/profile-themes";
import { bioMax, getPerk, hasPerk } from "@/lib/perks";
import { resizeImage } from "@/lib/image-resize";

export default function EditProfileModal({ profile, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [website, setWebsite] = useState(profile.website);
  const [theme, setTheme] = useState(profile.theme);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarInput = useRef(null);
  const bannerInput = useRef(null);

  const t = getTheme(theme);
  const initial = (displayName || profile.username).trim().charAt(0).toUpperCase();

  async function pick(e, setter, size) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setter(await resizeImage(file, size));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const body = { displayName, bio, location, website, theme };
    if (avatarUrl !== profile.avatarUrl) body.avatarUrl = avatarUrl;
    if (bannerUrl !== profile.bannerUrl) body.bannerUrl = bannerUrl;

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save your profile.");
        return;
      }
      onSaved(data.profile);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FullScreen
      title="Edit profile"
      subtitle={`@${profile.username}`}
      onClose={onClose}
      size="md"
      className="pf-fs"
      style={{ "--a": t.a, "--b": t.b }}
      footer={
        <>
          {error && <div className="pf-error" role="alert">{error}</div>}
          <div className="fs-foot-row">
            <button type="button" className="pf-btn pf-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" form="pf-edit-form" className="pf-btn pf-btn-primary grow" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      }
    >
      <form id="pf-edit-form" className="pf-fs-form" onSubmit={save}>
        <section className="fs-card">
          <h2 className="fs-card-h">Banner and photo</h2>
        <div className="pf-edit-visual" style={{ "--a": t.a, "--b": t.b }}>
          <div
            className={`pf-edit-banner${bannerUrl ? "" : " pf-banner--default"}`}
            style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
          >
            <div className="pf-edit-banner-actions">
              <button
                type="button"
                className="pf-chip-btn"
                onClick={() => bannerInput.current?.click()}
              >
                <span className="pf-ico">
                  <CameraIcon />
                </span>
                {bannerUrl ? "Change" : "Upload banner"}
              </button>
              {bannerUrl && (
                <button
                  type="button"
                  className="pf-chip-btn"
                  onClick={() => setBannerUrl(null)}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="pf-avatar pf-avatar--edit">
            <div
              className="pf-avatar-in"
              style={avatarUrl || profile.defaultAvatar ? { backgroundImage: `url("${avatarUrl || profile.defaultAvatar}")` } : undefined}
            >
              {!avatarUrl && !profile.defaultAvatar && initial}
            </div>
            <button
              type="button"
              className="pf-avatar-cam"
              onClick={() => avatarInput.current?.click()}
              aria-label="Change profile picture"
            >
              <span className="pf-ico">
                <CameraIcon />
              </span>
            </button>
          </div>
          {avatarUrl && (
            <button
              type="button"
              className="pf-link-btn"
              onClick={() => setAvatarUrl(null)}
            >
              Remove photo
            </button>
          )}
        </div>

        <input
          ref={bannerInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pick(e, setBannerUrl, { width: 1200, height: 400, quality: 0.8 })}
        />
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pick(e, setAvatarUrl, { width: 320, height: 320, quality: 0.85 })}
        />
        </section>

        <section className="fs-card">
          <h2 className="fs-card-h">About you</h2>
        <label className="pf-field">
          <span className="pf-label">Display name</span>
          <input
            className="pf-input"
            value={displayName}
            maxLength={40}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>

        <label className="pf-field">
          <span className="pf-label">
            Bio <em>{bio.length}/{bioMax(profile.perks)}</em>
          </span>
          <textarea
            className="pf-input pf-textarea"
            value={bio}
            maxLength={bioMax(profile.perks)}
            rows={3}
            placeholder="Tell Leonida who you are..."
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <div className="pf-field-row">
          <label className="pf-field">
            <span className="pf-label">Location</span>
            <input
              className="pf-input"
              value={location}
              maxLength={40}
              placeholder="Vice City, Leonida"
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="pf-field">
            <span className="pf-label">Website</span>
            <input
              className="pf-input"
              value={website}
              maxLength={120}
              placeholder="yoursite.com"
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
        </section>

        <section className="fs-card">
          <h2 className="fs-card-h">Look</h2>
        <div className="pf-field">
          <span className="pf-label">Accent</span>
          <div className="pf-themes">
            {THEMES.map((th) => (
              <button
                type="button"
                key={th.id}
                className={`pf-theme${th.id === theme ? " active" : ""}`}
                style={{ background: `linear-gradient(135deg, ${th.a}, ${th.b})` }}
                onClick={() => setTheme(th.id)}
                aria-label={th.label}
                title={th.label}
              />
            ))}
            {PERK_THEMES.map((th) =>
              hasPerk(profile.perks, th.perk) ? (
                <button
                  type="button"
                  key={th.id}
                  className={`pf-theme${th.id === theme ? " active" : ""}`}
                  style={{ background: `linear-gradient(135deg, ${th.a}, ${th.b})` }}
                  onClick={() => setTheme(th.id)}
                  aria-label={`${th.label} (${getPerk(th.perk).name})`}
                  title={`${th.label} (${getPerk(th.perk).name})`}
                />
              ) : (
                <Link
                  key={th.id}
                  href="/perks"
                  className="pf-theme pf-theme-locked"
                  style={{ background: `linear-gradient(135deg, ${th.a}, ${th.b})` }}
                  aria-label={`${th.label}: unlock with the ${getPerk(th.perk).name}`}
                  title={`${th.label}: unlock with the ${getPerk(th.perk).name}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                  </svg>
                </Link>
              )
            )}
          </div>
        </div>
        </section>
      </form>
    </FullScreen>
  );
}
