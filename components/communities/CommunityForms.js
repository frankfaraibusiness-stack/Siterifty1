"use client";

import { useEffect, useRef, useState } from "react";
import { Field, Segmented, TagPicker, TextInput, Toggle } from "@/components/composer/ui";
import { BannerScene, CommunityIcon, CommunityAvatar, CommunityBanner } from "./CommunityArt";
import CountryPicker from "./CountryPicker";
import { LockIcon, EyeIcon, XIcon } from "@/components/icons";
import { communityApi } from "@/lib/community-client";
import { resizeImage } from "@/lib/image-resize";
import {
  CATEGORIES, COMMUNITY_THEMES, FIXED_RULE, ICON_IDS, LIMITS, QUESTION_PRESETS, RULE_PRESETS, SCENES, slugify,
} from "@/lib/community-schema";

// Every form takes { d, set, errors } where d is the draft, set(patch) merges
// into it. The create wizard and the manage panel share these, so what you
// set up on day one is exactly what you can change later.

// ---- Focus: which part of GTA 6 -------------------------------------------
export function FocusForm({ d, set, errors = {} }) {
  return (
    <>
      <div className="gc-lane-note">
        <span className="gc-lane-ico"><CommunityIcon id="pin" size={18} /></span>
        <p><b>Every community here is about GTA 6.</b> Pick the part of the game yours lives in. You can’t create a general-gaming or off-topic space.</p>
      </div>
      <Field label="What’s it about?" error={errors.category}>
        <div className="gc-cat-grid" role="radiogroup" aria-label="Focus">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={d.category === c.id} className={`gc-cat${d.category === c.id ? " on" : ""}`}
              style={{ "--a": c.a, "--b": c.b }} onClick={() => set({ category: c.id })}>
              <span className="gc-cat-ico"><CommunityIcon id={c.icon} size={20} /></span>
              <b>{c.label}</b>
              <small>{c.blurb}</small>
            </button>
          ))}
        </div>
      </Field>
      <TagPicker tags={d.tags} onChange={(tags) => set({ tags })} error={errors.tags} />
    </>
  );
}

// ---- Identity: name, handle, tagline, about -------------------------------
export function IdentityForm({ d, set, errors = {}, handleEditable }) {
  const [avail, setAvail] = useState(null); // null | "checking" | true | false
  const timer = useRef();
  useEffect(() => {
    if (!handleEditable) return undefined;
    clearTimeout(timer.current);
    if (d.slug.length < LIMITS.slugMin || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) { setAvail(null); return undefined; }
    setAvail("checking");
    let live = true;
    timer.current = setTimeout(async () => {
      try { const r = await communityApi("check-slug", { slug: d.slug }); if (live) setAvail(r.available); } catch { if (live) setAvail(null); }
    }, 450);
    return () => { live = false; clearTimeout(timer.current); };
  }, [d.slug, handleEditable]);

  return (
    <>
      <TextInput label="Community name" value={d.name} max={LIMITS.name} error={errors.name} placeholder="e.g. Vice City Spotters"
        onChange={(name) => set(d.slugTouched || !handleEditable ? { name } : { name, slug: slugify(name) })} />
      {handleEditable ? (
        <Field label="Handle" count={d.slug.length} max={LIMITS.slug} error={errors.slug}
          hint={avail === true ? "Available. This becomes your community link and can’t be changed later." : avail === false ? undefined : "This becomes your community link and can’t be changed later."}>
          <div className="gc-handle">
            <span>c/</span>
            <input className="cmp-input" value={d.slug} maxLength={LIMITS.slug} aria-label="Handle" aria-invalid={!!errors.slug}
              onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""), slugTouched: true })} />
            <em className={`gc-avail ${avail === true ? "ok" : avail === false ? "bad" : ""}`}>
              {avail === "checking" ? "Checking…" : avail === true ? "Free" : avail === false ? "Taken" : ""}
            </em>
          </div>
        </Field>
      ) : (
        <Field label="Handle" hint="Handles are permanent so links never break."><div className="gc-handle fixed"><span>c/</span><b>{d.slug}</b></div></Field>
      )}
      <TextInput label="Tagline" value={d.tagline} max={LIMITS.tagline} error={errors.tagline} placeholder="One line that shows on the card" onChange={(tagline) => set({ tagline })} />
      <TextInput label="About" multiline rows={5} value={d.description} max={LIMITS.description} error={errors.description}
        placeholder="What will people find here? What kind of posts do you want? Who is it for?" onChange={(description) => set({ description })} />
    </>
  );
}

