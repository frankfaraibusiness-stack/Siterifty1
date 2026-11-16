"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartIcon, ImageIcon, LockIcon, PinIcon, XIcon } from "@/components/icons";
import { compressImage } from "@/components/composer/imageTools";
import { communityApi } from "@/lib/community-client";
import { communityPostImageUrl } from "@/lib/media-url";
import { FLAIRS, LIMITS, ROLE_LABEL, URL_RE, hasLink, isStaff } from "@/lib/community-schema";

function Linkified({ text, links }) {
  if (links === "off") return text;
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(URL_RE.source, "gi"))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0].replace(/[.,!?)]+$/, "");
    parts.push(<a key={m.index} href={/^https?:/i.test(raw) ? raw : `https://${raw}`} target="_blank" rel="noopener noreferrer nofollow ugc">{raw}</a>);
    parts.push(m[0].slice(raw.length));
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export default function CommunityFeed({ community: c, posts, viewer, status, readOnly }) {
  const router = useRouter();
  const staff = isStaff(viewer.role);
  const perms = c.permissions;
  const canImages = perms.images === "everyone" || (perms.images === "staff" && staff);
  const canLinks = perms.links === "everyone" || (perms.links === "staff" && staff);

  return (
    <div className="gc-feed" style={{ "--a": c.a, "--b": c.b }}>
      {!readOnly && (status.ok ? (
        <Composer c={c} canImages={canImages} canLinks={canLinks} imagesWhy={perms.images === "off" ? "Images are off here" : "Images are staff only here"} linksWhy={perms.links === "off" ? "Links aren’t allowed here" : "Only staff can post links here"} username={viewer.username} onPosted={() => router.refresh()} />
      ) : (
        <div className={`gc-locked${status.locked ? " chat" : ""}`}>
          <span><LockIcon /></span>
          <div><b>{status.locked ? "Chat is locked" : "You can’t post yet"}</b><p>{status.reason}</p></div>
        </div>
      ))}
      {posts.length === 0 ? (
        <div className="empty-feed gc-empty">
          <h2 className="empty-feed-title">Nothing posted yet</h2>
          <p className="empty-feed-sub">{status.ok ? "Break the ice. Share a theory, a screenshot or a question about GTA 6." : "Posts will show up here once the community gets going."}</p>
        </div>
      ) : (
        <ul className="gc-posts">
          {posts.map((p) => <Post key={p.id} p={p} c={c} viewer={viewer} staff={staff} readOnly={readOnly} refresh={() => router.refresh()} />)}
        </ul>
      )}
    </div>
  );
}

function Composer({ c, canImages, canLinks, imagesWhy, linksWhy, username, onPosted }) {
  const [text, setText] = useState("");
  const [flair, setFlair] = useState("discussion");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef();
  const flairs = FLAIRS.filter((f) => !(f.id === "leak" && c.permissions.leakPolicy === "banned"));
  const linkBlocked = !canLinks && hasLink(text);
  const empty = !text.trim() && images.length === 0;

  async function add(files) {
    setError("");
    try {
      const room = LIMITS.postImages - images.length;
      const out = [];
      for (const f of [...files].slice(0, room)) out.push((await compressImage(f, { max: 1280, maxBytes: 300_000 })).data);
      setImages((cur) => [...cur, ...out]);
    } catch (e) { setError(e.message); }
  }
  async function submit() {
    setBusy(true); setError("");
    try {
      await communityApi("post", { communityId: c.id, text, flair, images });
      setText(""); setImages([]); setFlair("discussion");
      onPosted();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="gc-composer">
      <span className="gc-uav" style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}>{username?.[0]?.toUpperCase()}</span>
      <div className="gc-composer-main">
        <textarea className="gc-compose-input" rows={text ? 4 : 2} maxLength={LIMITS.post} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={`Post to ${c.name}…`} aria-label="Write a post" />
        {images.length > 0 && (
          <ul className="gc-thumbs">
            {images.map((src, i) => (
              <li key={i}><img src={src} alt="" /><button type="button" aria-label="Remove image" onClick={() => setImages(images.filter((_, j) => j !== i))}><XIcon /></button></li>
            ))}
          </ul>
        )}
        <div className="gc-flairs" role="radiogroup" aria-label="Flair">
          {flairs.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={flair === f.id} className={`gc-flair${flair === f.id ? " on" : ""} f-${f.id}`} onClick={() => setFlair(f.id)}>{f.label}</button>
          ))}
        </div>
        {flair === "leak" && c.permissions.leakPolicy === "labelled" && <p className="gc-hint">Leaks are covered in this community until a reader taps to reveal.</p>}
        {linkBlocked && <p className="gc-hint bad" role="alert">{linksWhy}. Remove the link to post.</p>}
        {error && <p className="gc-hint bad" role="alert">{error}</p>}
        <div className="gc-composer-bar">
          <button type="button" className="gc-tool" disabled={!canImages || images.length >= LIMITS.postImages} title={canImages ? "Add images" : imagesWhy} onClick={() => file.current.click()}>
            <ImageIcon /><span>{canImages ? "Photo" : imagesWhy}</span>
          </button>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          <span className="gc-count">{text.length}/{LIMITS.post}</span>
          <button type="button" className="gc-btn solid" disabled={busy || empty || linkBlocked} onClick={submit}>{busy ? "Posting…" : "Post"}</button>
        </div>
      </div>
    </div>
  );
}

