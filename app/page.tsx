'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLANS, PRODUCTS } from '@/lib/catalog';
import { useAuth } from '@/hooks/useAuth';

declare global { interface Window { sitevento?: (...a: unknown[]) => void } }
const btn: React.CSSProperties = { background: '#6c5ce7', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 };
const ghost: React.CSSProperties = { ...btn, background: '#2d3340' };
const card: React.CSSProperties = { background: '#181b22', border: '1px solid #2a2f3a', borderRadius: 12, padding: 16 };
const grid: React.CSSProperties = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' };
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };

export default function Home() {
  const { user, loading, logOut } = useAuth();
  const [visitorId, setVisitorId] = useState<string>();
  const [plan, setPlanState] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<{ id: string; productId: string } | null>(null);
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const userId = user?.uid ?? '';

  useEffect(() => {
    window.sitevento?.('visitor', (v: string) => setVisitorId(v));
  }, []);

  // Remember the plan across reloads (per user) so "Switch" vs "Subscribe" stays right.
  useEffect(() => {
    if (!userId) return;
    try { setPlanState(localStorage.getItem(`plan:${userId}`)); } catch {}
  }, [userId]);
  const setPlan = (id: string | null) => {
    setPlanState(id);
    try { id ? localStorage.setItem(`plan:${userId}`, id) : localStorage.removeItem(`plan:${userId}`); } catch {}
  };

  // One user.logged_in per browser session ("one per session is enough" per the Sitevento docs).
  useEffect(() => {
    if (!userId) return;
    try {
      const k = `svLogin:${userId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch {}
    fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', userId }) }).catch(() => {});
  }, [userId]);

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!user) {
    return (
      <main style={{ maxWidth: 860, margin: '0 auto', padding: 24, display: 'grid', gap: 12, textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>Test SaaS</h1>
        <p style={{ opacity: 0.7 }}>Sign up to try subscriptions and purchases.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link href="/signup" style={btn}>Sign up</Link>
        </div>
      </main>
    );
  }

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, userId, visitorId, ...extra }) });
      const data = await res.json();
      const lines = (data.results ?? [data]).map((r: any) => `${r.event ?? action} → ${r.status ?? res.status} ${JSON.stringify(r.response ?? r.error ?? '')}`);
      setLog((l) => [...lines.slice().reverse(), ...l].slice(0, 40));
      return data;
    } finally {
      setBusy(false);
    }
  }
  const subscribe = async (id: string) => {
    window.sitevento?.('track', 'upgrade_click', { plan: id });
    await call(plan ? 'change' : 'subscribe', { planId: id, fromPlanId: plan ?? undefined });
    setPlan(id);
  };
  const buy = async (id: string) => {
    window.sitevento?.('track', 'buy_click', { product: id });
    const d = await call('buy', { productId: id });
    if (d.orderId) setLastOrder({ id: d.orderId, productId: id });
  };
  const trialPlan = plan ?? 'pro';
  const orderArgs = lastOrder ? { orderId: lastOrder.id, productId: lastOrder.productId } : null;

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 24, display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Test SaaS</h1>
        <button style={ghost} onClick={logOut}>Log out</button>
      </div>
      <p style={{ margin: 0, opacity: 0.7 }}>User: {user.name} &lt;{user.email}&gt; ({userId}) · Visitor: {visitorId ?? 'waiting for script'} · Plan: {plan ?? 'none'}</p>

      <section style={{ ...card, display: 'grid', gap: 8 }}>
        <div style={row}>
          <button style={btn} disabled={busy} onClick={() => call('seed')}>1. Sync plans &amp; products</button>
          <button style={btn} disabled={busy} onClick={() => call('burst', { customers: 3 })}>Simulate 3 customers (~35 events)</button>
        </div>
        <small style={{ opacity: 0.6 }}>The simulation sends fake customers (ids starting <code>sim_</code>) whose events are back-dated over the last 30 days. Each event uses one visit of your monthly allowance.</small>
      </section>

      <section style={grid}>
        {PLANS.map((p) => (
          <div key={p.id} style={card}>
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <p style={{ fontSize: 24, margin: '8px 0' }}>${p.amount}<small>/{p.interval}</small></p>
            <button style={btn} disabled={busy || plan === p.id} onClick={() => subscribe(p.id)}>{plan === p.id ? 'Current' : plan ? 'Switch' : 'Subscribe'}</button>
          </div>
        ))}
      </section>
      {plan && (
        <section style={{ ...card, ...row }}>
          <button style={btn} disabled={busy} onClick={() => call('renew', { planId: plan })}>Simulate renewal</button>
          <button style={btn} disabled={busy} onClick={() => call('fail', { planId: plan })}>Simulate failed payment</button>
          <button style={{ ...btn, background: '#d63031' }} disabled={busy} onClick={async () => { await call('cancel'); setPlan(null); }}>Cancel</button>
        </section>
      )}

      <section style={grid}>
        {PRODUCTS.map((p) => (
          <div key={p.id} style={card}>
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <p style={{ fontSize: 24, margin: '8px 0' }}>${p.price}</p>
            <button style={btn} disabled={busy} onClick={() => buy(p.id)}>Buy</button>
          </div>
        ))}
      </section>
      {orderArgs && (
        <section style={{ ...card, ...row }}>
          <button style={ghost} disabled={busy} onClick={() => call('refund', orderArgs)}>Refund last order</button>
          <button style={{ ...ghost, background: '#b2342f' }} disabled={busy} onClick={() => call('chargeback', orderArgs)}>Chargeback last order</button>
        </section>
      )}

      <section style={{ ...card, display: 'grid', gap: 10 }}>
        <b>More events</b>
        <div style={row}>
          <button style={ghost} disabled={busy} onClick={() => call('login')}>Login</button>
          <button style={ghost} disabled={busy} onClick={() => call('trial_start', { planId: trialPlan })}>Start trial</button>
          <button style={ghost} disabled={busy} onClick={() => call('trial_end', { planId: trialPlan, outcome: 'converted' })}>Trial converted</button>
          <button style={ghost} disabled={busy} onClick={() => call('trial_end', { planId: trialPlan, outcome: 'expired' })}>Trial expired</button>
          <button style={ghost} disabled={busy} onClick={() => call('goal')}>Goal completed</button>
          <button style={ghost} disabled={busy} onClick={() => call('custom')}>Custom event</button>
        </div>
        <div style={row}>
          <button style={ghost} disabled={busy} onClick={() => call('expense')}>Expense</button>
          <button style={ghost} disabled={busy} onClick={() => call('adspend')}>Ad spend</button>
          <button style={ghost} disabled={busy} onClick={() => call('server_error')}>Server error</button>
          <button style={ghost} disabled={busy} onClick={() => call('server_metrics')}>Server metrics</button>
        </div>
        <form style={row} onSubmit={(e) => { e.preventDefault(); if (term.trim()) call('search', { term }); }}>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search plans & products…" style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8, border: '1px solid #2a2f3a', background: '#0f1115', color: 'inherit' }} />
          <button style={ghost} disabled={busy}>Search</button>
        </form>
      </section>

      <section style={card}>
        <b>API responses</b>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.85 }}>{log.join('\n') || 'Nothing sent yet.'}</pre>
      </section>
    </main>
  );
}
