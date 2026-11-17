"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccessForm, FocusForm, IdentityForm, LookForm, PermissionsForm, RulesForm } from "./CommunityForms";
import { CommunityAvatar, CommunityIcon } from "./CommunityArt";
import CopyLink from "./CopyLink";
import { SearchIcon } from "@/components/icons";
import { Toggle } from "@/components/composer/ui";
import { communityApi } from "@/lib/community-client";
import { LIMITS, ROLE_LABEL, roleRank, validateCommunity } from "@/lib/community-schema";

const ALL_TABS = [
  ["overview", "Overview", 3], ["profile", "Profile", 3], ["look", "Look", 3], ["access", "Access", 3],
  ["rules", "Rules", 3], ["controls", "Controls", 3], ["people", "People", 2], ["requests", "Requests", 2], ["danger", "Danger zone", 4],
];

export default function ManagePanel({ community: c, role, uid, members, requests, bans, initialTab }) {
  const router = useRouter();
  const rank = roleRank(role);
  const tabs = ALL_TABS.filter(([, , min]) => rank >= min);
  const first = rank >= 3 ? "overview" : "people";
  const [tab, setTab] = useState(tabs.some(([id]) => id === initialTab) ? initialTab : first);

  return (
    <main className="gc-wrap gc-manage" style={{ "--a": c.a, "--b": c.b }}>
      <Link href={`/c/${c.slug}`} className="gc-back">← Back to {c.name}</Link>
      <header className="gc-manage-head">
        <CommunityAvatar community={c} size={56} />
        <div><h1>Admin controls</h1><p>{c.name} · c/{c.slug} · you are {role === "owner" ? "the owner" : `an ${ROLE_LABEL[role].toLowerCase()}`}</p></div>
      </header>
      <div className="gc-manage-grid">
        <nav className="gc-manage-nav" aria-label="Admin sections">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={`${tab === id ? "on" : ""}${id === "danger" ? " danger" : ""}`} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
              {label}{id === "requests" && requests.length > 0 && <em>{requests.length}</em>}
            </button>
          ))}
        </nav>
        <section className="gc-manage-body" key={tab}>
          {tab === "overview" && <Overview c={c} members={members} requests={requests} go={setTab} refresh={() => router.refresh()} />}
          {tab === "profile" && <SectionForm c={c} section="profile" sections={["focus", "identity"]} init={{ category: c.category, tags: c.tags, name: c.name, slug: c.slug, tagline: c.tagline, description: c.description }} render={(p) => <><FocusForm {...p} /><IdentityForm {...p} /></>} />}
          {tab === "look" && <SectionForm c={c} section="look" sections={["look"]} init={{ theme: c.theme, scene: c.scene, icon: c.icon, avatar: undefined, banner: undefined }} render={(p) => <LookForm {...p} existing={c} />} />}
          {tab === "access" && <SectionForm c={c} section="access" sections={["access"]} init={{ privacy: c.privacy, listed: c.listed, questions: c.questions.map(({ text, required }) => ({ text, required })) }} render={(p) => <AccessForm {...p} />} note={requests.length > 0 ? `${requests.length} request${requests.length === 1 ? "" : "s"} are waiting. Changing access won’t clear them.` : null} />}
          {tab === "rules" && <SectionForm c={c} section="rules" sections={["rules"]} init={{ rules: c.rules }} render={(p) => <RulesForm {...p} />} />}
          {tab === "controls" && <SectionForm c={c} section="permissions" sections={[]} init={{ permissions: c.permissions }} payload={(d) => d.permissions} render={(p) => <PermissionsForm {...p} />} />}
          {tab === "people" && <People c={c} role={role} uid={uid} members={members} bans={bans} />}
          {tab === "requests" && <Requests c={c} requests={requests} role={role} />}
          {tab === "danger" && <Danger c={c} members={members} uid={uid} />}
        </section>
      </div>
    </main>
  );
}

// One settings section: local draft, validate, save.
function SectionForm({ c, section, sections, init, render, note, payload }) {
  const router = useRouter();
  const [d, setD] = useState(init);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [show, setShow] = useState(false);
  const errors = useMemo(() => validateCommunity({ ...d, slug: undefined }, sections), [d, sections]);
  const set = (patch) => { setD((x) => ({ ...x, ...patch })); setMsg(null); };

  async function save() {
    if (Object.keys(errors).length) { setShow(true); return; }
    setBusy(true); setMsg(null);
    try {
      await communityApi("update", { communityId: c.id, section, data: payload ? payload(d) : d });
      setMsg({ ok: true, text: "Saved. Changes are live." }); setShow(false);
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: e.message }); } finally { setBusy(false); }
  }
  return (
    <>
      {render({ d, set, errors: show ? errors : {} })}
      {note && <p className="cmp-note">{note}</p>}
      <div className="gc-savebar">
        <button type="button" className="gc-btn solid big" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
        {msg && <span className={`gc-save-msg ${msg.ok ? "ok" : "bad"}`} role="status">{msg.text}</span>}
        {show && Object.keys(errors).length > 0 && <span className="gc-save-msg bad" role="alert">{Object.values(errors)[0]}</span>}
      </div>
    </>
  );
}

