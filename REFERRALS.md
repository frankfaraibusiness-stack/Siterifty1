# Referral programme ("Refer & earn", /referrals)

$1.00 is paid to the referrer, ONCE per referred person, when that person's total reel XP reaches 1,000.
Tune it in `lib/referrals.js` (REFERRAL_XP_TARGET, REFERRAL_BONUS_MILLS).

## Flow
1. `/referrals` shows the member's personal link, built from the address the page is open on (no hardcoded domain).
2. `/r/CODE` stores the code in the `gta6fb_ref` cookie (30 days, HTTP-only) and redirects home.
3. A NEW account created in that browser (email sign-up or first Google sign-in) calls `claimReferral`
   -> `referrals/{newUid}` is created and the referrer's `referralCount` goes +1.
4. When the referred member's XP crosses 1,000 (`lib/videos-data.js` submitEvents) `settleReferral` credits the
   referrer's `users/{uid}.walletMills` and writes `wallet_ledger/referral_{referredUid}` (fixed id = never paid twice).
   The dashboard also retries any unpaid referral that already has the XP.

## Files
- lib/referrals.js, lib/referrals-data.js, app/r/[code]/route.js, app/api/referrals/route.js
- app/referrals/page.js, app/referrals.css, components/referrals/{LinkPanel,Dashboard,Estimator}.js
- hooks: app/api/auth/signup, app/api/auth/google, lib/videos-data.js
- extras: side menu entry, sitemap, robots, cookie policy list (lib/site.js), Help Center answer (lib/help.js)
- tests/referrals.test.mjs

## Known limits / to decide
- Not built or linted here (no node_modules, no network). Run `npm install && npm run build && npm run lint && npm test`.
- Withdrawals: no withdraw flow exists yet. The page says the balance can be withdrawn, so build that or change the copy.
- Wallet is in test mode (`INFINITE_WALLET = true` in lib/gifts.js): the displayed balance ignores `walletMills`
  until you set it to false. Referral credits are still stored.
- Dashboard list shows up to 200 referrals (avoids a composite index). Totals are counters and stay correct.
- No notification is sent to the referrer when a payout lands (it shows on the dashboard).
