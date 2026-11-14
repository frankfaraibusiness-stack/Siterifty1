// Server-side: the API key never reaches the browser. Prices come from lib/catalog.ts, not from the client.
// Every action maps to one (or, for "burst", many) Sitevento /api/ingest events. See https://sitevento12.vercel.app/docs/api
import { NextResponse } from 'next/server';
import { PLANS, PRODUCTS, CURRENCY, GOALS, CUSTOM_EVENTS, SEARCH_TERMS, EXPENSES, AD_SOURCES } from '@/lib/catalog';
import { SITEVENTO_API_KEY, SITEVENTO_INGEST_URL, SITEVENTO_SITE_ID } from '@/lib/sitevento';
import { jsonError, rateLimitOk } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Result = { event: unknown; status: number; response: unknown };
type Payload = Record<string, unknown>;

const c = { currency: CURRENCY };
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(a: readonly T[]): T => a[rnd(0, a.length - 1)];
const money = (n: number) => +n.toFixed(2);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const searchResults = (term: string) => {
  const t = term.toLowerCase().trim();
  return [...PLANS.map((p) => p.name), ...PRODUCTS.map((p) => p.name)].filter((n) => n.toLowerCase().includes(t)).length;
};

async function send(payload: Payload): Promise<Result> {
  try {
    const r = await fetch(SITEVENTO_INGEST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SITEVENTO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: SITEVENTO_SITE_ID, ...payload }),
    });
    return { event: payload.event, status: r.status, response: await r.json().catch(() => null) };
  } catch {
    return { event: payload.event, status: 0, response: { error: 'network error reaching Sitevento' } };
  }
}

