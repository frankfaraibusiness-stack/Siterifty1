"use client";

import { useMemo, useState } from "react";
import {
  AD_RATES, ADS_FREE_WHILE_TESTING, AUDIENCE_LABEL, PLACEMENTS, SOURCE_LABEL, STATUS_LABEL, VIDEO_MAX_SECONDS,
  ctr, lastDays, num, pctText, quote, spentCents, usd,
} from "@/lib/ads";
import { AdCardView, AdCompactView, AdRowView } from "./AdViews";
import { SourceBars, TrendChart } from "./Charts";
import { SAMPLE_AD } from "./adsApi";
import StoryAd from "./StoryAd";
import { BarsIc, LayersIc, MegaphoneIc, PlayIc } from "./AdIcons";
import Select from "@/components/ui/Select";

// ---- shared numbers ------------------------------------------------------------

function totals(list) {
  const t = { views: 0, clicks: 0, spent: 0, left: 0, live: 0, vSrc: Object.fromEntries(PLACEMENTS.map((p) => [p.id, 0])), cSrc: Object.fromEntries(PLACEMENTS.map((p) => [p.id, 0])) };
  for (const a of list) {
    t.views += a.views; t.clicks += a.clicks;
    t.spent += spentCents(a.type, a.views);
    t.left += Math.max(0, a.budgetCents - spentCents(a.type, a.views));
    if (a.status === "active") t.live += 1;
    for (const k of Object.keys(t.vSrc)) { t.vSrc[k] += a.vSrc[k] || 0; t.cSrc[k] += a.cSrc[k] || 0; }
  }
  return t;
}
const sourceRows = (t) => PLACEMENTS.map((p) => ({ id: p.id, label: p.label, views: t.vSrc[p.id], clicks: t.cSrc[p.id] }));

const Kpi = ({ label, value, sub, tone }) => (
  <div className={`am-kpi${tone ? ` ${tone}` : ""}`}><small>{label}</small><b>{value}</b>{sub && <span>{sub}</span>}</div>
);

export const StatusPill = ({ status }) => <span className={`am-pill ${status}`}>{STATUS_LABEL[status] || status}</span>;

function Thumb({ ad }) {
  const m = ad.media || {};
  return (
    <span className="am-thumb">
      {m.src ? <img src={m.src} alt="" referrerPolicy="no-referrer" /> : <span>{ad.type === "video" ? <PlayIc size="22px" /> : "Ad"}</span>}
      {ad.type === "video" && <em>VIDEO</em>}
    </span>
  );
}

// ---- Overview ---------------------------------------------------------------------------

