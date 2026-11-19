"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthModal from "@/components/AuthModal";
import FullScreen from "@/components/FullScreen";
import { ADS_FREE_WHILE_TESTING, AD_RATES, quote, usd } from "@/lib/ads";
import AdForm from "./AdForm";
import BudgetPicker from "./BudgetPicker";
import { Billing, Guide, MyAds, Overview, Performance } from "./Panels";
import { adsApi } from "./adsApi";

// The Ads Manager shell: tab bar, state, add-funds sheet and toasts.

const TABS = [
  ["overview", "Overview", false],
  ["create", "Create ad", true],
  ["ads", "My ads", true],
  ["performance", "Performance", true],
  ["billing", "Billing", true],
  ["guide", "Pricing & guide", false],
];

function TopUpSheet({ ad, onClose, onDone, onToast }) {
  const [cents, setCents] = useState(2000);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const q = quote(ad.type, cents);
  async function pay() {
    setBusy(true); setErr("");
    try {
      const r = await adsApi("topup", { id: ad.id, budgetCents: cents });
      onToast(ADS_FREE_WHILE_TESTING ? "Funds added. (Test mode: no charge.)" : "Payment received. Funds added.");
      onDone(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <FullScreen
      title="Add funds"
      subtitle={`${ad.name} · ${AD_RATES[ad.type].label}`}
      onClose={onClose}
      size="sm"
      className="am-fs"
      footer={
        <>
          {err && <p className="am-err" role="alert">{err}</p>}
          <button type="button" className="am-btn solid pay full" onClick={pay} disabled={busy}>{busy ? "Processing…" : `Pay ${usd(q.totalCents)}`}</button>
        </>
      }
    >
      <p className="am-lead">This is a one-time payment. It adds more views to this ad and restarts it if it ran out.</p>
      <BudgetPicker type={ad.type} cents={cents} onChange={setCents} />
    </FullScreen>
  );
}

export default function AdsApp({ user, initialAds, initialOrders }) {
  const [tab, setTab] = useState("overview");
  const [ads, setAds] = useState(initialAds);
  const [orders, setOrders] = useState(initialOrders);
  const [perfAd, setPerfAd] = useState("all");
  const [editing, setEditing] = useState(null);
  const [topUp, setTopUp] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const top = useRef(null);

  const say = useCallback((text, bad = false) => {
    setToast({ text, bad });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = useCallback((id, adId) => {
    if (!user && TABS.find((t) => t[0] === id)?.[2]) { setAuthOpen(true); return; }
    setEditing(null);
    if (adId) setPerfAd(adId);
    setTab(id);
    if (typeof history !== "undefined") history.replaceState(null, "", `#${id}`);
    const y = top.current ? top.current.getBoundingClientRect().top + window.scrollY - 70 : 0;
    window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
  }, [user]);

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (TABS.some((t) => t[0] === h) && (user || !TABS.find((t) => t[0] === h)[2])) setTab(h); // eslint-disable-line react-hooks/set-state-in-effect
  }, [user]);

  const apply = (r) => { setAds(r.ads); setOrders(r.orders); };

  async function act(action, id) {
    setBusyId(id);
    try {
      apply(await adsApi(action, { id }));
      say(action === "pause" ? "Ad paused." : action === "resume" ? "Ad is live again." : "Ad ended.");
    } catch (e) { say(e.message, true); } finally { setBusyId(""); }
  }

  const liveCount = ads.filter((a) => a.status === "active").length;

  return (
    <div className="am">
      <div ref={top} />
      <nav className="am-tabs" aria-label="Ads Manager">
        <div className="am-tabs-in" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={!editing && tab === id} className={!editing && tab === id ? "on" : ""} onClick={() => go(id)}>
              {label}{id === "ads" && ads.length > 0 && <em>{ads.length}</em>}
            </button>
          ))}
        </div>
      </nav>

      {ADS_FREE_WHILE_TESTING && <p className="am-banner">Test mode: ads launch for free while payments are being connected.</p>}
      {user && liveCount === 0 && ads.length > 0 && tab === "overview" && !editing && <p className="am-banner warn">None of your ads are live right now.</p>}

      <div className="am-body">
        {editing ? (
          <>
            <button type="button" className="am-back" onClick={() => setEditing(null)}>← Back to my ads</button>
            <h2 className="am-h">Edit “{editing.name}”</h2>
            <AdForm key={editing.id} mode="edit" ad={editing} onToast={say} onDone={(r) => { apply(r); setEditing(null); }} />
          </>
        ) : tab === "overview" ? (
          <Overview ads={ads} go={go} signedIn={!!user} onSignIn={() => setAuthOpen(true)} />
        ) : tab === "create" ? (
          <AdForm key="new" onToast={say} onDone={(r) => { apply(r); go("ads"); }} />
        ) : tab === "ads" ? (
          <MyAds ads={ads} go={go} onAction={act} busyId={busyId} onTopUp={setTopUp} onEdit={(a) => { setEditing(a); window.scrollTo({ top: 0 }); }} />
        ) : tab === "performance" ? (
          <Performance ads={ads} adId={ads.some((a) => a.id === perfAd) ? perfAd : "all"} setAdId={setPerfAd} go={go} />
        ) : tab === "billing" ? (
          <Billing orders={orders} go={go} />
        ) : (
          <Guide go={go} signedIn={!!user} onSignIn={() => setAuthOpen(true)} />
        )}
      </div>

      {topUp && <TopUpSheet ad={topUp} onClose={() => setTopUp(null)} onToast={say} onDone={(r) => { apply(r); setTopUp(null); }} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {toast && <div className={`am-toast${toast.bad ? " bad" : ""}`} role="status">{toast.text}</div>}
    </div>
  );
}
