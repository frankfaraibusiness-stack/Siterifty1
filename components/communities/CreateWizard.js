"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CommunityCard from "./CommunityCard";
import { CommunityIcon } from "./CommunityArt";
import { AccessForm, FocusForm, IdentityForm, LookForm, PermissionsForm, RulesForm } from "./CommunityForms";
import { communityApi } from "@/lib/community-client";
import {
  FIXED_RULE, LIMITS, emptyCommunityDraft, getCategory, getCommunityTheme, normalizeQuestions, normalizeRules, validateCommunity,
} from "@/lib/community-schema";

const DRAFT_KEY = "gta6fb-community-draft-v1";

const STEPS = [
  { label: "Focus", icon: "pin", title: "Pick your lane", sub: "Which corner of GTA 6 is this community for? Everything here stays on the game.", sections: ["focus"] },
  { label: "Name", icon: "crown", title: "Name your crew", sub: "The name, handle and pitch people see on your card and at the top of your page.", sections: ["identity"] },
  { label: "Look", icon: "camera", title: "Make it look like yours", sub: "Colours, a banner scene and an icon. Add your own artwork if you have it.", sections: ["look"] },
  { label: "Access", icon: "eye", title: "Decide who gets in", sub: "Open the doors to everyone, or review each person before they join.", sections: ["access"] },
  { label: "Rules", icon: "flame", title: "Set the house rules", sub: "Short and clear works best. Members agree to these before joining.", sections: ["rules"] },
  { label: "Controls", icon: "bolt", title: "Control the chat", sub: "Choose who can post, what they can post and how fast. You can change all of this later.", sections: [] },
  { label: "Launch", icon: "star", title: "Check it over and launch", sub: "Here’s how your community will look. Take a last look, then go live.", sections: [] },
];

