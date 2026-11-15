"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "./icons";
import { THEMES, getTheme } from "@/lib/profile-themes";
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

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

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
    <div
      className="pf-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pf-modal" role="dialog" aria-modal="true" aria-label="Edit profile">
        <form className="pf-modal-inner" onSubmit={save}>
          <div className="pf-modal-head">
            <h2>Edit profile</h2>
            <button
              type="button"
              className="pf-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <span className="pf-ico">
                <XIcon />
              </span>
            </button>
          </div>

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
                style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
              >
                {!avatarUrl && initial}
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
              Bio <em>{bio.length}/160</em>
            </span>
            <textarea
              className="pf-input pf-textarea"
              value={bio}
              maxLength={160}
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
            </div>
          </div>

          {error && <div className="pf-error">{error}</div>}

          <div className="pf-modal-foot">
            <button type="button" className="pf-btn pf-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pf-btn pf-btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