export function Overview({ ads, go, signedIn, onSignIn }) {
  const t = useMemo(() => totals(ads), [ads]);
  const days = useMemo(() => lastDays(ads.map((a) => a.days), 14), [ads]);
  const top = useMemo(() => [...ads].sort((a, b) => b.views - a.views)[0], [ads]);
  return (
    <div className="am-stack">
      <section className="am-hero">
        <div className="am-hero-glow" />
        <span className="am-eyebrow">Ads Manager</span>
        <h2>Put your brand in front of GTA 6 fans</h2>
        <p>Launch an image or video ad in minutes. Pay once, pick your budget, and watch the results come in live.</p>
        <div className="am-hero-chips">
          <span>{usd(AD_RATES.image.cpmCents)} per 1,000 image views</span>
          <span>{usd(AD_RATES.video.cpmCents)} per 1,000 video views</span>
          <span>No subscriptions</span>
        </div>
        <div className="am-hero-cta">
          {signedIn ? <button type="button" className="am-btn solid big" onClick={() => go("create")}>Create an ad</button> : <button type="button" className="am-btn solid big" onClick={onSignIn}>Sign in to start</button>}
          <button type="button" className="am-btn ghost big" onClick={() => go("guide")}>See pricing</button>
        </div>
      </section>

      {ads.length > 0 && (
        <>
          <div className="am-kpis">
            <Kpi label="Views" value={num(t.views)} tone="cyan" />
            <Kpi label="Clicks" value={num(t.clicks)} />
            <Kpi label="CTR" value={pctText(ctr(t.clicks, t.views))} sub="clicks ÷ views" tone="pink" />
            <Kpi label="Budget used" value={usd(t.spent)} />
            <Kpi label="Balance left" value={usd(t.left)} />
            <Kpi label="Live ads" value={num(t.live)} sub={`of ${ads.length}`} tone="lime" />
          </div>

          <section className="am-card">
            <header className="am-card-h"><h3>Views vs CTR</h3><span>All your ads, last 14 days</span></header>
            <TrendChart days={days} />
          </section>

          <div className="am-two">
            <section className="am-card">
              <header className="am-card-h"><h3>Where views come from</h3></header>
              <SourceBars rows={sourceRows(t)} />
            </section>
            {top && (
              <section className="am-card">
                <header className="am-card-h"><h3>Top ad</h3></header>
                <div className="am-toprow"><Thumb ad={top} /><div><b>{top.title}</b><small>{top.name}</small><StatusPill status={top.status} /></div></div>
                <div className="am-mini-stats"><span><b>{num(top.views)}</b>views</span><span><b>{num(top.clicks)}</b>clicks</span><span><b>{pctText(ctr(top.clicks, top.views))}</b>CTR</span></div>
                <button type="button" className="am-btn ghost" onClick={() => go("performance", top.id)}>Open performance</button>
              </section>
            )}
          </div>
        </>
      )}

      {ads.length === 0 && (
        <section className="am-card am-empty">
          <div className="am-empty-ic"><MegaphoneIc /></div>
          <h3>{signedIn ? "You haven’t launched an ad yet" : "Sign in to launch your first ad"}</h3>
          <p>It takes about three minutes: pick a format, add your picture or video, choose where it shows and set a budget.</p>
          {signedIn ? <button type="button" className="am-btn solid" onClick={() => go("create")}>Create your first ad</button> : <button type="button" className="am-btn solid" onClick={onSignIn}>Sign in</button>}
        </section>
      )}

      <section className="am-card">
        <header className="am-card-h"><h3>How it works</h3></header>
        <ol className="am-how">
          <li><i>1</i><div><b>Create</b><span>Upload an image or video, or paste an image link. Write a short headline and pick a button.</span></div></li>
          <li><i>2</i><div><b>Choose where</b><span>Home feed, communities & groups, stories, the Videos tab, messages. Pick one or all of them.</span></div></li>
          <li><i>3</i><div><b>Set a budget, pay once</b><span>Type any amount from $5. Your ad starts serving right away and stops when the budget is used.</span></div></li>
          <li><i>4</i><div><b>Track & adjust</b><span>See views, clicks and CTR by placement. Add funds, edit or pause whenever you like.</span></div></li>
        </ol>
      </section>
    </div>
  );
}

// ---- My ads --------------------------------------------------------------------------------

const FILTERS = [["all", "All"], ["active", "Live"], ["paused", "Paused"], ["exhausted", "Out of balance"], ["ended", "Ended"]];