/** One fake customer's whole journey, spread over the last ~30 days via occurredAt so charts get a real shape. */
async function simulateCustomer(uid: string): Promise<Result[]> {
  const plan = pick(PLANS);
  const product = pick(PRODUCTS);
  const goal = pick(GOALS);
  const custom = pick(CUSTOM_EVENTS);
  const term = pick(SEARCH_TERMS);
  const converts = Math.random() < 0.7;
  const sid = `sub_${uid}`;
  const now = Date.now();
  let t = now - rnd(2, 30) * 86_400_000;
  const at = () => {
    t = Math.min(t + rnd(1, 8) * 3_600_000, now - 60_000);
    return { occurredAt: new Date(t).toISOString() };
  };
  const steps: Payload[] = [
    { event: 'user.signed_up', userId: uid, method: pick(['email', 'google']) },
    { event: 'user.logged_in', userId: uid, method: 'password' },
    { event: 'trial.started', userId: uid, plan: plan.name, endsAt: isoDate(new Date(t + 14 * 86_400_000)) },
    { event: 'trial.ended', userId: uid, plan: plan.name, outcome: converts ? 'converted' : 'expired' },
    ...(converts
      ? [
          { event: 'subscription.started', userId: uid, subscriptionId: sid, plan: plan.name, planId: plan.id, amount: plan.amount, interval: plan.interval, ...c },
          { event: 'subscription.renewed', userId: uid, subscriptionId: sid, plan: plan.name, planId: plan.id, amount: plan.amount, interval: plan.interval, ...c },
        ]
      : []),
    { event: 'order.completed', userId: uid, orderId: `ord_${uid}`, total: product.price, ...c, fee: money(product.price * 0.029 + 0.3),
      items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1, cost: product.cost }] },
    { event: 'goal.completed', userId: uid, goal: goal.name, ...(goal.value ? { value: goal.value, ...c } : {}) },
    { event: `custom.${custom.name}`, userId: uid, properties: custom.properties },
    { event: 'search.performed', userId: uid, term, results: searchResults(term) },
  ];
  const out: Result[] = [];
  for (const s of steps) out.push(await send({ ...s, ...at() }));
  return out;
}

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (!rateLimitOk(`demo:${ip}`, 60, 60_000)) return jsonError(429, 'Too many requests. Please wait a moment.');

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Malformed JSON body.');
  }
  const { action, userId, visitorId, planId, fromPlanId, productId, orderId, outcome, term, reason, customers } = body || {};
  if (typeof userId !== 'string' || !userId || userId.length > 200) return jsonError(400, 'userId is required.');

  const base = { userId, ...(typeof visitorId === 'string' && visitorId ? { visitorId: visitorId.slice(0, 200) } : {}) };
  const plan = PLANS.find((p) => p.id === planId);
  const fromPlan = PLANS.find((p) => p.id === fromPlanId);
  const product = PRODUCTS.find((p) => p.id === productId);
  const subId = `sub_${userId}`;
  const out: Result[] = [];
  let newOrderId: string | undefined;
  const sub = (event: string, extra: Payload = {}) =>
    plan && send({ event, ...base, subscriptionId: subId, plan: plan.name, planId: plan.id, amount: plan.amount, interval: plan.interval, ...c, ...extra });

  switch (action) {
    case 'seed':
      for (const p of PLANS) out.push(await send({ event: 'plan.upsert', planId: p.id, name: p.name, amount: p.amount, interval: p.interval, ...c }));
      for (const p of PRODUCTS) out.push(await send({ event: 'product.upsert', productId: p.id, name: p.name, price: p.price, cost: p.cost, category: p.category, ...c }));
      break;
    case 'subscribe':
    case 'renew':
    case 'change': {
      const event = action === 'subscribe' ? 'subscription.started' : action === 'renew' ? 'subscription.renewed' : 'subscription.changed';
      const extra = action === 'change' && fromPlan ? { fromPlan: fromPlan.name, fromAmount: fromPlan.amount } : {};
      const r = await sub(event, extra);
      if (!r) return jsonError(400, 'bad plan');
      out.push(r);
      break;
    }
    case 'cancel':
      out.push(await send({ event: 'subscription.canceled', ...base, subscriptionId: subId, reason: typeof reason === 'string' && reason ? reason.slice(0, 200) : 'test cancel' }));
      break;
    case 'fail':
      out.push(await send({ event: 'subscription.payment_failed', ...base, subscriptionId: subId, ...(plan ? { amount: plan.amount, ...c } : {}) }));
      break;
    case 'buy':
      if (!product) return jsonError(400, 'bad product');
      newOrderId = `ord_${Date.now()}`;
      out.push(await send({ event: 'order.completed', ...base, orderId: newOrderId, total: product.price, ...c, fee: money(product.price * 0.029 + 0.3),
        items: [{ productId: product.id, name: product.name, price: product.price, quantity: 1, cost: product.cost }] }));
      break;
    case 'refund':
    case 'chargeback':
      if (typeof orderId !== 'string' || !orderId || !product) return jsonError(400, 'need orderId + productId');
      out.push(await send(action === 'refund'
        ? { event: 'order.refunded', orderId, amount: product.price, ...c, refundId: `ref_${orderId}`, reason: 'test refund' }
        : { event: 'order.chargeback', orderId, amount: product.price, ...c, refundId: `cb_${orderId}`, reason: 'test dispute' }));
      break;
    case 'login':
      out.push(await send({ event: 'user.logged_in', userId, method: 'password' }));
      break;
    case 'trial_start':
      if (!plan) return jsonError(400, 'bad plan');
      out.push(await send({ event: 'trial.started', ...base, plan: plan.name, endsAt: isoDate(new Date(Date.now() + 14 * 86_400_000)) }));
      break;
    case 'trial_end':
      out.push(await send({ event: 'trial.ended', ...base, outcome: outcome === 'converted' ? 'converted' : 'expired', ...(plan ? { plan: plan.name } : {}) }));
      break;
    case 'goal': {
      const g = pick(GOALS);
      out.push(await send({ event: 'goal.completed', ...base, goal: g.name, ...(g.value ? { value: g.value, ...c } : {}) }));
      break;
    }
    case 'custom': {
      const e = pick(CUSTOM_EVENTS);
      out.push(await send({ event: `custom.${e.name}`, ...base, properties: e.properties }));
      break;
    }
    case 'search': {
      const t = typeof term === 'string' ? term.trim().slice(0, 100) : '';
      if (!t) return jsonError(400, 'term required');
      out.push(await send({ event: 'search.performed', userId, term: t, results: searchResults(t) }));
      break;
    }
    case 'server_error':
      out.push(await send({ event: 'server.error', status: pick([500, 502, 404, 429]), path: pick(['/api/checkout/confirm', '/api/export', '/api/search']), method: 'POST', message: 'Simulated test error', count: rnd(1, 5) }));
      break;
    case 'server_metrics': {
      const requests = rnd(800, 5000);
      out.push(await send({ event: 'server.metrics', requests, errors: rnd(0, Math.min(25, requests)), avgMs: rnd(90, 320), p95Ms: rnd(350, 900), windowSeconds: 300 }));
      break;
    }
    case 'expense': {
      const e = pick(EXPENSES);
      out.push(await send({ event: 'expense.recorded', ...e, ...c }));
      break;
    }
    case 'adspend': {
      const a = pick(AD_SOURCES);
      out.push(await send({ event: 'adspend.recorded', ...a, amount: money(rnd(5000, 40000) / 100), ...c, date: isoDate(new Date(Date.now() - 86_400_000)), impressions: rnd(2000, 20000), clicks: rnd(40, 600) }));
      break;
    }
    case 'burst': {
      if (!rateLimitOk(`burst:${ip}`, 3, 60_000)) return jsonError(429, 'Burst is limited to 3 per minute.');
      const n = Math.min(Math.max(Number(customers) || 3, 1), 5);
      const stamp = Date.now().toString(36);
      const runs = await Promise.all(Array.from({ length: n }, (_, i) => simulateCustomer(`sim_${stamp}_${i}`)));
      out.push(...runs.flat());
      out.push(await send({ event: 'server.metrics', requests: rnd(800, 5000), errors: rnd(0, 20), avgMs: rnd(90, 320), p95Ms: rnd(350, 900), windowSeconds: 300 }));
      break;
    }
    default:
      return jsonError(400, 'unknown action');
  }
  return NextResponse.json({ results: out, orderId: newOrderId });
}
