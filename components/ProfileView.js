"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditProfileModal from "./EditProfileModal";
import AuthModal from "./AuthModal";
import ProfileTabs from "./profile/ProfileTabs";
import { ABOUT_TAB, cleanTab } from "./profile/tabs";
import MessageButton from "./messages/MessageButton";
import { FriendRequests, SocialButtons, SocialCounts, useSocial } from "./SocialActions";
import PlanBadges from "./PlanBadges";
import { PLAN_IDS } from "@/lib/plans";
import Discover from "./Discover";
import { FlairBadge, FlairName, haloClass } from "./Flair";
import GenderIcon from "./GenderIcon";
import Flag from "./Flag";
import { BoltIcon, CameraIcon, ChevronDownIcon, EditIcon, ShareIcon } from "./icons";
import { GearIcon, LogoutIcon } from "./settings/icons";
import { getTheme } from "@/lib/profile-themes";
import { giftsHref } from "@/lib/gifts";
import Toast, { useToast } from "./Toast";

// The whole profile: the header (banner, name, actions, a one-line bio) and the
// tabs under it. They share one component so the bio can open the About tab and
// so editing the profile updates the About tab straight away.
export default function ProfileView({
  initialProfile,
  initialTab = "post",
  posts,
  stats,
  insights,
  social: initialSocial,
  requests = [],
  messaging = null,
  signedIn = false,
  isOwner,
  locked = false,
  giftsStrip = null,
}) {
  const router = useRouter();
  const [profile, setProfile] = useState({ ...initialProfile });
  const [tab, setTab] = useState(() => cleanTab(initialTab));
  const [editing, setEditing] = useState(false);
  const { toast, show: flash, hide: hideToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  // The "more" menu closes on an outside tap or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Logging out lives on your own profile now (it was removed from the header).
  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
      flash("Couldn’t log out. Try again.");
    }
  }

  const theme = getTheme(profile.theme);
  const vars = { "--a": theme.a, "--b": theme.b };
  const initial = (profile.displayName || profile.username).trim().charAt(0).toUpperCase();

  async function share() {
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Profile link copied");
    } catch {
      flash(url);
    }
  }

  const social = useSocial({
    username: profile.username,
    initial: initialSocial,
    signedIn,
    flash,
    askLogin: () => setAuthOpen(true),
  });

  function handleSaved(next) {
    setProfile((p) => ({ ...p, ...next }));
    setEditing(false);
    flash("Profile updated");
    router.refresh();
  }

  // The tab lives in the URL (?tab=videos) so coming back from a post lands on
  // the same tab. replaceState keeps the history clean: one profile, one entry.
  function selectTab(next) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "post") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  function openAbout() {
    selectTab(ABOUT_TAB);
    document.getElementById("pf-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const bioLine = profile.bio ? profile.bio.replace(/\s+/g, " ").trim() : "";

  return (
    <>
      <section className="pf-hero" style={vars}>
        <div
          className={`pf-banner${profile.bannerUrl ? "" : " pf-banner--default"}`}
          style={profile.bannerUrl ? { backgroundImage: `url("${profile.bannerUrl}")` } : undefined}
          role="img"
          aria-label={`${profile.displayName} banner`}
        >
          {isOwner && (
            <button className="pf-banner-edit" onClick={() => setEditing(true)} aria-label="Change banner">
              <span className="pf-ico">
                <CameraIcon />
              </span>
              Change cover
            </button>
          )}
        </div>

        <div className={`pf-identity${menu ? " menu-open" : ""}`}>
          <div className={`pf-avatar${haloClass(profile.flair)}`}>
            <div
              className="pf-avatar-in"
              style={profile.avatarUrl || profile.defaultAvatar ? { backgroundImage: `url("${profile.avatarUrl || profile.defaultAvatar}")` } : undefined}
              role="img"
              aria-label={`${profile.displayName} profile picture`}
            >
              {!profile.avatarUrl && !profile.defaultAvatar && initial}
            </div>
            <Flag country={profile.country} className="pf-flag" />
          </div>

          <div className="pf-names">
            <h1 className="pf-name">
              <FlairName flair={profile.flair} a={theme.a} b={theme.b}>{profile.displayName}</FlairName>
              <PlanBadges plan={profile.plan} className="pb-lg" />
              <FlairBadge flair={profile.flair} className="fb-lg" />
              <GenderIcon gender={profile.gender} />
            </h1>
            <div className="pf-handle">
              @{profile.username}
              {!isOwner && social.followsMe && <span className="pf-follows-you">Follows you</span>}
            </div>
          </div>

          <div className="pf-actions">
            {isOwner && (
              <button className="pf-btn pf-btn-primary" onClick={() => setEditing(true)}>
                <span className="pf-ico">
                  <EditIcon />
                </span>
                Edit profile
              </button>
            )}
            {!isOwner && <SocialButtons social={social} />}
            {!isOwner && messaging && (
              <MessageButton
                username={profile.username}
                info={messaging}
                following={social.following}
                friend={social.friend}
                flash={flash}
              />
            )}
            {!isOwner && (
              <Link
                href={giftsHref({ type: "profile", to: profile.username })}
                className="pf-btn pf-btn-ghost pf-btn-gift"
                prefetch={false}
              >
                <span aria-hidden="true">🎁</span> Gift
              </Link>
            )}
            <button className="pf-btn pf-btn-ghost" onClick={share}>
              <span className="pf-ico">
                <ShareIcon />
              </span>
              Share
            </button>
            {isOwner && (
              <div className="pf-more" ref={menuRef}>
                <button
                  type="button"
                  className="pf-btn pf-btn-ghost pf-btn-icon"
                  aria-label="More options"
                  aria-haspopup="menu"
                  aria-expanded={menu}
                  onClick={() => setMenu((v) => !v)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </button>
                {menu && (
                  <div className="pf-menu" role="menu">
                    <Link href="/upgrade" role="menuitem" className="pf-menu-item pf-menu-upgrade">
                      <span className="pf-ico"><BoltIcon /></span>
                      {profile.plan === PLAN_IDS[PLAN_IDS.length - 1] ? "Your plan" : "Upgrade"}
                    </Link>
                    <Link href="/saved" role="menuitem" className="pf-menu-item">
                      <span className="pf-ico">
                        <svg viewBox="0 0 24 24">
                          <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />
                        </svg>
                      </span>
                      Saved posts
                    </Link>
                    <Link href="/settings" role="menuitem" className="pf-menu-item">
                      <span className="pf-ico"><GearIcon /></span>
                      Settings
                    </Link>
                    <button type="button" role="menuitem" className="pf-menu-item" onClick={logout} disabled={loggingOut}>
                      <span className="pf-ico"><LogoutIcon /></span>
                      {loggingOut ? "Logging out..." : "Log out"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pf-details">
          <SocialCounts counts={social.counts} username={profile.username} canOpen={!locked} />

          {!locked && (
            <button type="button" className="pf-bio-peek" onClick={openAbout} aria-label="Open About">
              <span className={`pf-bio-peek-text${bioLine ? "" : " none"}`}>{bioLine || "No bio yet"}</span>
              <span className="pf-bio-peek-go" aria-hidden="true">
                {bioLine ? "…more" : "About"}
                <ChevronDownIcon />
              </span>
            </button>
          )}

          {isOwner && <FriendRequests initial={requests} onCountsChange={social.setCounts} flash={flash} />}
        </div>
      </section>

      {giftsStrip}

      {/* Your own profile gets one tidy card of shortcuts (one block, not loose promos). */}
      {isOwner && !locked && (
        <Discover
          spot="profile"
          variant="tiles"
          card
          className="dc-profile"
          title="Your corner"
          sub="Shops and extras for your account"
        />
      )}

      {locked ? (
        <section className="pf-locked">
          <h2>This account is private</h2>
          <p>@{profile.username} keeps their posts to themselves.</p>
        </section>
      ) : (
        <ProfileTabs
          tab={tab}
          onTab={selectTab}
          posts={posts}
          stats={stats}
          insights={insights}
          profile={profile}
          isOwner={isOwner}
          onEdit={() => setEditing(true)}
        />
      )}

      {editing && (
        <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={handleSaved} />
      )}

      {authOpen && <AuthModal initialView="login" onClose={() => setAuthOpen(false)} />}

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
}