// ---- Look: colours, banner scene, icon, uploads ---------------------------
function Upload({ label, hint, value, onPick, onClear, accept = "image/*" }) {
  const input = useRef();
  const [err, setErr] = useState("");
  return (
    <div className="gc-upload">
      <div><b>{label}</b><small>{hint}</small>{err && <small className="bad">{err}</small>}</div>
      <div className="gc-upload-btns">
        <button type="button" className="cmp-mini" onClick={() => input.current.click()}>{value ? "Replace" : "Upload"}</button>
        {value && <button type="button" className="cmp-mini" onClick={onClear}>Remove</button>}
      </div>
      <input ref={input} type="file" accept={accept} hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return; setErr("");
        try { await onPick(f); } catch (x) { setErr(x.message); }
      }} />
    </div>
  );
}

export function LookForm({ d, set, errors = {}, existing }) {
  const theme = COMMUNITY_THEMES.find((t) => t.id === d.theme) || COMMUNITY_THEMES[0];
  const url = (kind) => (existing?.[kind === "avatar" ? "hasAvatar" : "hasBanner"] ? `/cmedia/${existing.id}/${kind}?v=${existing.assetsV}` : null);
  const avatarSrc = d.avatar === undefined ? url("avatar") : d.avatar;
  const bannerSrc = d.banner === undefined ? url("banner") : d.banner;
  const view = { ...d, a: theme.a, b: theme.b, hasAvatar: false, hasBanner: false };
  return (
    <>
      <div className="gc-look-preview" style={{ "--a": theme.a, "--b": theme.b }}>
        <CommunityBanner community={view} bannerSrc={bannerSrc} />
        <span className="gc-look-avatar"><CommunityAvatar community={view} avatarSrc={avatarSrc} size={72} /></span>
      </div>
      <div className={`cmp-card gc-icon-req${errors.avatar ? " has-error" : ""}`} data-error={errors.avatar ? "1" : undefined}>
        <h3>Community icon <em className="gc-req">Required</em></h3>
        <Upload label="Upload your icon" hint="Square works best, we crop it for you. It’s the picture on your card, your page and in search." value={avatarSrc}
          onPick={async (f) => set({ avatar: await resizeImage(f, { width: 256, height: 256 }) })} onClear={() => set({ avatar: null })} />
        {errors.avatar && <p className="cmp-error" role="alert">{errors.avatar}</p>}
      </div>
      <Field label="Colour theme" error={errors.theme}>
        <div className="gc-swatches" role="radiogroup" aria-label="Colour theme">
          {COMMUNITY_THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={d.theme === t.id} className={d.theme === t.id ? "on" : ""} onClick={() => set({ theme: t.id })}>
              <i style={{ background: `linear-gradient(135deg, ${t.a}, ${t.b})` }} />{t.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Banner scene" error={errors.scene} hint="Shown when you haven’t uploaded your own banner.">
        <div className="gc-scenes" role="radiogroup" aria-label="Banner scene">
          {SCENES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={d.scene === s.id} className={d.scene === s.id ? "on" : ""} onClick={() => set({ scene: s.id })}>
              <span><BannerScene scene={s.id} a={theme.a} b={theme.b} /></span>{s.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Topic symbol" error={errors.icon} hint="A small symbol that sits next to your topic on cards and in search.">
        <div className="gc-icons" role="radiogroup" aria-label="Icon">
          {ICON_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={d.icon === id} aria-label={id} className={d.icon === id ? "on" : ""} onClick={() => set({ icon: id })}>
              <CommunityIcon id={id} size={22} />
            </button>
          ))}
        </div>
      </Field>
      <div className="cmp-card">
        <h3>Your own banner (optional)</h3>
        <Upload label="Banner" hint="A wide image, 4:1. Trailer frames and fan art look great." value={bannerSrc}
          onPick={async (f) => set({ banner: await resizeImage(f, { width: 1200, height: 300, quality: 0.8 }) })} onClear={() => set({ banner: null })} />
      </div>
    </>
  );
}

// ---- Access: public vs private + application questions --------------------
export function AccessForm({ d, set, errors = {} }) {
  const qs = d.questions;
  const setQ = (i, patch) => set({ questions: qs.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const addQ = (text = "") => qs.length < LIMITS.questions && set({ questions: [...qs, { text, required: true }] });
  return (
    <>
      <Field label="Who can join?" error={errors.privacy}>
        <div className="gc-choices" role="radiogroup" aria-label="Privacy">
          <button type="button" role="radio" aria-checked={d.privacy === "public"} className={`gc-choice${d.privacy === "public" ? " on" : ""}`} onClick={() => set({ privacy: "public" })}>
            <span className="gc-choice-ico"><EyeIcon /></span>
            <b>Public</b>
            <small>Anyone can join with one tap and read everything. Always shown in search and the communities feed.</small>
          </button>
          <button type="button" role="radio" aria-checked={d.privacy === "private"} className={`gc-choice${d.privacy === "private" ? " on" : ""}`} onClick={() => set({ privacy: "private" })}>
            <span className="gc-choice-ico"><LockIcon /></span>
            <b>Private</b>
            <small>People request to join and answer your questions. Only members see posts and the member list.</small>
          </button>
        </div>
      </Field>

      {d.privacy === "private" && (
        <>
          <div className="cmp-card tight">
            <Toggle label="Show in search and the feed" checked={d.listed} onChange={(listed) => set({ listed })}
              hint={d.listed ? "Anyone can find your card and request to join. Posts stay hidden." : "Hidden. People can only request to join if you send them the link."} />
          </div>
          <Field label="Questions for people who ask to join" count={qs.length} max={LIMITS.questions} error={errors.questions}
            hint="Applicants answer these before an admin sees their request. Good ones weed out spam and off-topic accounts.">
            <ul className="gc-qlist">
              {qs.map((q, i) => (
                <li key={i}>
                  <span className="gc-qn">{i + 1}</span>
                  <div>
                    <input className="cmp-input" value={q.text} maxLength={LIMITS.question} placeholder="Ask something…" aria-label={`Question ${i + 1}`} onChange={(e) => setQ(i, { text: e.target.value })} />
                    <label className="gc-check small"><input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /><span>Required</span></label>
                  </div>
                  <button type="button" className="gc-x" aria-label={`Remove question ${i + 1}`} onClick={() => set({ questions: qs.filter((_, j) => j !== i) })}><XIcon /></button>
                </li>
              ))}
            </ul>
            {qs.length < LIMITS.questions && <button type="button" className="cmp-add" onClick={() => addQ()}>+ Add your own question</button>}
            <div className="cmp-chips">
              {QUESTION_PRESETS.filter((p) => !qs.some((q) => q.text === p)).map((p) => (
                <button key={p} type="button" className="cmp-chip" disabled={qs.length >= LIMITS.questions} onClick={() => addQ(p)}>{p}</button>
              ))}
            </div>
          </Field>
        </>
      )}

      <Field label="Where can people join from?" error={errors.countries}
        hint={d.countryMode === "restricted" ? "Only people whose account country is on this list can join. Current members stay in if you change it." : "Anyone, anywhere. You can limit it to chosen countries instead."}>
        <Segmented value={d.countryMode || "worldwide"} onChange={(countryMode) => set({ countryMode })}
          options={[{ value: "worldwide", label: "Worldwide" }, { value: "restricted", label: "Specific countries" }]} />
        {d.countryMode === "restricted" && <CountryPicker value={d.countries || []} onChange={(countries) => set({ countries })} />}
      </Field>

      <div className="cmp-note">
        {d.privacy === "public"
          ? "Public communities grow fastest. You can still lock chat, block links and images, and remove people at any time."
          : "Private suits crews and small circles. Requests land in your Requests tab where you can approve or decline each one."}
      </div>
    </>
  );
}

// ---- Rules -----------------------------------------------------------------
export function RulesForm({ d, set, errors = {} }) {
  const rules = d.rules;
  const setR = (i, patch) => set({ rules: rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const move = (i, dir) => { const n = [...rules]; const j = i + dir; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; set({ rules: n }); };
  const add = (r = { title: "", body: "" }) => rules.length < LIMITS.rules && set({ rules: [...rules, r] });
  return (
    <>
      <p className="cmp-hint" style={{ marginTop: 0, marginBottom: 14 }}>Rules show on your community page and in the join request. Members see them before they join.</p>
      <ol className="gc-rules">
        <li className="fixed">
          <span className="gc-rn"><LockIcon /></span>
          <div><b>{FIXED_RULE.title}</b><small>{FIXED_RULE.body}</small><em>Always on. This is what makes the place work.</em></div>
        </li>
        {rules.map((r, i) => (
          <li key={i}>
            <span className="gc-rn">{i + 2}</span>
            <div>
              <input className="cmp-input" value={r.title} maxLength={LIMITS.ruleTitle} placeholder="Rule title" aria-label={`Rule ${i + 2} title`} onChange={(e) => setR(i, { title: e.target.value })} />
              <input className="cmp-input slim" value={r.body} maxLength={LIMITS.ruleBody} placeholder="Explain it in a sentence (optional)" aria-label={`Rule ${i + 2} details`} onChange={(e) => setR(i, { body: e.target.value })} />
            </div>
            <span className="gc-rule-tools">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" aria-label="Move down" disabled={i === rules.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" aria-label="Remove rule" onClick={() => set({ rules: rules.filter((_, j) => j !== i) })}><XIcon /></button>
            </span>
          </li>
        ))}
      </ol>
      {errors.rules && <p className="cmp-error">{errors.rules}</p>}
      {rules.length < LIMITS.rules && <button type="button" className="cmp-add" onClick={() => add()}>+ Write a rule</button>}
      <Field label="Quick add">
        <div className="cmp-chips" style={{ marginTop: 0 }}>
          {RULE_PRESETS.filter((p) => !rules.some((r) => r.title === p.title)).map((p) => (
            <button key={p.title} type="button" className="cmp-chip" disabled={rules.length >= LIMITS.rules} onClick={() => add({ ...p })}>{p.title}</button>
          ))}
        </div>
      </Field>
    </>
  );
}

// ---- Permissions: chat lock, links, images, leaks, slow mode ---------------
const secs = (n) => (n === 0 ? "Off" : n < 60 ? `${n}s` : `${n / 60}m`);
export function PermissionsForm({ d, set }) {
  const p = d.permissions;
  const up = (patch) => set({ permissions: { ...p, ...patch } });
  const staffOpts = [{ value: "everyone", label: "Everyone" }, { value: "staff", label: "Staff only" }, { value: "off", label: "Nobody" }];
  return (
    <>
      <div className="cmp-card">
        <h3>Who can post</h3>
        <p className="cmp-hint">Lock chat any time to stop everyone except the people you choose from posting. Members can still read and react.</p>
        <Segmented value={p.whoCanPost} onChange={(whoCanPost) => up({ whoCanPost })}
          options={[{ value: "everyone", label: "Everyone" }, { value: "mods", label: "Mods & admins" }, { value: "admins", label: "Admins only" }]} />
        {p.whoCanPost !== "everyone" && <p className="gc-lock-flag"><LockIcon /> Chat is locked for regular members.</p>}
      </div>
      <div className="cmp-card">
        <h3>Links and images</h3>
        <p className="cmp-hint">Staff means moderators and admins. Blocked links and images are rejected when someone tries to post.</p>
        <div className="gc-two">
          <Segmented label="Links" value={p.links} onChange={(links) => up({ links })} options={staffOpts} />
          <Segmented label="Images" value={p.images} onChange={(images) => up({ images })} options={staffOpts} />
        </div>
      </div>
      <div className="cmp-card">
        <h3>Leaks and spoilers</h3>
        <p className="cmp-hint">
          {p.leakPolicy === "open" ? "Leak posts show like any other post." : p.leakPolicy === "labelled" ? "Posts flaired Leak are covered until someone taps to reveal them." : "The Leak flair is switched off. Nobody can post it."}
        </p>
        <Segmented value={p.leakPolicy} onChange={(leakPolicy) => up({ leakPolicy })}
          options={[{ value: "open", label: "Allowed" }, { value: "labelled", label: "Covered" }, { value: "banned", label: "Banned" }]} />
      </div>
      <div className="cmp-card">
        <h3>Slow it down</h3>
        <p className="cmp-hint">Staff are never slowed. Useful when a trailer drops and everyone posts at once.</p>
        <Segmented label="Slow mode" value={p.slowMode} onChange={(slowMode) => up({ slowMode })} options={[0, 10, 30, 60, 300].map((v) => ({ value: v, label: secs(v) }))} />
        <Segmented label="New members can post after" value={p.newMemberWait} onChange={(newMemberWait) => up({ newMemberWait })}
          options={[0, 1, 24, 72].map((v) => ({ value: v, label: v === 0 ? "Right away" : v < 24 ? `${v} hour` : `${v / 24} day${v > 24 ? "s" : ""}` }))} />
      </div>
      <div className="cmp-card tight">
        <Toggle label="Moderators can approve requests" hint="Only matters for private communities." checked={p.modsCanApprove} onChange={(modsCanApprove) => up({ modsCanApprove })} />
        <Toggle label="Show the member list" hint="When off, only staff can see who’s in." checked={p.showMembers} onChange={(showMembers) => up({ showMembers })} />
      </div>
    </>
  );
}
