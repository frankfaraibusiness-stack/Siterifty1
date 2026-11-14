"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditProfileModal from "./EditProfileModal";
import {
  CalendarIcon,
  CameraIcon,
  EditIcon,
  LinkIcon,
  PinIcon,
  ShareIcon,
} from "./icons";
import { getTheme } from "@/lib/profile-themes";
import { formatCount } from "@/lib/format-count";

export default function ProfileHeader({ initialProfile, stats, isOwner }) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    ...initialProfile,
  });
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  const theme = getTheme(profile.theme);
  const vars = { "--a": theme.a, "--b": theme.b };
  const initial = (profile.displayName || profile.username)
    .trim()
    .charAt(0)
    .toUpperCase();
  const shortSite = profile.website
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  function flash(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }

  async function share() {
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Profile link copied");
    } catch {
      flash(url);
    }
  }

  function handleSaved(next) {
    setProfile((p) => ({ ...p, ...next }));
    setEditing(false);
    flash("Profile updated");
    router.refresh();
  }

  const statItems = [
    ["Posts", stats.posts],
    ["Likes", stats.likes],
    ["Comments", stats.comments],
    ["Saves", stats.saves],
  ];

  return (
    <>
      <section className="pf-hero" style={vars}>
        <div
          className={`pf-banner${profile.bannerUrl ? "" : " pf-banner--default"}`}
          style={
            profile.bannerUrl
              ? { backgroundImage: `url("${profile.bannerUrl}")` }
              : undefined
          }
          role="img"
          aria-label={`${profile.displayName} banner`}
        >
          {isOwner && (
            <button
              className="pf-banner-edit"
              onClick={() => setEditing(true)}
              aria-label="Change banner"
            >
              <span className="pf-ico">
                <CameraIcon />
              </span>
              Change cover
            </button>
          )}
        </div>

        <div className="pf-identity">
          <div className="pf-avatar">
            <div
              className="pf-avatar-in"
              style={
                profile.avatarUrl
                  ? { backgroundImage: `url("${profile.avatarUrl}")` }
                  : undefined
              }
              role="img"
              aria-label={`${profile.displayName} profile picture`}
            >
              {!profile.avatarUrl && initial}
            </div>
          </div>

          <div className="pf-names">
            <h1 className="pf-name">{profile.displayName}</h1>
            <div className="pf-handle">@{profile.username}</div>
          </div>

          <div className="pf-actions">
            {isOwner && (
              <button
                className="pf-btn pf-btn-primary"
                onClick={() => setEditing(true)}
              >
                <span className="pf-ico">
                  <EditIcon />
                </span>
                Edit profile
              </button>
            )}
            <button className="pf-btn pf-btn-ghost" onClick={share}>
              <span className="pf-ico">
                <ShareIcon />
              </span>
              Share
            </button>
          </div>
        </div>

        <div className="pf-details">
          {profile.bio ? (
            <p className="pf-bio">{profile.bio}</p>
          ) : (
            isOwner && (
              <button className="pf-bio-empty" onClick={() => setEditing(true)}>
                Add a bio so the crew knows who you are
              </button>
            )
          )}

          <div className="pf-meta">
            {profile.location && (
              <span className="pf-meta-item">
                <span className="pf-ico">
                  <PinIcon />
                </span>
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                className="pf-meta-item pf-meta-link"
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="pf-ico">
                  <LinkIcon />
                </span>
                {shortSite}
              </a>
            )}
            {profile.joined && (
              <span className="pf-meta-item">
                <span className="pf-ico">
                  <CalendarIcon />
                </span>
                Joined {profile.joined}
              </span>
            )}
          </div>

          <div className="pf-stats">
            {statItems.map(([label, value]) => (
              <div className="pf-stat" key={label}>
                <div className="pf-stat-num">{formatCount(value)}</div>
                <div className="pf-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="pf-toast">{toast}</div>}
    </>
  );
}
