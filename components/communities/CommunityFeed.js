"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// The posts are part of the page's own scroll, so there is nothing to get stuck
// in and nothing to hunt for: the tab bar stays pinned, the round arrow button
// takes you to the top, and tapping "Posts" again does the same. Older posts
// load by themselves a little before you reach the bottom
// (/api/communities/posts), a page at a time, so a community with thousands of
// posts never sends them all at once, and posts far off-screen aren't drawn.
export default function CommunityFeed({ community: c, posts: first, more: firstMore, next: firstNext, viewer, status, readOnly }) {
  const router = useRouter();
  const staff = isStaff(viewer.role);
  const perms = c.permissions;
  const canImages = perms.images === "everyone" || (perms.images === "staff" && staff);
  const canLinks = perms.links === "everyone" || (perms.links === "staff" && staff);

  const [posts, setPosts] = useState(first);
  const [more, setMore] = useState(firstMore);
  const [next, setNext] = useState(firstNext);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [seen, setSeen] = useState(first);
  const busy = useRef(false); // set at once, so two triggers can't fetch the same page twice
  const end = useRef(null);

  // router.refresh() (after posting, deleting or pinning) hands us a fresh first
  // page: start again from it.
  if (seen !== first) {
    setSeen(first);
    setPosts(first);
    setMore(firstMore);
    setNext(firstNext);
    setLoadErr("");
  }

  const loadMore = useCallback(async () => {
    if (busy.current || !more || !next) return;
    busy.current = true;
    setLoading(true);
    setLoadErr("");
    try {
      const res = await fetch(`/api/communities/posts?communityId=${encodeURIComponent(c.id)}&before=${next}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn’t load more posts.");
      setPosts((cur) => {
        const have = new Set(cur.map((p) => p.id));
        return [...cur, ...j.posts.filter((p) => !have.has(p.id))];
      });
      setMore(!!j.more);
      setNext(j.next);
    } catch (e) {
      setLoadErr(e.message || "Couldn’t load more posts.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [c.id, more, next]);

  // Load the next page once the end of the list is within about a screen and a half.
  useEffect(() => {
    const el = end.current;
    if (!el || !more || loadErr || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loadErr, loadMore, posts.length]);

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

      <section className="gc-feedpanel" aria-label="Posts">
        <div className="gc-feedhead">
          <h2>Posts</h2>
          <span>{c.postCount} in total</span>
          <Link href={`/c/${c.slug}?tab=about`} scroll={false}>About &amp; rules</Link>
        </div>
        {posts.length === 0 ? (
          <div className="empty-feed gc-empty">
            <h2 className="empty-feed-title">Nothing posted yet</h2>
            <p className="empty-feed-sub">{status.ok ? "Break the ice. Share a theory, a screenshot or a question about GTA 6." : "Posts will show up here once the community gets going."}</p>
          </div>
        ) : (
          <>
            <ul className="gc-posts">
              {posts.map((p) => <Post key={p.id} p={p} c={c} viewer={viewer} staff={staff} readOnly={readOnly} refresh={() => router.refresh()} />)}
            </ul>
            <div className="gc-more" ref={end}>
              {more && !loadErr && loading && <span className="gc-spin" role="status" aria-label="Loading more posts" />}
              {loadErr && (
                <>
                  <p role="alert">{loadErr}</p>
                  <button type="button" className="gc-btn" onClick={loadMore}>Try again</button>
                </>
              )}
              {!more && posts.length > 6 && (
                <div className="gc-end">
                  <p>That’s every post so far.</p>
                  <button type="button" className="gc-btn" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>Back to top</button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Composer({ c, canImages, canLinks, imagesWhy, linksWhy, username, onPosted }) {
  const [text, setText] = useState("");
  const [flair, setFlair] = useState("discussion");
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false); // collapsed to one line until it's used
  const file = useRef();
  const flairs = FLAIRS.filter((f) => !(f.id === "leak" && c.permissions.leakPolicy === "banned"));
  const linkBlocked = !canLinks && hasLink(text);
  const empty = !text.trim() && images.length === 0;
  const expanded = open || !!text || images.length > 0;

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
      setText(""); setImages([]); setFlair("discussion"); setOpen(false);
      onPosted();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="gc-composer">
      <span className="gc-uav" style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}>{username?.[0]?.toUpperCase()}</span>
      <div className="gc-composer-main">
        <textarea className="gc-compose-input" rows={expanded ? (text ? 4 : 3) : 1} maxLength={LIMITS.post} value={text} onChange={(e) => setText(e.target.value)} onFocus={() => setOpen(true)}
          placeholder={`Post to ${c.name}…`} aria-label="Write a post" />
        {expanded && (
          <>
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
          </>
        )}
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
    <li className={`gc-post${p.pinned ? " pinned" : ""}${menu || confirm ? " menu-open" : ""}`}>
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
