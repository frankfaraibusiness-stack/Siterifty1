# Sitevento test SaaS

## Setup
1. `npm i`, copy `.env.example` → `.env.local`, fill in every value.
   - Sitevento: key/URL/site ID are hardcoded in `lib/sitevento.ts` (server-only); env vars override if set.
   - Firebase Admin: service-account JSON from Project Settings → Service accounts.
2. In Sitevento → /dashboard/api turn ON every permission this app sends, or events are refused with `403 event_not_permitted`:
   Subscriptions, Plans & pricing (plan-catalog), Orders, Refunds & chargebacks, Product catalog, Expenses, Marketing spend (ad-spend),
   Sign-ups, Logins, Trials, Goals, Custom events, Site search, Server errors, Server metrics.
3. `npm run dev`.

## Try it
- `/signup` creates a real Firebase Auth account **server-side, via Admin SDK only** and reports
  `user.signed_up` to Sitevento. There is no real login/session in this app — the browser just
  keeps the returned `{ uid, name, email }` in `localStorage` so the demo events below have a
  stable user to attach to. Signing up again (even with the same browser) just creates another
  account; it's for generating test data, not for authenticating real users.
- On the home page: sync plans & products, subscribe, switch plan, renew, fail a payment,
  cancel, buy, refund, chargeback, login, trials, goals, custom events, search, expenses, ad spend,
  server errors/metrics — each calls `/api/demo`, which sends the matching event to
  `/api/ingest` on Sitevento using your server-side API key.

## Deploy to Vercel
Add the same env vars from `.env.example` in Project Settings → Environment Variables. You said
Admin SDK is already set up in Vercel — just confirm `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
and `FIREBASE_PRIVATE_KEY` are the names used there, or rename the ones in `lib/firebaseAdmin.ts`
to match what you already have.

## Test data
`Simulate 3 customers` sends ~35 events for fake `sim_*` users (sign-up → login → trial → subscription → order → goal →
custom event → search), back-dated over the last 30 days with `occurredAt` so charts have a shape. **Every accepted event uses one visit of the
monthly allowance**, and with an `sv_live_` key it lands in real analytics — use an `sv_test_` key (edit `lib/sitevento.ts`) to keep it out.
