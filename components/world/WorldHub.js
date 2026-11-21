"use client";
import { useMemo, useState } from "react";
import Select from "@/components/ui/Select";

const TABS = [["map", "Map discoveries"], ["characters", "Characters"], ["vehicles", "Vehicle spotter"], ["trailers", "Trailer frames"], ["wishlist", "Wishlists"], ["predictions", "Predictions"]];
const AREAS = ["Vice City", "Port Gellhorn", "Ambrosia", "Mount Kalaga", "Grassrivers", "Leonida Keys", "Other Leonida"];
const CHARACTERS = [{ id: "lucia", name: "Lucia Caminos", role: "One of the central characters", art: "LUCIA", tone: "pink" }, { id: "jason", name: "Jason Duval", role: "One of the central characters", art: "JASON", tone: "blue" }];
const post = async (payload) => { const r = await fetch("/api/world", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Something went wrong."); return d; };
const date = n => n ? new Date(n).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Just now";

export default function WorldHub({ user, items, characterCollection, reputation }) {
  const [tab, setTab] = useState("map");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", body: "", area: "Vice City", kind: "Landmark", vehicleType: "Sports car", trailer: "Trailer 2", trailerUrl: "", frame: "", options: ["", ""] });
  const [owned, setOwned] = useState(characterCollection || {});
  const [ratings, setRatings] = useState({});
  const [votes, setVotes] = useState({});
  const [comments, setComments] = useState({});
  const [resolutions, setResolutions] = useState({});
  const [selectedArea, setSelectedArea] = useState("All Leonida");
  const [localItems, setLocalItems] = useState(items || []);
  const list = useMemo(() => localItems.filter(x => ({ map: x.type === "location", vehicles: x.type === "vehicle", trailers: x.type === "trailer", wishlist: x.type === "wishlist", predictions: x.type === "prediction" }[tab])).filter(x => tab !== "map" || selectedArea === "All Leonida" || x.area === selectedArea), [localItems, tab, selectedArea]);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const notify = (s) => { setNotice(s); setTimeout(() => setNotice(""), 3500); };
  async function submit(type) {
    if (!user) return notify("Log in to contribute to the world hub.");
    setBusy(true);
    try {
      const payload = { action: "create", type, ...form };
      const result = await post(payload);
      const item = { id: result.id, type, title: form.title, body: form.body, username: user.username, uid: user.uid, createdAt: Date.now(), area: form.area, kind: form.kind, vehicleType: form.vehicleType, trailer: form.trailer, trailerUrl: form.trailerUrl, frame: Number(form.frame) || 0, options: form.options.filter(Boolean), votesByOption: {}, voters: {}, ratings: {}, ratingCount: 0, voteCount: 0, comments: [] };
      setLocalItems(p => [item, ...p]); setForm(p => ({ ...p, title: "", body: "", frame: "", options: ["", ""] })); notify("Added to the GTA 6 world hub.");
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  }
  async function action(payload, success) {
    if (!user) return notify("Log in to take part.");
    setBusy(true);
    try {
      await post(payload);
      setLocalItems(current => current.map(item => {
        if (item.id !== payload.id) return item;
        if (payload.action === "vote" && item.type === "wishlist") return { ...item, voteCount: (item.voteCount || 0) + 1, voters: [...(Array.isArray(item.voters) ? item.voters : []), user.uid] };
        if (payload.action === "vote" && item.type === "prediction") return { ...item, voters: { ...(item.voters || {}), [user.uid]: payload.option }, votesByOption: { ...(item.votesByOption || {}), [payload.option]: (item.votesByOption?.[payload.option] || 0) + 1 } };
        if (payload.action === "rate-vehicle") return { ...item, ratings: { ...(item.ratings || {}), [user.uid]: payload.rating }, ratingTotal: (item.ratingTotal || 0) + payload.rating, ratingCount: (item.ratingCount || 0) + 1 };
        if (payload.action === "resolve") return { ...item, resolved: true, winner: payload.winner };
        if (payload.action === "frame-comment") return { ...item, comments: [{ id: `local-${Date.now()}`, username: user.username, text: payload.text }, ...(item.comments || [])] };
        return item;
      }));
      notify(success);
    } catch (e) { notify(e.message); }
    finally { setBusy(false); }
  }
  async function collect(id) {
    if (!user) return notify("Log in to collect characters.");
    try { const d = await post({ action: "collect-character", character: id }); setOwned(p => ({ ...p, [id]: d.owned })); } catch (e) { notify(e.message); }
  }
  const input = (key, placeholder, maxLength = 180) => <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} maxLength={maxLength} />;
  const textarea = (key, placeholder) => <textarea value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} rows={3} maxLength={1200} />;

  return <main className="wh-wrap">
    <header className="wh-hero"><div><span className="wh-kicker">THE LEONIDA DATABASE</span><h1>Explore the <i>GTA 6</i> world.</h1><p>Discover places, collect characters, rate rides, inspect trailer moments and shape the future of the game with the community.</p><div className="wh-hero-tags"><span>COMMUNITY-POWERED</span><span>GTA 6 ONLY</span><span>LEONIDA</span></div></div><div className="wh-hero-art"><div className="wh-sun"/><div className="wh-palm">♧</div><div className="wh-skyline">VICE CITY</div></div></header>
    <section className="wh-stats"><div><b>{localItems.length}</b><span>Community discoveries</span></div><div><b>{reputation}</b><span>Your reputation</span></div><div><b>{Object.values(owned).filter(Boolean).length}/2</b><span>Characters collected</span></div></section>
    <nav className="wh-tabs" aria-label="World hub sections">{TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={tab === id ? "active" : ""}>{label}</button>)}</nav>
    {notice && <div className="wh-notice" role="status">{notice}</div>}

    {tab === "characters" ? <section className="wh-section"><div className="wh-heading"><div><span className="wh-kicker">YOUR CHARACTER FILE</span><h2>Character collection</h2><p>Track the two central characters in your personal collection.</p></div><span className="wh-count">{Object.values(owned).filter(Boolean).length} / 2 collected</span></div><div className="wh-character-grid">{CHARACTERS.map(c => <article className={`wh-character ${c.tone}`} key={c.id}><div className="wh-character-art"><span>{c.art}</span><small>LEONIDA · CHARACTER FILE</small></div><div className="wh-character-info"><div><h3>{c.name}</h3><p>{c.role}</p></div><button className={owned[c.id] ? "wh-btn collected" : "wh-btn"} onClick={() => collect(c.id)}>{owned[c.id] ? "✓ Collected" : "+ Add to collection"}</button></div></article>)}</div></section> : null}

    {tab !== "characters" ? <section className="wh-section"><div className="wh-heading"><div><span className="wh-kicker">COMMUNITY CONTRIBUTIONS</span><h2>{TABS.find(x => x[0] === tab)?.[1]}</h2><p>{({ map: "Pin discoveries and share places worth exploring across Leonida.", vehicles: "Spot vehicles, share details and rate community submissions.", trailers: "Discuss a specific moment by trailer and timestamp.", wishlist: "Suggest features you'd love to see and vote for ideas.", predictions: "Make predictions, compare community opinion and earn reputation for correct calls." })[tab]}</p></div><span className="wh-count">{list.length} entries</span></div>
      {tab === "map" && <div className="wh-map-explorer"><div className="wh-map-head"><b>LEONIDA DISCOVERY MAP</b><span>Schematic area index · member-submitted finds, not an official map</span></div><div className="wh-map-grid">{["Vice City", "Port Gellhorn", "Ambrosia", "Mount Kalaga", "Grassrivers", "Leonida Keys", "Other Leonida"].map((area, i) => <button key={area} className={`wh-map-zone zone-${i}${selectedArea === area ? " selected" : ""}`} onClick={() => setSelectedArea(selectedArea === area ? "All Leonida" : area)}><span>{["VC", "PG", "AM", "MK", "GR", "LK", "LN"][i]}</span><b>{area}</b><small>{localItems.filter(x => x.type === "location" && x.area === area).length} discoveries</small></button>)}</div><button className="wh-map-all" onClick={() => setSelectedArea("All Leonida")}>Show all Leonida discoveries</button></div>}
      <div className="wh-layout"><div className="wh-feed">
        {list.length ? list.map(item => <article className="wh-item" key={item.id}>
          <div className="wh-item-top"><span className="wh-item-type">{({ location: "MAP DISCOVERY", vehicle: "VEHICLE SPOTTED", trailer: "TRAILER FRAME", wishlist: "FEATURE REQUEST", prediction: "COMMUNITY PREDICTION" })[item.type]}</span><time>{date(item.createdAt)}</time></div>
          <h3>{item.title}</h3>{item.body && <p className="wh-item-body">{item.body}</p>}
          {item.type === "location" && <div className="wh-meta"><span>⌖ {item.area}</span><span>{item.kind}</span></div>}
          {item.type === "vehicle" && <div className="wh-meta"><span>{item.vehicleType}</span><span>★ {item.ratingCount ? (item.ratingTotal / item.ratingCount).toFixed(1) : "No ratings"} / 5 · {item.ratingCount || 0} ratings</span></div>}
          {item.type === "vehicle" && <div className="wh-action-row"><span>Rate this spot</span><div className="wh-stars">{[1,2,3,4,5].map(n => <button key={n} className={Number(ratings[item.id]) >= n ? "chosen" : ""} onClick={() => setRatings(p => ({ ...p, [item.id]: n }))} aria-label={`${n} stars`}>★</button>)}</div><button className="wh-btn small" disabled={!ratings[item.id] || busy || !!item.ratings?.[user?.uid]} onClick={() => action({ action: "rate-vehicle", id: item.id, rating: ratings[item.id] }, "Your rating was submitted.")}>Submit rating</button></div>}
          {item.type === "wishlist" && <div className="wh-action-row"><span>{item.voteCount || 0} community votes</span><button className="wh-btn small" disabled={busy || (Array.isArray(item.voters) && item.voters.includes(user?.uid))} onClick={() => action({ action: "vote", id: item.id }, "Vote recorded.")}>↑ Vote for this idea</button></div>}
          {item.type === "trailer" && <><div className="wh-meta"><span>{item.trailer}</span><span>Timestamp: {item.frame}s</span>{item.trailerUrl && <a href={item.trailerUrl} target="_blank" rel="noreferrer">Open trailer ↗</a>}</div><div className="wh-discuss"><input value={comments[item.id] || ""} onChange={e => setComments(p => ({ ...p, [item.id]: e.target.value }))} placeholder="Add your take on this moment…" maxLength={500}/><button className="wh-btn small" onClick={async () => { await action({ action: "frame-comment", id: item.id, text: comments[item.id] }, "Frame discussion posted."); setComments(p => ({ ...p, [item.id]: "" })); }}>Discuss</button></div>{item.comments?.length > 0 && <div className="wh-comments">{item.comments.map(c => <p key={c.id}><b>@{c.username}</b> {c.text}</p>)}</div>}</>}
          {item.type === "prediction" && <><div className="wh-options">{(item.options || []).map(option => { const count = item.votesByOption?.[option] || 0; const total = Object.values(item.votesByOption || {}).reduce((a,b) => a + b, 0); return <button key={option} disabled={!!item.voters?.[user?.uid] || item.resolved || busy} onClick={() => action({ action: "vote", id: item.id, option }, "Prediction submitted.")}><span>{option}</span><b>{count} · {total ? Math.round(count / total * 100) : 0}%</b></button>; })}</div>{item.resolved ? <div className="wh-result">✓ Resolved: {item.winner} · Correct predictions earn 10 reputation.</div> : item.uid === user?.uid ? <div className="wh-resolve"><Select label="Correct outcome" placeholder="Select correct outcome…" value={resolutions[item.id] || ""} onChange={v => setResolutions(p => ({ ...p, [item.id]: v }))} options={item.options} /><button className="wh-btn small" disabled={!resolutions[item.id] || busy} onClick={() => action({ action: "resolve", id: item.id, winner: resolutions[item.id] }, "Prediction resolved. Correct voters receive reputation.")}>Resolve</button></div> : <small className="wh-muted">{item.voters?.[user?.uid] ? `Your prediction: ${item.voters[user.uid]}` : "Choose an outcome to make your prediction."}</small>}</>}
          <div className="wh-byline">Posted by <b>@{item.username}</b></div>
        </article>) : <div className="wh-empty"><span>✦</span><h3>Nothing discovered yet</h3><p>Be the first to add something to this part of the GTA 6 world hub.</p></div>}
      </div>
      <aside className="wh-create"><span className="wh-kicker">ADD TO THE DATABASE</span><h3>{({ map: "Submit a discovery", vehicles: "Spot a vehicle", trailers: "Start a frame discussion", wishlist: "Suggest a feature", predictions: "Create a prediction" })[tab]}</h3>
        <label>{tab === "map" ? "Discovery name" : tab === "vehicles" ? "Vehicle name or description" : tab === "trailers" ? "What happens in this moment?" : tab === "wishlist" ? "Feature idea" : "Your prediction"}</label>{input("title", tab === "map" ? "e.g. Hidden waterfront building" : tab === "vehicles" ? "e.g. Classic muscle car" : tab === "trailers" ? "e.g. A detail in the background" : tab === "wishlist" ? "e.g. Custom garage interiors" : "e.g. Will vehicle customization return?", 100)}
        <label>Details</label>{textarea("body", "Add context, evidence or why it matters…")}
        {tab === "map" && <><label>Leonida area</label><Select label="Leonida area" value={form.area} onChange={v => update("area", v)} options={AREAS} /><label>Discovery type</label><Select label="Discovery type" value={form.kind} onChange={v => update("kind", v)} options={["Landmark", "Business", "Interior", "Collectible", "Secret", "Wildlife", "Other"]} /></>}
        {tab === "vehicles" && <><label>Vehicle category</label><Select label="Vehicle category" value={form.vehicleType} onChange={v => update("vehicleType", v)} options={["Sports car", "Muscle car", "Motorcycle", "SUV", "Truck", "Boat", "Aircraft", "Other"]} /></>}
        {tab === "trailers" && <><label>Trailer</label><Select label="Trailer" value={form.trailer} onChange={v => update("trailer", v)} options={["Trailer 1", "Trailer 2", "Other official footage"]} /><label>Frame / timestamp (seconds)</label>{input("frame", "e.g. 42", 5)}<label>YouTube trailer link (optional)</label>{input("trailerUrl", "https://youtu.be/…", 300)}</>}
        {tab === "predictions" && <><label>Possible outcomes</label>{form.options.map((o, i) => <input key={i} value={o} onChange={e => update("options", form.options.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`} maxLength={70}/>)}{form.options.length < 5 && <button className="wh-text-btn" onClick={() => update("options", [...form.options, ""])}>+ Add another outcome</button>}</>}
        <button className="wh-btn submit" disabled={busy || !user} onClick={() => submit(({ map: "location", vehicles: "vehicle", trailers: "trailer", wishlist: "wishlist", predictions: "prediction" })[tab])}>{busy ? "Submitting…" : "Publish contribution"}</button>
        {!user && <p className="wh-muted">Log in to submit, vote, rate and collect.</p>}
      </aside></div>
    </section> : null}
    <footer className="wh-footer">Fan-made community features. All discoveries and ratings are member-submitted and may be unverified. GTAFanbase is not affiliated with Rockstar Games.</footer>
  </main>;
}