export function MyAds({ ads, go, onAction, onTopUp, onEdit, busyId }) {
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const shown = ads.filter((a) => filter === "all" || a.status === filter);
  if (ads.length === 0) {
    return (
      <section className="am-card am-empty"><div className="am-empty-ic"><LayersIc /></div><h3>No ads yet</h3><p>Your ads will be listed here with their status, balance and results.</p><button type="button" className="am-btn solid" onClick={() => go("create")}>Create an ad</button></section>
    );
  }
  return (
    <div className="am-stack">
      <div className="am-chips wrap" role="tablist" aria-label="Filter ads">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={`am-chip${filter === id ? " on" : ""}`} onClick={() => setFilter(id)}>
            {label} <em>{id === "all" ? ads.length : ads.filter((a) => a.status === id).length}</em>
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="am-fine center">Nothing here.</p>}
      {shown.map((a) => {
        const spent = spentCents(a.type, a.views);
        const pct = a.viewsBought ? Math.min(100, (a.views / a.viewsBought) * 100) : 0;
        const left = Math.max(0, a.viewsBought - a.views);
        const busy = busyId === a.id;
        return (
          <article key={a.id} className={`am-ad ${a.status}`}>
            <div className="am-ad-top">
              <Thumb ad={a} />
              <div className="am-ad-main">
                <div className="am-ad-title"><b>{a.title}</b><StatusPill status={a.status} /></div>
                <small>{a.name} · {AD_RATES[a.type].label} · created {new Date(a.createdMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small>
                <div className="am-tags">{a.placements.map((p) => <span key={p}>{SOURCE_LABEL[p]}</span>)}{a.audience && a.audience !== "all" && <span>{AUDIENCE_LABEL[a.audience]}</span>}</div>
              </div>
            </div>
            <div className="am-meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Views delivered"><i style={{ width: `${pct}%` }} /></div>
            <div className="am-ad-stats">
              <span><b>{num(a.views)}</b><small>of {num(a.viewsBought)} views</small></span>
              <span><b>{num(a.clicks)}</b><small>clicks</small></span>
              <span><b>{pctText(ctr(a.clicks, a.views))}</b><small>CTR</small></span>
              <span><b>{usd(Math.max(0, a.budgetCents - spent))}</b><small>{num(left)} views left</small></span>
            </div>
            {a.status === "exhausted" && <p className="am-note warn">This ad ran out of balance and stopped. Add funds to start it again.</p>}
            <div className="am-ad-actions">
              <button type="button" className="am-btn ghost" onClick={() => go("performance", a.id)}>Performance</button>
              {a.status !== "ended" && <button type="button" className="am-btn ghost" onClick={() => onEdit(a)}>Edit</button>}
              {a.status !== "ended" && <button type="button" className="am-btn solid" onClick={() => onTopUp(a)}>Add funds</button>}
              {a.status === "active" && <button type="button" className="am-btn ghost" disabled={busy} onClick={() => onAction("pause", a.id)}>Pause</button>}
              {a.status === "paused" && <button type="button" className="am-btn ghost" disabled={busy} onClick={() => onAction("resume", a.id)}>Resume</button>}
              {a.status !== "ended" && (confirm === a.id
                ? <button type="button" className="am-btn danger" disabled={busy} onClick={() => { setConfirm(null); onAction("end", a.id); }}>Yes, end it</button>
                : <button type="button" className="am-btn ghost danger" onClick={() => setConfirm(a.id)}>End</button>)}
            </div>
            {confirm === a.id && <p className="am-note warn">Ending stops this ad for good. Unused balance isn’t refunded automatically. Pause it instead if you may want it back. <button type="button" className="am-link" onClick={() => setConfirm(null)}>Cancel</button></p>}
          </article>
        );
      })}
    </div>
  );
}

// ---- Performance -------------------------------------------------------------------------------

export function Performance({ ads, adId, setAdId, go }) {
  const [range, setRange] = useState(14);
  const list = adId === "all" ? ads : ads.filter((a) => a.id === adId);
  const t = useMemo(() => totals(list), [list]);
  const days = useMemo(() => lastDays(list.map((a) => a.days), range), [list, range]);
  const rows = sourceRows(t);
  if (ads.length === 0) return <section className="am-card am-empty"><div className="am-empty-ic"><BarsIc /></div><h3>No data yet</h3><p>Launch an ad and its views, clicks and CTR will appear here.</p><button type="button" className="am-btn solid" onClick={() => go("create")}>Create an ad</button></section>;

  const withViews = rows.filter((r) => r.views >= 20);
  const best = [...withViews].sort((a, b) => ctr(b.clicks, b.views) - ctr(a.clicks, a.views))[0];
  const avg = days.slice(-7).reduce((s, d) => s + d.v, 0) / 7;
  const left = list.filter((a) => a.status === "active").reduce((s, a) => s + Math.max(0, a.viewsBought - a.views), 0);
  const tips = [];
  if (best) tips.push(`${best.label} gets the best CTR (${pctText(ctr(best.clicks, best.views))}). Keep it switched on.`);
  if (avg > 0 && left > 0) tips.push(`At your recent pace (${num(avg)} views a day), your remaining ${num(left)} views last about ${Math.max(1, Math.round(left / avg))} day${Math.round(left / avg) === 1 ? "" : "s"}.`);
  if (t.views >= 200 && ctr(t.clicks, t.views) < 0.3) tips.push("A low CTR often means the headline or picture isn’t clear. Try a stronger headline or a different button.");
  if (t.views < 50) tips.push("Not much data yet. Results get more reliable after a few hundred views.");

  return (
    <div className="am-stack">
      <div className="am-toolbar">
        <label className="am-select"><span>Ad</span>
          <Select label="Ad" value={adId} onChange={setAdId} options={[{ value: "all", label: `All ads (${ads.length})` }, ...ads.map((a) => ({ value: a.id, label: a.name }))]} />
        </label>
        <div className="am-seg small" role="tablist" aria-label="Date range">
          {[7, 14, 30].map((n) => <button key={n} type="button" role="tab" aria-selected={range === n} className={range === n ? "on" : ""} onClick={() => setRange(n)}>{n}d</button>)}
        </div>
      </div>

      <div className="am-kpis">
        <Kpi label="Views" value={num(t.views)} sub="all time" tone="cyan" />
        <Kpi label="Clicks" value={num(t.clicks)} sub="all time" />
        <Kpi label="CTR" value={pctText(ctr(t.clicks, t.views))} tone="pink" />
        <Kpi label="Budget used" value={usd(t.spent)} />
      </div>

      <section className="am-card">
        <header className="am-card-h"><h3>Views vs CTR</h3><span>Last {range} days (UTC)</span></header>
        <TrendChart days={days} />
      </section>

      <section className="am-card">
        <header className="am-card-h"><h3>By placement</h3><span>Where your views and clicks came from</span></header>
        <SourceBars rows={rows} />
        <div className="am-table-wrap">
          <table className="am-table">
            <thead><tr><th>Placement</th><th>Views</th><th>Clicks</th><th>CTR</th></tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r.id}><td>{r.label}</td><td>{num(r.views)}</td><td>{num(r.clicks)}</td><td>{pctText(ctr(r.clicks, r.views))}</td></tr>)}
              <tr className="tot"><td>Total</td><td>{num(t.views)}</td><td>{num(t.clicks)}</td><td>{pctText(ctr(t.clicks, t.views))}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {tips.length > 0 && (
        <section className="am-card">
          <header className="am-card-h"><h3>Insights</h3></header>
          <ul className="am-tips">{tips.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

// ---- Billing -------------------------------------------------------------------------------------

export function Billing({ orders, go }) {
  const paid = orders.filter((o) => o.mode === "paid");
  const test = orders.filter((o) => o.mode === "test");
  const sum = (l, k) => l.reduce((s, o) => s + o[k], 0);
  return (
    <div className="am-stack">
      <div className="am-kpis three">
        <Kpi label="Total charged" value={usd(sum(paid, "totalCents"))} sub={`${paid.length} payment${paid.length === 1 ? "" : "s"}`} tone="lime" />
        <Kpi label="Views bought" value={num(sum(orders, "views"))} sub="across all orders" tone="cyan" />
        <Kpi label="Tax & fees" value={usd(sum(paid, "extraCents"))} />
      </div>
      {ADS_FREE_WHILE_TESTING && <p className="am-note">Test mode is on. {test.length} order{test.length === 1 ? "" : "s"} below {test.length === 1 ? "was" : "were"} recorded but not charged.</p>}

      <section className="am-card">
        <header className="am-card-h"><h3>Rates</h3><span>One-time payments. Nothing renews.</span></header>
        <div className="am-table-wrap">
          <table className="am-table">
            <thead><tr><th>Format</th><th>Per 1,000 views</th><th>Tax / fees</th><th>Example: $20 budget</th></tr></thead>
            <tbody>
              {["image", "video"].map((t) => { const q = quote(t, 2000); return (
                <tr key={t}><td>{AD_RATES[t].label}</td><td>{usd(AD_RATES[t].cpmCents)}</td><td>{usd(AD_RATES[t].fixedCents)} + {AD_RATES[t].pct}%</td><td>{usd(q.totalCents)} for {num(q.views)} views</td></tr>
              ); })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="am-card">
        <header className="am-card-h"><h3>Payment history</h3></header>
        {orders.length === 0 ? (
          <div className="am-empty slim"><p>No payments yet.</p><button type="button" className="am-btn solid" onClick={() => go("create")}>Create an ad</button></div>
        ) : (
          <ul className="am-orders">
            {orders.map((o) => (
              <li key={o.id}>
                <div className="am-order-main"><b>{o.adName}</b><small>{new Date(o.createdMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {o.kind === "topup" ? "Added funds" : "Launch"} · {AD_RATES[o.type].label} · {num(o.views)} views</small></div>
                <div className="am-order-amt"><b>{usd(o.totalCents)}</b><small>{usd(o.budgetCents)} + {usd(o.extraCents)} {AD_RATES[o.type].extraLabel.toLowerCase()}</small>{o.mode === "test" && <em>TEST</em>}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---- Guide: pricing, placements, specs, rules, FAQ -----------------------------------------------

const FAQ = [
  ["How does pricing work?", `You choose a budget and pay once. Image ads cost ${usd(AD_RATES.image.cpmCents)} per 1,000 views, plus tax of ${usd(AD_RATES.image.fixedCents)} + ${AD_RATES.image.pct}% of the budget. Video ads cost ${usd(AD_RATES.video.cpmCents)} per 1,000 views, plus fees of ${AD_RATES.video.pct}% + ${usd(AD_RATES.video.fixedCents)}. There are no subscriptions or automatic renewals.`],
  ["What counts as a view?", "A view is counted when at least half of your ad has been on screen for one second. Scrolling past quickly doesn’t count. Your own views and clicks are never counted or charged."],
  ["Do I pay for clicks?", "No. You pay for views only. Clicks are tracked so you can see how well your ad works (CTR = clicks ÷ views)."],
  ["What happens when my budget runs out?", "The ad stops showing by itself. You’ll never be charged for more views than you bought. Add funds any time to start it again."],
  ["Can I change my ad after it’s live?", "Yes. You can edit the headline, description, button, link, picture, placements and audience at any time. Video ads can’t swap the video file."],
  ["Can I get my money back?", "Unused balance stays on your ad so you can pause and resume it. Ending an ad stops it permanently and doesn’t refund the unused balance automatically. Contact us if something went wrong."],
  ["What ads aren’t allowed?", "Anything illegal, misleading, hateful, sexually explicit, or that spreads malware or scams. Ads must point to a real page that matches what the ad promises. We can remove ads that break these rules."],
];

export function Guide({ go, signedIn, onSignIn }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="am-stack">
      <div className="am-two">
        {["image", "video"].map((t) => {
          const q = quote(t, 2000);
          return (
            <section key={t} className={`am-card am-rate ${t}`}>
              <small>{AD_RATES[t].label}</small>
              <b className="am-rate-n">{usd(AD_RATES[t].cpmCents)}<span> / 1,000 views</span></b>
              <ul>
                <li>{AD_RATES[t].extraLabel}: {usd(AD_RATES[t].fixedCents)} + {AD_RATES[t].pct}% of budget</li>
                <li>{t === "video" ? `Up to ${VIDEO_MAX_SECONDS} seconds, plays muted` : "Any size, shown uncropped"}</li>
                <li>Example: {usd(q.budgetCents)} budget = {num(q.views)} views, {usd(q.totalCents)} total</li>
              </ul>
            </section>
          );
        })}
      </div>

      <section className="am-card">
        <header className="am-card-h"><h3>Where your ad shows</h3></header>
        <div className="am-guide-prev">
          <div><AdCardView ad={SAMPLE_AD} preview /><p className="am-fine"><b>Home feed.</b> A large card after every 4 to 5 posts. The “Sponsored” label sits on top of the picture.</p></div>
          <div><AdCompactView ad={SAMPLE_AD} preview /><p className="am-fine"><b>Communities.</b> A compact card after every 4 to 5 posts, in the community’s own colours. Small thumbnail, headline and a button. The whole card is tappable.</p></div>
          <div><div className="am-story-frame"><StoryAd ad={SAMPLE_AD} preview /></div><p className="am-fine"><b>Stories.</b> A full-screen card after every 3 to 4 stories someone watches. Pictures stay up for 6 seconds, clips play to the end. The “Sponsored” tag sits at the top and your button at the bottom.</p></div>
          <div><div className="am-story-frame"><StoryAd ad={SAMPLE_AD} preview /></div><p className="am-fine"><b>Videos.</b> A full-screen card after every 3 to 5 clips, in the same style as stories: the “Sponsored” tag on top, your headline and button in a card at the bottom. Video ads are shown here first.</p></div>
          <div><AdRowView ad={SAMPLE_AD} preview /><p className="am-fine"><b>Messages.</b> A compact row after every 5 messages. Square thumbnail, headline and description. The whole row is tappable.</p></div>
        </div>
      </section>

      <section className="am-card">
        <header className="am-card-h"><h3>Creative tips</h3></header>
        <ul className="am-tips">
          <li>Images are shown at their natural shape with rounded corners. Nothing is cropped, so wide, square and tall pictures all work.</li>
          <li>Keep your headline under 60 characters and say what the viewer gets.</li>
          <li>Videos: MP4, MOV or WebM, 30 seconds max, 50 MB max. Put the key message in the first 3 seconds, since it plays without sound.</li>
          <li>In stories the screen is tall: vertical pictures and clips (9:16) fill it, wide ones sit on a soft blur. Keep the key message away from the very top and bottom.</li>
          <li>In the Videos tab your ad is a full-screen card between clips, so a vertical (9:16) video fits best and blends in. Video ads are shown there first, and they play with the reel’s sound setting, which is off for most people, so use captions.</li>
          <li>In chats the picture becomes a small square, so keep the subject centred.</li>
        </ul>
      </section>

      <section className="am-card">
        <header className="am-card-h"><h3>Questions</h3></header>
        <div className="am-faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={open === i ? "open" : ""}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<i>{open === i ? "–" : "+"}</i></button>
              {open === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="am-cta-row">
        {signedIn ? <button type="button" className="am-btn solid big" onClick={() => go("create")}>Create an ad</button> : <button type="button" className="am-btn solid big" onClick={onSignIn}>Sign in to start</button>}
      </div>
    </div>
  );
}
