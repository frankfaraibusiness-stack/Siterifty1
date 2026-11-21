"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Segmented, TextInput, Toggle } from "../composer/ui";
import { Block, Notice } from "./bits";
import { CameraIcon, DownloadIcon, GlobeIcon, LockIcon } from "./icons";
import { useSettings } from "./context";
import { PERK_THEMES, THEMES, getTheme } from "@/lib/profile-themes";
import { bioMax, getPerk, hasPerk } from "@/lib/perks";
import { resizeImage } from "@/lib/image-resize";
import { getPlan, planRank } from "@/lib/plans";
import AudiencePicker from "./AudiencePicker";
import Select from "../ui/Select";
import { countryOptions } from "@/lib/countries";
import { countryName } from "@/lib/flag";
import Flag from "../Flag";

// Account management: the face you show, who can see the account, and sign-in.
export default function CharacterPanel() {
  const { me, setMe, prefs, update, notify, email } = useSettings();

  const [form, setForm] = useState({
    displayName: me.displayName,
    bio: me.bio,
    location: me.location,
    website: me.website,
    theme: me.theme,
  });
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(me.bannerUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const avatarInput = useRef(null);
  const bannerInput = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dirty =
    form.displayName !== me.displayName ||
    form.bio !== me.bio ||
    form.location !== me.location ||
    form.website !== me.website ||
    form.theme !== me.theme ||
    avatarUrl !== me.avatarUrl ||
    bannerUrl !== me.bannerUrl;
  const t = getTheme(form.theme);
  const initial = (form.displayName || me.username).trim().charAt(0).toUpperCase();

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

  // Country and gender save the moment they change (own endpoint), and snap back if the save fails.
  const countries = useMemo(() => countryOptions(), []);
  async function saveIdentity(patch) {
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, me[k]]));
    setMe((m) => ({ ...m, ...patch }));
    try {
      const res = await fetch("/api/settings/identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn’t save that.");
      setMe((m) => ({ ...m, country: data.country, gender: data.gender }));
      notify("Saved");
    } catch (err) {
      setMe((m) => ({ ...m, ...before }));
      notify(err.message || "Couldn’t save that. Check your connection.", true);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    setError("");
    const body = { ...form };
    if (avatarUrl !== me.avatarUrl) body.avatarUrl = avatarUrl;
    if (bannerUrl !== me.bannerUrl) body.bannerUrl = bannerUrl;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn’t save your character.");
        return;
      }
      setMe((m) => ({ ...m, ...data.profile }));
      notify("Character saved");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={save}>
        <Block title="Your look">
          <div className="st-edit-visual" style={{ "--ta": t.a, "--tb": t.b }}>
            <div
              className={`st-edit-banner${bannerUrl ? " has-img" : ""}`}
              style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
            >
              <div className="st-edit-actions">
                <button type="button" className="st-pill" onClick={() => bannerInput.current?.click()}>
                  <CameraIcon /> {bannerUrl ? "Change cover" : "Add cover"}
                </button>
                {bannerUrl && (
                  <button type="button" className="st-pill" onClick={() => setBannerUrl(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="st-edit-avatar-row">
              <div
                className="st-avatar lg"
                style={avatarUrl || me.defaultAvatar ? { backgroundImage: `url("${avatarUrl || me.defaultAvatar}")` } : undefined}
              >
                {!avatarUrl && !me.defaultAvatar && initial}
              </div>
              <div className="st-edit-avatar-actions">
                <button type="button" className="st-pill solid" onClick={() => avatarInput.current?.click()}>
                  <CameraIcon /> {avatarUrl ? "Change photo" : "Add photo"}
                </button>
                {avatarUrl && (
                  <button type="button" className="st-pill" onClick={() => setAvatarUrl(null)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => pick(e, setBannerUrl, { width: 1200, height: 400, quality: 0.8 })} />
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => pick(e, setAvatarUrl, { width: 320, height: 320, quality: 0.85 })} />
        </Block>

        <Block title="About you">
          <TextInput label="Display name" value={form.displayName} onChange={(displayName) => set({ displayName })} max={40} />
          <TextInput label="Bio" value={form.bio} onChange={(bio) => set({ bio })} max={bioMax(me.perks)} multiline rows={3} placeholder="Tell the crew who you are" />
          <TextInput label="Location" value={form.location} onChange={(location) => set({ location })} max={40} placeholder="Vice City, Leonida" />
          <TextInput label="Website" value={form.website} onChange={(website) => set({ website })} max={120} placeholder="yoursite.com" />
          <div className="st-field">
            <div className="st-label">Profile accent</div>
            <div className="st-swatches" role="radiogroup" aria-label="Profile accent">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={form.theme === th.id}
                  className={`st-swatch${form.theme === th.id ? " on" : ""}`}
                  style={{ "--ta": th.a, "--tb": th.b }}
                  onClick={() => set({ theme: th.id })}
                >
                  <i />
                  <span>{th.label}</span>
                </button>
              ))}
              {PERK_THEMES.map((th) =>
                hasPerk(me.perks, th.perk) ? (
                  <button
                    key={th.id}
                    type="button"
                    role="radio"
                    aria-checked={form.theme === th.id}
                    className={`st-swatch${form.theme === th.id ? " on" : ""}`}
                    style={{ "--ta": th.a, "--tb": th.b }}
                    onClick={() => set({ theme: th.id })}
                  >
                    <i />
                    <span>{th.label}</span>
                  </button>
                ) : (
                  <Link
                    key={th.id}
                    href="/perks"
                    className="st-swatch st-swatch-locked"
                    style={{ "--ta": th.a, "--tb": th.b }}
                    title={`Unlock with the ${getPerk(th.perk).name}`}
                  >
                    <i />
                    <span>{th.label}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                    </svg>
                  </Link>
                )
              )}
            </div>
            <p className="st-hint">Colours your profile banner, avatar ring and the pictures beside your posts.</p>
          </div>
          {error && <Notice tone="bad">{error}</Notice>}
          <div className="st-actions">
            <button type="submit" className="st-btn primary" disabled={!dirty || saving}>
              {saving ? "Saving..." : "Save character"}
            </button>
            {dirty && !saving && (
              <button
                type="button"
                className="st-btn ghost"
                onClick={() => {
                  setForm({ displayName: me.displayName, bio: me.bio, location: me.location, website: me.website, theme: me.theme });
                  setAvatarUrl(me.avatarUrl);
                  setBannerUrl(me.bannerUrl);
                  setError("");
                }}
              >
                Undo changes
              </button>
            )}
          </div>
        </Block>
      </form>

      <Block
        title="Who can see your account"
        hint={
          prefs.account.isPrivate
            ? "Only your name, photo and handle are shown. Your bio, stats and posts are hidden, your posts stay out of the feed and search, and you don’t appear in people search."
            : "Anyone can open your profile, see your posts and find you in search."
        }
      >
        <Segmented
          value={prefs.account.isPrivate ? "private" : "public"}
          onChange={(v) => update("account", { isPrivate: v === "private" })}
          options={[
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ]}
        />
        <p className="st-aside">
          {prefs.account.isPrivate ? <LockIcon /> : <GlobeIcon />}
          {prefs.account.isPrivate ? "Private account" : "Public account"}
        </p>
      </Block>

      <Block
        title="Gender on your profile"
        hint="Shown as a small male or female icon next to your name. Your default picture stays as it is; you can upload your own in Edit profile."
      >
        <Segmented
          label="Your gender"
          value={me.gender || ""}
          onChange={(gender) => saveIdentity({ gender })}
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ]}
        />
        <AudiencePicker
          label="Who can see your gender"
          value={prefs.account.genderAudience}
          onChange={(genderAudience) => update("account", { genderAudience })}
          paid={planRank(me.plan) > 0}
          upsell={false}
        />
      </Block>

      <Block
        title="Country on your profile"
        hint={
          me.country
            ? `The flag on your profile picture. We worked it out from where you signed up, which a VPN can throw off, so pick your real country if it’s wrong.`
            : "We couldn’t tell which country you signed up from, so there is no flag yet. Pick yours to add one."
        }
      >
        <Select
          label="Your country"
          value={me.country || ""}
          onChange={(country) => saveIdentity({ country })}
          options={countries}
          placeholder="Choose your country"
          searchable
          searchPlaceholder="Search countries"
        />
        {me.country && (
          <p className="st-aside">
            <Flag country={me.country} className="flg-inline" /> {countryName(me.country)}
          </p>
        )}
        <AudiencePicker
          label="Who can see your country"
          value={prefs.account.countryAudience}
          onChange={(countryAudience) => update("account", { countryAudience })}
          paid={planRank(me.plan) > 0}
        />
      </Block>

      <Block title="Sign-in">
        <dl className="st-facts">
          <div>
            <dt>Handle</dt>
            <dd>@{me.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{email || "Not available"}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>
              {getPlan(me.plan).name} · <Link href="/upgrade" className="st-link">Manage plan</Link>
            </dd>
          </div>
        </dl>
        <p className="st-hint">Your handle is how your posts and comments are tied to you, so it can’t be changed yet.</p>
        <PasswordForm />
      </Block>

      <Block title="Your data" hint="A JSON copy of your profile, settings and posts. Photos aren’t included.">
        <a className="st-btn ghost wide" href="/api/settings/export" download>
          <DownloadIcon /> Download my data
        </a>
      </Block>
    </>
  );
}

function PasswordForm() {
  const { notify } = useSettings();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setCurrent("");
    setNext("");
    setAgain("");
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (next.length < 6) return setError("Your new password needs at least 6 characters.");
    if (next !== again) return setError("The two new passwords don’t match.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn’t change your password.");
        return;
      }
      notify("Password changed");
      close();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="st-btn ghost wide" onClick={() => setOpen(true)}>
        Change password
      </button>
    );
  }

  return (
    <form className="st-subform" onSubmit={submit}>
      <label className="st-field">
        <span className="st-label">Current password</span>
        <input className="cmp-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="st-field">
        <span className="st-label">New password</span>
        <input className="cmp-input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="st-field">
        <span className="st-label">Repeat new password</span>
        <input className="cmp-input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
      </label>
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="st-actions">
        <button type="submit" className="st-btn primary" disabled={busy || !current || !next}>
          {busy ? "Changing..." : "Change password"}
        </button>
        <button type="button" className="st-btn ghost" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
}