export default function CreateWizard({ user, owned }) {
  const [d, setD] = useState(emptyCommunityDraft);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [pledge, setPledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverFields, setServerFields] = useState({});
  const [restore, setRestore] = useState(null);
  const [done, setDone] = useState(null);
  const top = useRef(null);
  const first = useRef(true);

  const set = (patch) => { setD((cur) => ({ ...cur, ...patch })); setServerFields({}); };
  const theme = getCommunityTheme(d.theme);
  const cat = getCategory(d.category);

  // Draft autosave (text only; artwork is too big for localStorage).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) { const s = JSON.parse(raw); if (s?.d && (s.d.name || s.d.category)) setRestore(s); }
    } catch {}
  }, []);
  useEffect(() => {
    if (done) return undefined;
    const t = setTimeout(() => {
      try {
        if (d.category || d.name) localStorage.setItem(DRAFT_KEY, JSON.stringify({ d: { ...d, avatar: null, banner: null }, step }));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [d, step, done]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
  }, [step, done]);

  const errors = useMemo(() => {
    const sections = STEPS[step].sections;
    const full = step === 6 ? ["focus", "identity", "look", "access", "rules"] : sections;
    return { ...validateCommunity({ ...d, slug: d.slug }, full), ...serverFields };
  }, [d, step, serverFields]);
  const blocked = Object.keys(errors).length > 0;

  function next() {
    if (blocked) {
      setShowErrors(true);
      requestAnimationFrame(() => document.querySelector("[data-error]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(6, s + 1));
  }
  function goto(i) { if (i <= step) { setShowErrors(false); setStep(i); } }

  async function launch() {
    if (!pledge) { setShowErrors(true); return; }
    if (blocked) { setShowErrors(true); return; }
    setBusy(true); setServerError("");
    try {
      const res = await communityApi("create", {
        draft: {
          ...d,
          questions: d.privacy === "private" ? normalizeQuestions(d.questions) : [],
          rules: normalizeRules(d.rules),
          pledge: true,
        },
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setDone(res);
    } catch (e) {
      setServerError(e.message);
      if (e.fields) {
        setServerFields(e.fields);
        if (e.fields.slug) setStep(1);
      }
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <main className="cmp gc-wizard" style={{ "--a": theme.a, "--b": theme.b }}>
        <div className="cmp-glow" aria-hidden="true" />
        <div className="cmp-done">
          <span className="cmp-done-ring"><CommunityIcon id={d.icon} size={36} /></span>
          <h1>{d.name} is live.</h1>
          <p>c/{done.slug} is open for business. Share the link, pin a welcome post and invite your first members.</p>
          <div className="cmp-done-actions">
            <Link className="cmp-btn primary" href={`/c/${done.slug}`}>Open your community</Link>
            <Link className="cmp-btn ghost" href={`/c/${done.slug}/manage`}>Admin controls</Link>
            <Link className="cmp-btn ghost" href="/communities">All communities</Link>
          </div>
        </div>
      </main>
    );
  }

  const view = {
    id: "preview", slug: d.slug, name: d.name, tagline: d.tagline, icon: d.icon, scene: d.scene, a: theme.a, b: theme.b,
    privacy: d.privacy, categoryLabel: cat?.label, memberCount: 1, postCount: 0, hasAvatar: false, hasBanner: false,
  };
  const S = STEPS[step];
  const p = d.permissions;
  const controlChips = [
    p.whoCanPost === "everyone" ? "Everyone can post" : p.whoCanPost === "mods" ? "Chat locked to mods & admins" : "Chat locked to admins",
    `Links: ${p.links === "everyone" ? "on" : p.links === "staff" ? "staff only" : "off"}`,
    `Images: ${p.images === "everyone" ? "on" : p.images === "staff" ? "staff only" : "off"}`,
    `Leaks: ${p.leakPolicy === "open" ? "allowed" : p.leakPolicy === "labelled" ? "covered" : "banned"}`,
    p.slowMode ? `Slow mode ${p.slowMode}s` : null,
    p.newMemberWait ? `${p.newMemberWait}h before new members post` : null,
  ].filter(Boolean);

  return (
    <main className="cmp gc-wizard" style={{ "--a": theme.a, "--b": theme.b }}>
      <div className="cmp-glow" aria-hidden="true" />
      <div ref={top} />
      <Link href="/communities" className="gc-back">← Communities</Link>
      <nav className="gc-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <button key={s.label} type="button" disabled={i > step} className={i < step ? "past" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined} onClick={() => goto(i)}>
            <i /><span>{s.label}</span>
          </button>
        ))}
      </nav>

      {restore && step === 0 && !d.name && !d.category && (
        <div className="cmp-restore" role="status">
          <span>You have an unfinished community draft{restore.d.name ? `: “${restore.d.name}”` : ""}.</span>
          <button type="button" className="cmp-mini solid" onClick={() => { setD({ ...emptyCommunityDraft(), ...restore.d, permissions: { ...emptyCommunityDraft().permissions, ...restore.d.permissions } }); setStep(Math.min(restore.step || 0, 5)); setRestore(null); }}>Restore draft</button>
          <button type="button" className="cmp-mini" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} setRestore(null); }}>Discard</button>
        </div>
      )}

      <div className="gc-layout">
        <section className="gc-step-main" key={step} aria-live="polite">
          <header className="cmp-hero">
            <span className="cmp-hero-ico"><CommunityIcon id={S.icon} size={24} /></span>
            <div><h2>{S.title}</h2><p>{S.sub}</p></div>
          </header>
          {owned >= LIMITS.owned && <p className="cmp-error banner">You already run {owned} communities, the maximum. Delete one to create another.</p>}

          {step === 0 && <FocusForm d={d} set={set} errors={showErrors ? errors : {}} />}
          {step === 1 && <IdentityForm d={d} set={set} errors={showErrors ? errors : {}} handleEditable />}
          {step === 2 && <LookForm d={d} set={set} errors={showErrors ? errors : {}} />}
          {step === 3 && <AccessForm d={d} set={set} errors={showErrors ? errors : {}} />}
          {step === 4 && <RulesForm d={d} set={set} errors={showErrors ? errors : {}} />}
          {step === 5 && <PermissionsForm d={d} set={set} />}
          {step === 6 && (
            <>
              <div className="cmp-card gc-review">
                {[
                  ["Focus", cat?.label, 0], ["Name", `${d.name} · c/${d.slug}`, 1], ["Look", `${theme.label} theme, ${d.avatar || d.banner ? "your artwork" : "banner scene"}`, 2],
                  ["Access", d.privacy === "public" ? "Public. Anyone can join and it’s listed in search." : `Private. ${normalizeQuestions(d.questions).length} join question${normalizeQuestions(d.questions).length === 1 ? "" : "s"}${d.listed ? ", listed in search" : ", hidden from search"}.`, 3],
                  ["Rules", `${1 + normalizeRules(d.rules).length} rules, starting with “${FIXED_RULE.title}”`, 4],
                ].map(([k, v, i]) => (
                  <div key={k} className="gc-review-row">
                    <span><b>{k}</b><small>{v}</small></span>
                    <button type="button" className="cmp-link" onClick={() => goto(i)}>Edit</button>
                  </div>
                ))}
                <div className="gc-review-row">
                  <span><b>Controls</b></span>
                  <button type="button" className="cmp-link" onClick={() => goto(5)}>Edit</button>
                </div>
                <ul className="cmp-summary">{controlChips.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
              <label className={`gc-pledge${showErrors && !pledge ? " bad" : ""}`}>
                <input type="checkbox" checked={pledge} onChange={(e) => setPledge(e.target.checked)} />
                <span><b>This community is only about GTA 6.</b> I’ll keep it on topic and moderate it fairly. Communities that drift off-topic can be removed.</span>
              </label>
              {showErrors && !pledge && <p className="cmp-error">Tick the box to confirm.</p>}
              {serverError && <p className="cmp-error banner" role="alert">{serverError}</p>}
            </>
          )}
        </section>

        <aside className="gc-aside" aria-label="Live preview">
          <h2>Live preview</h2>
          <CommunityCard community={view} preview avatarSrc={d.avatar} bannerSrc={d.banner} />
          {step >= 3 && (
            <p className="gc-aside-note">{d.privacy === "private" ? "Private: join requests wait for your approval." : "Public: people join instantly."}</p>
          )}
        </aside>
      </div>

      <div className="cmp-bar">
        <div className="cmp-bar-in">
          {step > 0 && <button type="button" className="cmp-btn ghost" onClick={() => goto(step - 1)}>Back</button>}
          {step < 6 ? (
            <button type="button" className="cmp-btn primary" onClick={next}>Continue</button>
          ) : (
            <button type="button" className="cmp-btn primary" disabled={busy || owned >= LIMITS.owned} onClick={launch}>{busy ? "Launching…" : "Launch community"}</button>
          )}
        </div>
        {showErrors && blocked && step < 6 && <p className="cmp-bar-hint" role="alert">{Object.values(errors)[0]}</p>}
        {showErrors && blocked && step === 6 && <p className="cmp-bar-hint" role="alert">Go back and fix: {Object.values(errors)[0]}</p>}
      </div>
    </main>
  );
}