function Overview({ c, members, requests, go, refresh }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const locked = c.permissions.whoCanPost !== "everyone";
  const staffN = members.filter((m) => roleRank(m.role) >= 2).length;
  async function toggleLock(on) {
    setBusy(true); setErr("");
    try { await communityApi("update", { communityId: c.id, section: "permissions", data: { ...c.permissions, whoCanPost: on ? "mods" : "everyone" } }); refresh(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const checks = [
    [c.hasAvatar || c.hasBanner, "Add your own artwork", "look"],
    [c.rules.length >= 2, "Write at least two rules of your own", "rules"],
    [c.privacy === "public" || c.questions.length >= 2, c.privacy === "private" ? "Ask two or more join questions" : "Public communities need no questions", "access"],
    [staffN >= 2, "Add a second moderator or admin", "people"],
    [c.postCount > 0, "Make the first post", null],
  ];
  return (
    <>
      <div className="gc-stats">
        <div><b>{c.memberCount}</b><span>Members</span></div>
        <div><b>{c.postCount}</b><span>Posts</span></div>
        <button type="button" onClick={() => go("requests")} className={requests.length ? "alert" : ""}><b>{requests.length}</b><span>Requests waiting</span></button>
        <div><b>{staffN}</b><span>Admins & mods</span></div>
      </div>
      <div className="cmp-card tight">
        <Toggle label="Lock chat" checked={locked} disabled={busy} onChange={toggleLock}
          hint={locked ? "Only admins and moderators can post right now. Everyone else can read and react." : "Everyone allowed by your permissions can post. Flip this on during a raid or a trailer drop."} />
        {err && <p className="cmp-error">{err}</p>}
      </div>
      <div className="cmp-card">
        <h3>Invite people</h3>
        <p className="cmp-hint">{c.privacy === "private" ? "People who open this link can request to join. You approve each one." : "Anyone with this link can join in one tap."}</p>
        <div className="gc-linkrow"><code>/c/{c.slug}</code><CopyLink slug={c.slug} /></div>
      </div>
      <div className="cmp-card">
        <h3>Setup checklist</h3>
        <ul className="gc-checks">
          {checks.map(([done, label, to]) => (
            <li key={label} className={done ? "done" : ""}>
              <span aria-hidden="true">{done ? "✓" : ""}</span>{label}
              {!done && to && <button type="button" className="cmp-link" onClick={() => go(to)}>Open</button>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function People({ c, role, uid, members, bans }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const rank = roleRank(role);
  const list = members.filter((m) => m.username.toLowerCase().includes(q.trim().replace(/^@/, "").toLowerCase()));

  async function run(action, payload, key) {
    setBusy(key); setErr("");
    try { await communityApi(action, { communityId: c.id, ...payload }); setOpen(null); router.refresh(); }
    catch (e) { setErr(e.message); } finally { setBusy(""); }
  }
  const roleOpts = (m) => {
    const out = [];
    if (role === "owner") { if (m.role !== "admin") out.push(["admin", "Make admin"]); }
    if (rank >= 3 && m.role !== "mod") out.push(["mod", "Make moderator"]);
    if (rank >= 3 && m.role !== "member") out.push(["member", "Make regular member"]);
    return out;
  };
  return (
    <>
      <p className="cmp-hint" style={{ marginTop: 0 }}>
        {rank >= 3 ? "Search for a member, then promote them to moderator or admin, or remove them." : "You can remove and ban regular members. Admins handle roles."}
      </p>
      <label className="gc-find"><SearchIcon /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a member by username" aria-label="Find a member" /></label>
      {err && <p className="cmp-error banner" role="alert">{err}</p>}
      <ul className="gc-people">
        {list.map((m) => {
          const canAct = m.uid !== uid && roleRank(m.role) < rank;
          return (
            <li key={m.uid} className={open === m.uid ? "open" : ""}>
              <div className="gc-person">
                <span className="gc-uav" style={{ background: `linear-gradient(135deg, ${m.a || c.a}, ${m.b || c.b})` }}>{m.username[0].toUpperCase()}</span>
                <Link href={`/u/${m.username}`}>@{m.username}{m.uid === uid ? " (you)" : ""}</Link>
                <em className={`gc-role ${m.role}`}>{ROLE_LABEL[m.role]}</em>
                {canAct && <button type="button" className="cmp-mini" aria-expanded={open === m.uid} onClick={() => setOpen(open === m.uid ? null : m.uid)}>Manage</button>}
              </div>
              {open === m.uid && (
                <div className="gc-person-actions">
                  {roleOpts(m).map(([r, label]) => <button key={r} type="button" className="cmp-chip" disabled={!!busy} onClick={() => run("set-role", { uid: m.uid, role: r }, m.uid + r)}>{busy === m.uid + r ? "Saving…" : label}</button>)}
                  <button type="button" className="cmp-chip warn" disabled={!!busy} onClick={() => run("remove", { uid: m.uid }, m.uid + "rm")}>Remove</button>
                  <button type="button" className="cmp-chip warn" disabled={!!busy} onClick={() => run("remove", { uid: m.uid, ban: true }, m.uid + "ban")}>Remove & ban</button>
                </div>
              )}
            </li>
          );
        })}
        {list.length === 0 && <li className="gc-none">No members match “{q}”.</li>}
      </ul>
      {bans.length > 0 && (
        <div className="cmp-card">
          <h3>Banned ({bans.length})</h3>
          <ul className="gc-people flat">
            {bans.map((b) => (
              <li key={b.uid}><div className="gc-person"><span>@{b.username}</span>{rank >= 3 && <button type="button" className="cmp-mini" disabled={!!busy} onClick={() => run("unban", { uid: b.uid }, b.uid)}>Lift ban</button>}</div></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Requests({ c, requests, role }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const allowed = roleRank(role) >= 3 || c.permissions.modsCanApprove;
  async function run(action, uid) {
    setBusy(uid + action); setErr("");
    try { await communityApi(action, { communityId: c.id, uid }); router.refresh(); }
    catch (e) { setErr(e.message); } finally { setBusy(""); }
  }
  if (c.privacy === "public" && requests.length === 0) {
    return <div className="cmp-note">This community is public, so nobody needs approval. Switch to private in Access if you want to review people first.</div>;
  }
  if (!allowed) return <div className="cmp-note">Admins have turned off request approvals for moderators.</div>;
  if (requests.length === 0) {
    return <div className="empty-feed gc-empty"><h2 className="empty-feed-title">No one is waiting</h2><p className="empty-feed-sub">New requests show up here with the answers people gave.</p></div>;
  }
  return (
    <>
      {err && <p className="cmp-error banner" role="alert">{err}</p>}
      <ul className="gc-reqs">
        {requests.map((r) => (
          <li key={r.uid} className="cmp-card">
            <div className="gc-req-head"><Link href={`/u/${r.username}`}>@{r.username}</Link><small>{r.ago} ago</small></div>
            {r.answers.map((a, i) => <div key={i} className="gc-qa"><b>{a.q}</b><p>{a.a || "No answer."}</p></div>)}
            <div className="gc-req-actions">
              <button type="button" className="gc-btn solid" disabled={!!busy} onClick={() => run("approve", r.uid)}>{busy === r.uid + "approve" ? "Approving…" : "Approve"}</button>
              <button type="button" className="gc-btn ghost" disabled={!!busy} onClick={() => run("decline", r.uid)}>{busy === r.uid + "decline" ? "Declining…" : "Decline"}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Danger({ c, members, uid }) {
  const router = useRouter();
  const [newOwner, setNewOwner] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const others = members.filter((m) => m.uid !== uid);
  async function run(action, payload, done) {
    setBusy(action); setErr("");
    try { await communityApi(action, { communityId: c.id, ...payload }); done(); } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }
  return (
    <>
      {err && <p className="cmp-error banner" role="alert">{err}</p>}
      <div className="cmp-card gc-danger">
        <h3>Transfer ownership</h3>
        <p className="cmp-hint">The new owner gets full control. You become an admin. Pick someone you trust.</p>
        <select className="cmp-input" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} aria-label="New owner">
          <option value="">Choose a member…</option>
          {others.map((m) => <option key={m.uid} value={m.uid}>@{m.username} ({ROLE_LABEL[m.role]})</option>)}
        </select>
        <button type="button" className="gc-btn danger" disabled={!newOwner || !!busy} onClick={() => run("transfer-owner", { uid: newOwner }, () => router.push(`/c/${c.slug}`))}>{busy === "transfer-owner" ? "Transferring…" : "Transfer ownership"}</button>
      </div>
      <div className="cmp-card gc-danger">
        <h3>Delete this community</h3>
        <p className="cmp-hint">This removes the community, every post, and all members at once. It can’t be undone. Type <b>{c.slug}</b> to confirm.</p>
        <input className="cmp-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={c.slug} aria-label="Type the handle to confirm" />
        <button type="button" className="gc-btn danger" disabled={confirm.toLowerCase() !== c.slug || !!busy} onClick={() => run("delete-community", { confirm }, () => router.push("/communities"))}>{busy === "delete-community" ? "Deleting…" : "Delete community"}</button>
      </div>
    </>
  );
}