function Post({ p, c, viewer, staff, readOnly, refresh }) {
  const covered = p.flair === "leak" && c.permissions.leakPolicy === "labelled";
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  const mine = viewer.uid === p.uid;
  const flair = FLAIRS.find((f) => f.id === p.flair);

  async function like() {
    if (!viewer.role || readOnly) return;
    const was = liked; setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    try { await communityApi("like-post", { communityId: c.id, postId: p.id }); } catch { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); }
  }
  async function act(action) {
    setErr("");
    try { await communityApi(action, { communityId: c.id, postId: p.id }); setMenu(false); setConfirm(false); refresh(); } catch (e) { setErr(e.message); }
  }
  return (
    <li className={`gc-post${p.pinned ? " pinned" : ""}`}>
      {p.pinned && <div className="gc-pinned"><PinIcon /> Pinned by the team</div>}
      <header>
        <span className="gc-uav" style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}>{p.user?.[0]?.toUpperCase()}</span>
        <div className="gc-post-who">
          <Link href={`/u/${p.user}`}>@{p.user}</Link>
          {p.role !== "member" && <em className={`gc-role ${p.role}`}>{ROLE_LABEL[p.role]}</em>}
          <small>{p.timeAgo}</small>
        </div>
        {flair && p.flair !== "discussion" && <span className={`gc-flair static f-${p.flair}`}>{flair.label}</span>}
        {!readOnly && (mine || staff) && (
          <span className="gc-menu-wrap">
            <button type="button" className="gc-dots" aria-label="Post options" aria-expanded={menu} onClick={() => { setMenu(!menu); setConfirm(false); }}>⋯</button>
            {menu && (
              <span className="gc-menu" role="menu">
                {staff && <button role="menuitem" onClick={() => act("pin-post")}>{p.pinned ? "Unpin post" : "Pin to top"}</button>}
                {confirm ? <button role="menuitem" className="danger" onClick={() => act("delete-post")}>Confirm delete</button> : <button role="menuitem" className="danger" onClick={() => setConfirm(true)}>Delete post</button>}
              </span>
            )}
          </span>
        )}
      </header>
      <div className={`gc-post-body${covered && !revealed ? " covered" : ""}`}>
        {p.text && <p className="gc-post-text"><Linkified text={p.text} links={c.permissions.links} /></p>}
        {p.imageCount > 0 && (
          <div className={`gc-post-imgs n${p.imageCount}`}>
            {Array.from({ length: p.imageCount }, (_, n) => <img key={n} loading="lazy" src={communityPostImageUrl(c.id, p.id, n)} alt="" />)}
          </div>
        )}
        {covered && !revealed && (
          <button type="button" className="gc-cover" onClick={() => setRevealed(true)}>
            <b>Leak</b><span>Tap to reveal. Could spoil things you haven’t seen.</span>
          </button>
        )}
      </div>
      {err && <p className="gc-hint bad" role="alert">{err}</p>}
      <footer>
        <button type="button" className={`gc-like${liked ? " on" : ""}`} onClick={like} disabled={!viewer.role || readOnly} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"}>
          <HeartIcon /><span>{likes}</span>
        </button>
      </footer>
    </li>
  );
}
