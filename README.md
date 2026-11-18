# GTAFanbase

A fan social-feed UI for the world of GTA6 / Leonida, built with Next.js 16 (App Router) and React 19.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Requirements

- Node.js 22.x (pinned in `package.json` `engines`; also set Vercel > Settings > General > Node.js Version to 22.x)
- A Firebase project with Auth (email/password), Firestore and (optionally) Storage

## Project structure

```
app/
  layout.js, page.js, globals.css   Root layout, home feed, theme styles
  api/                              Auth, posts, profile, uploads route handlers
  create/  p/[id]/  u/[username]/   Composer, single post, profile pages
  search/  profile/                 Search page, redirect to your own profile
  media/ video/ avatar/             Image, video-stream and avatar endpoints
components/                         UI (PostCard, CommentsSheet, AuthModal, ...)
  composer/                         Multi-step post composer
lib/                                Server data access, Firebase Admin, schema, helpers
```

## Fixing `ERR_REQUIRE_ESM ... jose ... jwks-rsa`

`firebase-admin` uses `jwks-rsa`, which `require()`s `jose`, and newer `jose` versions are ESM-only. The fix is one line: `jose` is pinned to `4.15.9` in `package.json` dependencies. After pulling, delete `node_modules` and your lockfile, run `npm install`, and redeploy.

## Feed data (real, Firestore via Admin SDK)

The home page (`app/page.js`) is an async Server Component that reads posts and stories straight from Firestore using the Admin SDK (`lib/feed-data.js`) — no client Firestore SDK, same service-account credentials already used for Auth. The page is marked `export const dynamic = "force-dynamic"` so likes/saves and new posts are never stale from caching.

Posts are created from `/create` (see below). Stories have no UI yet, so the `stories` collection stays empty unless you add documents in the Firebase Console. When there are no posts the feed shows a clean empty state (`components/EmptyFeed.js`).

### Firestore schema

**`posts/{postId}`**
```ts
{
  user: string,              // author handle, e.g. "lucia.ray"
  avatarA: string,            // hex color, avatar gradient start
  avatarB: string,            // hex color, avatar gradient end
  location: string,
  text: string,
  tag: string | null,
  media: {                    // same shape PostMedia.js already expects
    type: "16x9" | "1x1" | "grid",
    grid?: "g2" | "g3" | "g3v" | "g4" | "g5",
    tiles: [{ a: string, b: string, overlay?: string }]
  } | null,
  likedBy: string[],          // uids who liked the post
  savedBy: string[],          // uids who saved the post
  comments: number,
  shares: number,
  createdAt: Timestamp,       // Firestore server timestamp
}
```

**`stories/{storyId}`**
```ts
{
  username: string,
  gradient?: string,          // CSS gradient string, or...
  colorA?: string, colorB?: string, // ...two hex colors to build one
  createdAt: Timestamp,
  hearts?: { [uid]: { username: string, at: Timestamp } }, // set by /api/stories/like
}
```

Hearts: anyone signed in can heart someone else's story (`POST /api/stories/like { id, liked }`); only the story's owner sees the count and the list of people (`GET /api/stories/like?id=`). Hearts live on the story doc, so they go when the story is deleted or expires.

### New API routes

| Route | What it does |
|---|---|
| `POST /api/posts/like` | Toggles the current user's like on a post (requires session cookie) |
| `POST /api/posts/save` | Toggles the current user's save on a post (requires session cookie) |

Both run as a Firestore transaction and are rejected with `401` if there's no valid session — `PostCard.js` calls these optimistically and rolls back on failure (e.g. if you're logged out).

## Auth (real, server-side, Firebase Admin SDK)

Clicking **"Join the Heist"** opens a themed modal (`components/AuthModal.js`) with Log In, Sign Up and Forgot Password views, wired to real API routes under `app/api/auth/`:

| Route | What it does |
|---|---|
| `POST /api/auth/signup` | Creates the user via Admin SDK, sets a `username` custom claim, mints a session cookie |
| `POST /api/auth/login` | Verifies the password, mints a session cookie |
| `POST /api/auth/logout` | Clears the session cookie |
| `GET /api/auth/session` | Returns the current signed-in user (or `null`), verified server-side |
| `POST /api/auth/forgot-password` | Generates a password-reset link via Admin SDK (does **not** send email — see below) |

**Why a tiny REST call alongside the Admin SDK:** the Admin SDK can create and manage users, but it has no API to verify a password or sign a user in — Google's own docs confirm that check only exists in the client SDK or via the Identity Toolkit REST endpoint. To keep everything server-side (no Firebase client SDK ever loaded in the browser), `lib/identity-toolkit.js` calls `identitytoolkit.googleapis.com` directly from our API routes, using the project's **Web API key** (safe to use server-side — it only identifies the project, it's not a secret). Session cookies are then minted and verified entirely with the Admin SDK (`createSessionCookie` / `verifySessionCookie`), stored as a secure, HTTP-only cookie.

**Forgot password:** per your setup, this does not send Firebase's built-in email. It generates the reset link with `auth.generatePasswordResetLink()` and returns it in the response (`{ ok: true, link }`) so you can pipe it into your own email sender (Resend, SendGrid, etc.). Swap the `return NextResponse.json({ ok: true, link })` line in `app/api/auth/forgot-password/route.js` for your actual send call when ready — right now the modal just shows a neutral "check your email" style message without exposing the link to the browser.

### Environment variables

Only the three Admin SDK credentials are secrets, so only they belong in Vercel (and `.env.local` for local dev):

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

`FIREBASE_PRIVATE_KEY` must keep its `\n` sequences (either as literal two-character escapes, which `lib/firebase-admin.js` un-escapes, or as real newlines; both work).

Everything else Firebase needs (Web API key, auth domain, storage bucket, app id) is public project config and lives in `lib/firebase-config.js`. The server uses the Web API key for the password check described above, and the bucket for video uploads. You can still override any of them with an env var of the same name, but nothing has to be set.

## Profile pages

`/u/<username>` shows a user's banner, avatar, bio, stats and a scrollable grid of their posts; the owner gets an edit modal (`PUT /api/profile`). `/profile` redirects to your own. Profile data lives in `users/{uid}` (see `lib/profile-data.js`).

## Search

`/search?q=...&type=all|posts|people` is rendered entirely on the server (`lib/search-data.js`): it scans the newest 400 posts and the profile list, scores matches (all terms must match; `#tag` and `@user` work), and returns highlighted results. The search bar is a plain GET form, so it works without JavaScript. The only client code is the mic button (`components/VoiceSearchButton.js`), which uses the browser's Web Speech API to put your spoken words into the box and submit. It needs HTTPS (or localhost) and is hidden in unsupported browsers such as Firefox.

Avatars in results come from `GET /avatar/<username>` so base64 images never bloat the page HTML.

## Comments

Tapping **Comment** (or the "N comments" count) on a post opens `components/CommentsSheet.js`: a bottom sheet on phones (swipe the header down to dismiss, rises above the keyboard) and a dialog on desktop. Comments live in `posts/{postId}/comments/{commentId}` (`{ uid, user, text, likedBy, createdAt }`) and the post's `comments` number is updated in the same transaction.

| Route | What it does |
|---|---|
| `GET /api/posts/comments?postId=` | Latest 100 comments + the signed-in viewer |
| `POST /api/posts/comments` | Add a comment (signed in, max 500 chars) |
| `DELETE /api/posts/comments` | Delete a comment (its author, or the post's author) |
| `POST /api/posts/comments/like` | Toggle a like on a comment |

## Create a post (`/create`)

Signed-in users get a **Create** button in the header and a launcher card on the home feed. `/create` is a four-step composer (**Format → Create → Settings → Review**) with a live preview that renders the real `PostCard`, so what you see is what the feed shows. Deep-link a format with `/create?type=poll` (`post`, `video`, `poll`, `theory`).

| Format | What it does |
|---|---|
| **Photo post** | Up to 4 photos. Drag, drop, browse or paste from the clipboard. Images are compressed in the browser, can be reordered, and carry alt text. |
| **Video clip** | Upload an MP4/MOV/WebM (Firebase Storage, direct from the browser with a progress bar) **or** paste a YouTube link. Poster frame and duration are read from the file. |
| **Poll** | 2–6 options, 1h/1d/3d/7d timer, optional multi-select. Votes are real: one per account, changeable until the poll ends. |
| **Theory** | Title, write-up, a confidence slider, optional evidence photos and a built-in **Facts / Cap** verdict vote. |

**Settings:** visibility (everyone / only me), comments on/off (enforced by the comments API), hide like count, allow sharing, spoiler cover, show-results-first (polls), pin to profile, and **scheduling** up to 30 days ahead (the post is stored with a future `createdAt` and simply isn't returned until then).

Also included: autosaved text drafts with a restore prompt, an unsaved-changes warning, server-side validation that shares `lib/post-schema.js` with the browser, an 8-second posting cooldown, `/p/[id]` single-post pages (share links, link previews), and a ⋯ menu on posts with **Copy link** and **Delete post** (author only).

### New / changed Firestore fields on `posts/{postId}`

```ts
{
  uid: string,                      // author uid (older posts only have `user`)
  type: "post" | "video" | "poll" | "theory",
  title: string,
  tags: string[],  tag: string|null, // `tag` is "#A #B" so existing search/trending keep working
  media:
    | { type: "images", count: number, alts: string[] }      // bytes in posts/{id}/media/{n}
    | { type: "video", kind: "youtube", ytId: string }
    | { type: "video", kind: "storage", hasPoster: boolean, seconds: number }
    | (legacy gradient tiles, unchanged) | null,
  poll: { kind: "poll"|"verdict", options: string[], multi: boolean, endsAt: Timestamp|null } | null,
  votes: { [uid]: number[] },       // never sent to the browser, only counts + the viewer's picks
  theory: { confidence: number } | null,
  settings: { visibility: "public"|"private", comments, hideLikes, allowShare, spoiler, resultsFirst, pinned },
  createdAt: Timestamp,             // the publish time (future = scheduled)
}
```
Images live in a `media` subcollection (like profile avatars live on the user doc) and are served as real images from `GET /media/[postId]/[index]`, so feed HTML never carries base64. Uploaded videos stream from `GET /video/[postId]` with HTTP Range support. Both only serve private or not-yet-live posts to their author.

### New routes

| Route | What it does |
|---|---|
| `POST /api/posts/create` | Validates and publishes any format (signed in, cooldown, size limits) |
| `POST /api/posts/vote` | Sets or clears the viewer's vote on a poll or theory verdict (transaction) |
| `POST /api/posts/delete` | Deletes your post, its media, comments and video file |
| `POST /api/uploads/video` | Returns a 20-minute signed upload URL (501 when no bucket is configured) |
| `GET /media/[postId]/[index]` | Serves a post image |
| `GET /video/[postId]` | Streams an uploaded video |

### Video uploads

Uploads go to the bucket in `lib/firebase-config.js` (`itzhoyoo-bc993.firebasestorage.app`). Two one-time steps in the Firebase/Google Cloud console:

1. Make sure Storage is set up for the project (Build > Storage > Get started) and the service account can write to it (*Storage Object Admin*; Firebase Admin accounts usually already can).
2. Allow browser uploads with a CORS rule (replace the origins with yours):
   ```json
   [{ "origin": ["https://your-domain.com", "http://localhost:3000"], "method": ["PUT"], "responseHeader": ["Content-Type"], "maxAgeSeconds": 3600 }]
   ```
   Save it as `cors.json` and run `gcloud storage buckets update gs://itzhoyoo-bc993.firebasestorage.app --cors-file=cors.json`.

If Storage isn't ready yet, the upload fails with a clear message and YouTube links keep working. Streamed videos count toward your hosting bandwidth; the 60 MB cap is `LIMITS.videoMB` in `lib/post-schema.js`.

### Notes

- Visibility offers *Everyone* and *Only me* because the app has no follow system yet. Add a *Followers* option when one exists.
- Date-range feed query (`createdAt <= now` ordered by `createdAt`) uses the single-field index Firestore creates automatically.
- Photos and uploaded videos aren't kept in the local draft (too large for localStorage); text, tags and settings are.

## Plans and the Upgrade page (`/upgrade`)

Four plans, defined in one file: `lib/plans.js`. Prices are typed once, in US dollars, and shown to each visitor in their own currency (see **Prices in local currency** below).

| Plan | Price (USD) |
|---|---|
| Boardwalk Drifter (free) | $0.00 |
| Getaway Wheelman | $4.99/mo |
| Heist Mastermind | $9.99/mo |
| Vice Kingpin (everything) | $19.99/mo |

- **Where the button is:** the owner's profile (`/u/<you>`) has an **Upgrade** button next to Edit profile, Share and Log out. It opens `/upgrade`.
- **Page contents:** themed plan cards, a "How pricing works" section, a side-by-side limits table and a Q&A. Cards, table and FAQ all read from `lib/plans.js`, so edit the names, prices, limits and answers there.
- **Free while testing:** `FREE_WHILE_TESTING` in `lib/plans.js` is `true`, so switching to any plan costs nothing. When you add real billing, set it to `false` — `POST /api/plan` then refuses paid plans (402) until you add the payment step there.
- **New accounts:** signup (email and Google) writes `plan: "drifter"` on `users/{uid}`. Older accounts with no `plan` field read as Drifter via `lib/user-plan.js`.
- **Limits are display only.** Nothing enforces them yet. When you add enforcement, read the user's plan with `getUserPlan(uid)` and compare against the numbers in `LIMIT_GROUPS`.

| Route | What it does |
|---|---|
| `GET /api/plan` | Returns `{ plan }` for the signed-in user |
| `POST /api/plan` | Switches the signed-in user's plan (`{ plan: "wheelman" }`) |

## Dynamic profile pictures and plan badges

- **Profile pictures on posts are live.** Posts no longer rely on what was saved when they were created. Every time posts are shown (feed, `/p/[id]`, profiles, search) the author's current theme colours, profile picture and plan are read from `users/{uid}` (`loadAuthors` in `lib/feed-data.js`). Change your picture and all your old posts update. Posts without a `uid` (very old ones) are matched by username. The `avatarA`/`avatarB` saved on a post are now only a fallback.
- **Plan badges** (`components/PlanBadges.js`, defined per plan in `lib/plans.js`): free has none; Getaway Wheelman has 1 (verified); Heist Mastermind has 2 (verified, target); Vice Kingpin has 3 (gold verified, crown, diamond). Each uses its plan's colour. They show next to names on posts, comments, search results, profiles and the plan cards.
- **Member comments are pinned for a limited time** so every plan has value and free users can rank too: Wheelman 24 hours, Mastermind 3 days, Kingpin 7 days (`PIN_HOURS` in `lib/plans.js`). The deadline is saved on the comment when it's posted (`pinnedUntil`, `pinPlan` on `posts/{id}/comments/{id}`), so changing plan later never changes old comments. There is no cron job: pins are checked when comments load, and the open comments sheet shows a live countdown and drops a comment out of the pinned group the moment its time runs out. Pinned comments are tinted in the plan colour with a countdown chip, sorted above the rest (higher plan first, then Newest or Top). After expiry the comment ranks normally and keeps the member's badges. Comments posted before this feature have no pin. The browser clock is lined up with the server's, so a wrong device clock can't change a pin's length.

## Settings (`/settings`)

Five panels (phones show a list, tapping a row slides the panel in; desktops show list + panel). Open one directly with `/settings#look`. Everything saves automatically to `users/{uid}.prefs` (`lib/settings.js`, `lib/user-prefs.js`) through `PUT /api/settings`.

| Panel | What it controls |
|---|---|
| **Character** | Name, bio, location, website, photo, banner, profile accent, public/private account, change password, download my data |
| **The Stash** | Default for new posts (always public / always private / ask every time), default comments/likes/sharing/spoiler/draft autosave, one-tap changes to all existing posts |
| **Wanted Level** | Exposure stars, show me in search, who can comment, blocked people |
| **Leak Filter** | Spoilers (cover/show/hide), muted words, stories rail, post box, feed order and length |
| **City Look** | Site-wide colour presets, custom colours, night tint, depth, glow, interface size, reduce motion |

Where each setting is enforced: private account and search visibility (`lib/feed-data.js`, `lib/search-data.js`, profile page), blocked list and comment rules (`app/api/posts/comments/route.js`), Leak Filter (`lib/viewer-filters.js`, home page), Stash defaults (`lib/post-schema.js` `emptyDraft`, composer), City Look (`lib/look.js`, cookie `gta6fb_look` read in `app/layout.js`; `globals.css` colours now use CSS variables).

Notes: handles can't be changed and accounts can't be deleted from settings yet. Media URLs (`/media`, `/video`) of a private account's public posts are still served if someone has the direct link.

## Communities (GTA 6 only)

`/communities` is the discovery feed (search, topic chips, trending, "your communities"), `/communities/new` is a 7-step creation wizard (Focus → Name → Look → Access → Rules → Controls → Launch, with a live preview card and an autosaved draft), `/c/[slug]` is the community page (feed, about, members) and `/c/[slug]/manage` holds the admin controls. Every community must pick a GTA 6 focus topic, always carries the locked rule "Keep it GTA 6", and creation requires a pledge plus a small off-topic word check (`offTopicReason` in `lib/community-schema.js`).

**Access:** *Public* = anyone joins instantly and it is always listed. *Private* = people answer your questions (up to 5) and wait for approval; posts and the member list are members-only, and you can choose whether the card is listed in search.

**Roles:** owner > admin > moderator > member. Admins edit settings and manage mods; only the owner manages admins, transfers ownership or deletes. Mods remove/ban members, delete and pin posts, and approve requests (switchable).

**Controls (per community):** lock chat (everyone / mods & admins / admins only), links and images (everyone / staff only / nobody), leak policy (allowed / covered behind a tap-to-reveal / banned), slow mode, new-member wait, mods-can-approve, show member list.

Firestore: `communities/{id}` with subcollections `members`, `requests`, `bans`, `assets` (avatar/banner), `posts` (+ `media`); `users/{uid}.communityIds` and `.communityPending` power "your communities" without composite indexes. All writes go through `POST /api/communities` (`action` = create, join, request, approve, set-role, update, post, ...). Images are served by `GET /cmedia/...`. No new env vars or indexes are needed.

## Public info pages (/terms /privacy /cookies /guidelines /copyright /disclaimer /help /contact /about)

Every page shares one frame (`components/info/InfoShell.js`), one stylesheet (`app/info.css`, every rule starts with `.ip`) and one source of truth, so you change a thing in one place:

| To change... | Edit |
| --- | --- |
| Page names, order, colours, blurbs, side-menu links | `INFO_PAGES` in `lib/site.js` |
| Contact email, operator name, governing law, DMCA agent, response time, minimum age, "last updated" date | `CONTACT` and `LEGAL` in `lib/site.js` (or set `NEXT_PUBLIC_CONTACT_EMAIL` in Vercel) |
| The "not affiliated with Rockstar / Take-Two" wording | `NOT_AFFILIATED` in `lib/site.js` |
| Cookies and browser storage table | `STORAGE_ITEMS` in `lib/site.js` |
| Third-party services listed in Privacy and Cookies | `PROVIDERS` in `lib/site.js` |
| Plan names, prices, benefits, comparison table, plan FAQ | `lib/plans.js` (used by `/upgrade`, `/about#plans`, the side menu and the Terms) |
| Help Center questions and answers | `lib/help.js` |
| Contact form topics | `CONTACT_TOPICS` in `lib/site.js` |

Bump `LEGAL.updated` and `LEGAL.updatedISO` whenever you change the legal text. `/sitemap.xml` and `/robots.txt` are generated from the same list. Contact messages are saved in the Firestore collection `contactMessages`.


## Prices in local currency

Every price is typed once, in **US dollars** (`price` in `lib/plans.js` and `lib/perks.js`). Visitors see it in their own currency at the live exchange rate.

- **Country to currency:** `lib/fx.js` reads the visitor's country from Vercel's `x-vercel-ip-country` header (Cloudflare's `cf-ipcountry` also works). With no IP header, such as on localhost, it uses the region in the browser language (`en-ZA` means South Africa). `lib/currency.js` maps the country to a currency; anything unlisted shows USD. Euro countries all get EUR.
- **Live rate:** fetched on the server from `open.er-api.com` (free, no key, updated daily), with `@fawazahmed0/currency-api` on jsDelivr as a backup. Next caches the answer for an hour (`REVALIDATE_SECONDS` in `lib/fx.js`). If both sources are down and there is no earlier answer, everyone sees USD. The free source asks for credit, which is the "Rates by Exchange Rate API" link in the small print.
- **Clean rounding, never down:** the converted price is rounded UP to the roundest number that stays within `ROUND_UP_TOLERANCE` (3.5%) of the real conversion. `$10` at R16.598 is R165.98, shown as **R170**. When no round number is close enough (GBP, EUR, CHF and other strong currencies where `$4.99` is about `£3.79`), the plain live conversion is shown instead (**£3.79**). Raise `ROUND_UP_TOLERANCE` in `lib/currency.js` for rounder numbers, lower it for numbers closer to the real rate.
- **Dollar-family currencies** other than USD get a prefix so they are not read as US dollars: `CA$`, `A$`, `MX$`.
- **Where it shows:** upgrade cards and comparison table, `/about` plan cards, the Perks Shop, and prices written inside FAQ, Terms and Help text. A small note under the prices says which currency is shown (hidden for USD visitors).
- **Prices inside copy:** text strings use a token, `{{usd:4.99}}` (build it with `usdToken(price)` from `lib/currency.js`). `renderRich` turns it into the local price; `plainText`, search and the FAQ JSON-LD keep US dollars.
- **In your own components:** `<Money usd={4.99} />`, or `const money = useMoney(); money(4.99)` for template strings. Both read the visitor's currency from `CurrencyProvider`, which the root layout fills in on the server, so there is no flash of dollars on first paint.
- **Checkout later:** nothing is charged yet. When you add payments, decide which currency you really bill in. The local price shown is a display conversion of the USD price.

## AI chat bubble (bottom-left)

`components/AiBubble.js` + `app/aibubble.css`, mounted once in `app/layout.js`, so it is on every page. It is **design only**: the bubble itself does nothing when pressed (no chat yet). It floats, blinks, its eyes follow the pointer, stars orbit it and an XP ring fills; all of that stops with the *Reduce motion* setting or the phone's reduced-motion option.

The small **X** on its top corner asks how to hide it:

| Choice | What happens |
|---|---|
| Just this session | Hidden until the tab is closed (`sessionStorage`). Back on the next visit. |
| Never show it again | Hidden for good. Saved as the cookie `gta6fb_aibubble=hide` (the server reads it, so the bubble is not even in the first paint) and, when signed in, as `look.aiBubble = "hide"` on `users/{uid}.prefs`. |

**Turning it back on:** Settings > City Look > *AI chat bubble* > *Show the AI chat bubble*. The setting lives in the `look` section (`aiBubble: "show" | "hide"` in `lib/look.js`) and is changed with `setAiBubble()`. If this device and the account disagree, *hide* wins and both end up hidden when Settings is opened. When the chat is built, only `AiBubble` needs to start doing something on press; the hide and show plumbing stays as is.

## Perks Shop (`/perks`)

One-time purchases that stay on the account (separate from the monthly plans on `/upgrade`). The catalog lives in `lib/perks.js` (prices in USD, shown in the visitor's currency); owned perks are stored as an array of ids on `users/{uid}.perks`.

| Perk | Price (USD) | What it does |
| --- | --- | --- |
| Forever Pin | $4.99 | Every comment the owner posts is pinned to the top of its thread, with no expiry (`pinForever` + a far-future `pinnedUntil` saved on the comment). |
| Essay Mode | $2.99 | Comment limit goes from 500 to 1,500 characters (enforced in `app/api/posts/comments`). |
| Neon Glow | $1.99 | Animated neon frame around the owner's comments, in their profile accent colours. |
| Vice City Pack | $3.99 | Unlocks 3 exclusive profile accents (`PERK_THEMES` in `lib/profile-themes.js`), enforced in `app/api/profile`. |
| Story Extender | $3.99 | Stories stay up 72 hours instead of 24 (`expiresAt` set in `app/api/stories`). |
| Big Bio | $1.99 | Bio limit goes from 160 to 400 characters (enforced in `app/api/profile`, shown in both profile editors). |
| Supporter Badge | $2.49 | Gold star next to the owner's name on posts, comments, profile and search. |
| Gradient Name | $2.99 | The owner's name becomes a moving gradient of their two accent colours, everywhere it shows. |
| Halo Avatar | $2.49 | Pulsing glow in the owner's accent colours around their avatar, everywhere it shows. |
| Neon Nights Pack | $3.99 | Three more exclusive accents (Midnight Drive, Laser Lime, Cherry Cola), enforced in `app/api/profile`. |

The three cosmetic perks (Supporter Badge, Gradient Name, Halo Avatar) are visible to everyone, so they travel with the author as a short `flair` list (`publicFlair` in `lib/perks.js`) and render through `components/Flair.js`. Nothing else a person owns is ever sent to other viewers.

No payment is connected yet. While `PERKS_FREE_WHILE_TESTING` is `true` in `lib/perks.js`, "Get" unlocks the perk for $0. Set it to `false` and `app/api/perks/route.js` refuses paid perks (HTTP 402) until you add the checkout step there.

## Gift Shop (`/gifts`) and the wallet

Members send each other gifts, paid from a **wallet** (never a card). Real pages (not a modal), server-rendered so search engines see every gift: `/gifts` (catalog with search, game / type / rarity filters and sort) and `/gifts/{id}` (the step-by-step checkout: **Gift, Recipient, Review, Sent**). The header on these pages swaps the right side for **Return home**, with the centred wallet balance under it.

- **Catalog:** `lib/gifts.js` (about 150 gifts, GTA 1 to GTA VI plus fan favourites, each with its own USD price; rarity comes from the price). Add a row to add a gift. Shop grid: 4 per row on desktop, 2 per row on phones (even at 320px). The Perks Shop uses the same 4 / 2 layout.
- **Where a gift is going is kept:** Gift links on a comment, the post "..." menu and a profile open the shop with `?to=handle&ctx=comment|post|profile&post=ID&c=ID`. The destination stays through browsing and checkout. From the menu (`ctx=shop`) the sender types a handle (looked up live on the server).
- **Fees (shown in the checkout and charged by the server):** gift price + fixed **$0.10** + **5% of the gift price**. All money is whole **mills** ($0.001), so the wallet shows `$0.000`.
- **Server side only:** `POST /api/gifts` takes just a gift id, the destination, a note and an idempotency key. `lib/gifts-data.js` looks the price up itself, works out the receiver from the comment / post in the database, checks blocks and self-gifting, and charges the wallet in a Firestore transaction (a retried request is never charged twice; not enough balance gives HTTP 402).
- **Firestore:** `users/{uid}.walletMills` (integer; missing = $0.000, **no top-up page yet**, so set it in the Firestore console to test), `giftsSent` / `giftsReceived` counters, `gifts/{uid}_{requestId}` (full record incl. price breakdown and source), `wallet_ledger/{same id}`, `users/{toUid}/gifts_received/{id}` (shown on the profile), `giftCount` on the comment / post it came from.
- **Gifts in the comments:** a gift sent from a comment shows right under that comment (who sent it, the gift, their message); a gift sent from a post shows in a "Gifts for this post" strip at the top of the comments sheet. They are saved as a public copy at `posts/{postId}/gifts/{id}` (no money details) and returned by `GET /api/posts/comments` as `gifts`. Gifts from blocked members are hidden like their comments. Because the message is public there, the checkout says so.
- **Default message:** a gift sent with no message still shows a friendly line in the comments and on the profile, picked from the gift's type (`giftMessage` in `lib/gifts.js`) and always the same for the same gift. The stored message stays empty, so older gifts get one too.
- **Animations:** every gift has its own idle motion plus a hover / tap burst (24 idle and 8 hover styles in `app/gifts.css`, themed: cars slide, helicopters fly, fire flickers, cash drops). `lib/gifts.js` hands each gift a unique idle + hover pair and its own speed, and `tests/gifts.test.mjs` fails if two gifts ever share a pair (room for 192 gifts). Epic gifts get a shimmer sweep; Legendary and Mythic also get a glowing aura. The same motion plays in the shop, checkout, comments and profile, and stops for people who prefer reduced motion.
- **Reuse later:** `kind` on each gift (`GIFT_KINDS`) is where perks or badges can be added; the page, checkout and API stay the same.

## Leonida World Hub (`/world`)

A GTA 6-only interactive community area linked from the main navigation and side menu. The hub includes:

- **Map discoveries:** a schematic Leonida area selector (Vice City, Port Gellhorn, Ambrosia, Mount Kalaga, Grassrivers, Leonida Keys and Other Leonida), member-submitted discoveries, and filters by area. It is an area index, not an official or geographically precise game map.
- **Character collection:** members can toggle Lucia and Jason in their personal collection (`users/{uid}.gta6Characters`).
- **Vehicle spotter:** members submit vehicle sightings by category; each signed-in member can rate a submission once from 1–5 stars.
- **Trailer frames:** members link a YouTube trailer, select a trailer and timestamp in seconds, and discuss that specific moment. Frame comments live in `gta6World/{id}/comments`.
- **Feature wishlist:** members submit ideas and can vote once per idea.
- **Predictions:** members create a question with 2–5 possible outcomes and vote once. The creator resolves the prediction; each correct voter receives 10 reputation points (`users/{uid}.gta6Reputation`).

All hub submissions are stored in `gta6World/{itemId}` with a `type` of `location`, `vehicle`, `trailer`, `wishlist` or `prediction`. Writes go through `POST /api/world` and require a valid signed-in session. Member-submitted discoveries, ratings and predictions are not verified by Rockstar and should be treated as fan contributions. No additional environment variables or Firestore indexes are required.

## Social features (replies, follows, friends)

- **Comment replies** – `POST /api/posts/comments` accepts `parentId`. Replies live in the same `posts/{id}/comments` collection with `parentId` (their top-level comment), optional `replyToUser`, and the top-level comment keeps a `replyCount`. Threads are one level deep; deleting a comment deletes its replies. Replies are fetched lazily with `GET /api/posts/comments?postId=…&parentId=…`. Comment likes use the existing `/api/posts/comments/like` route for replies too.
- **Follow** – `POST /api/social/follow { username, follow }`, stored in `follows/{fromUid}_{toUid}`.
- **Friends** – `POST /api/social/friend { username, action }` with `request | cancel | accept | decline | remove`, stored in `friendships/{uidA}_{uidB}` (`status: pending | accepted`). Incoming requests show on your own profile under "Friend requests".
- **Following feed** – the home page has a "For you / Following" switch (`/?feed=following`) for signed-in members.
- **Profile stats** – Posts / Likes / Comments / Saves now live in the profile's About tab (see "Profile page" below).
- Styles for all of the above are in `app/social.css`. None of the new queries need a composite Firestore index.

### More small features

- **Comments**: edit your own comment (`PATCH /api/posts/comments`, shows "edited"), `@handle` links to profiles (`components/MentionText.js`), long comments fold behind "Read more", an "Author" heart badge when the post's author liked a comment, and unsent comment text is kept per post in `localStorage`.
- **Profiles**: a "Follows you" chip, and the followers / following / friends counts open a list (`GET /api/social/list`; private accounts keep these lists private).

## Messages (`/messages`)

Direct messages between members, built on the follow / friend system above (no second social graph). The nav "Messages" pill and the side menu link to it, with an unread badge.

- **Who can message you** – Settings > Wanted Level > *Who can message you*: **Everyone · Friends & followers · Friends only · Followers only · No one** (`users/{uid}.prefs.safety.whoCanMessage`, default *Friends & followers*, so by default members can message the people they follow and their friends). Two more switches live there: **Read receipts** and **Show when I'm online**. It is enforced **on the server for every send** (`POST /api/messages/send`), not just in the UI. People you've already messaged can always reply, "No one" only blocks *starting* chats, and blocking someone cuts every tie (follows both ways, friendship) and hides the chat.
- **New message** (its own sheet: bottom sheet on phones, dialog on desktop) – search by handle (`@dav…`), see how you're connected, and **Message / Follow / Add friend / Profile** per person. The Message button shows a lock and the reason when the person's setting doesn't allow you yet. Also lists your friends, people you follow, and friend requests (Accept / Decline). Members who switched off "Show me in search", or are private, only come up on an exact handle.
- **Profiles** – a **Message** button next to Follow / Add friend (`components/messages/MessageButton.js`); it unlocks live the moment you follow or befriend someone.
- **Ticks and labels** – 1 tick + "Not delivered" · 2 ticks + "Delivered" · coloured ticks + "Seen". *Delivered* = the recipient's open site checked in; *Seen* = they opened the chat (and have read receipts on). Plus "Sending…" / "Failed · Retry", and a Message info sheet with the times.
- **Message actions (the 3 dots, long-press or swipe-to-reply)** – react, reply (quote), copy, edit your own text (15 min, shows "edited"), delete **for me** or **for everyone**.
- **GTA tools (the + button)** – *Session invite* (platform, mode, lobby code, player slots, time shown in each reader's own time zone), *Share a code* (lobby / crew / gamer ID / promo, optional "reveal" gate, one-tap copy), *Meet-up pin* (Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, with a note and a time), *Photos* (compressed, only the two people in the chat can open them), *Stickers*, and **Quick replies** ("Online tonight?", "Join my lobby?").
- **Custom emoji** – 39 original SVG emoji (`components/messages/GtaEmoji.js`, ids in `lib/chat-config.js`), used for the picker, reactions and in-text `:fire:` shortcodes. No system emoji.
- **Also** – typing indicator, online dot and "Active 5m ago", day dividers, "New messages" divider, jump-to-latest, load earlier, pin / mute / delete chat, optimistic sending with retry, unsent drafts kept per chat.

### How it works (no extra services)

There are no websockets. Every open page makes one tiny request (`GET /api/messages/summary`, 25 s, 5 s on `/messages`; `components/messages/MessageSync.js` in the root layout) that reads one document, marks waiting messages *delivered*, counts unread messages and pending friend requests, and records you as online. An open chat polls only for changed messages (`updatedAt > cursor`, about every 2.5 s) and the chat list only reloads when `inbox/{uid}.rev` changes. If you later want true push, swap `lib/message-sync.js` and the poll in `ThreadView.js` for Firestore listeners or SSE; the data model doesn't change.

### Firestore (Admin SDK only; no rules or composite indexes needed)

```
conversations/{uidA}_{uidB}            sorted pair, same id scheme as friendships
  users, names, last{id,from,type,text,at,deleted,delivered,seen}, unread{uid}, hasSent{uid},
  pinned{uid}, muted{uid}, clearedAt{uid}, hideLast{uid}, typing{uid}, sentAt{uid}
conversations/{id}/messages/{msgId}    from, to, type, text|sticker|invite|code|meetup|media, replyTo, rx{uid:emojiId},
                                       createdAt, updatedAt, deliveredAt, seenAt, readAt, editedAt, deleted, hiddenFor[]
conversations/{id}/media/{msgId}       { data: base64 jpeg }  (served by GET /api/messages/media/…, participants only)
inbox/{uid}                            { unread, rev, pending[convId], activeAt }
```

Friend requests are **not** stored here: the badge counts `friendships` where `to == you` and `status == "pending"` (two equality filters; if Firestore ever asks for an index it logs a link, and the badge just shows 0 until it exists).

### Routes

`GET /api/messages/summary` · `conversations` · `thread?with=handle|id=&since=&before=&read=1&meta=1` · `people?q=` (search) / no `q` (your crew) · `relation?username=` · `POST send` · `message` (react / edit / delete) · `conversation` (pin / mute / delete chat) · `typing` · `GET media/{convId}/{msgId}`. Follow and friend buttons call the existing `/api/social/follow` and `/api/social/friend`. Blocking (`/api/settings/blocked`) also removes follows and friendship.

### Files

`lib/chat-config.js` (shared options, limits, emoji ids, permission rules) · `lib/chat-social.js` (reads follows/friendships, permission checks, people search) · `lib/messages-data.js` (chats, delivery, actions) · `lib/message-sync.js` · `components/messages/*` · `app/messages/{page,loading,messages.css}`.

## Events page, Saved posts, trending tags and shortcuts

- **Events (`/events`)** – every event you're allowed to see in one place, rendered with the real event card (RSVP, countdown, add to calendar). Tabs: **Upcoming · Live now · This week · I'm going · Hosting · Past** (the last two need a login), each with a live count; filter by **place** (In-game / Real world / Online) and **kind** (Meetup, Watch party, ...); search by title, host, venue or tag. All state lives in the URL (`/events?when=week&mode=irl&cat=Car%20meet&q=vice`), so every view is shareable. `lib/event-data.js` reads events with one equality filter on `type` (no composite index) and `lib/event-filters.js` does the filtering and ordering. Private events and private accounts are hidden exactly as in the feed. Linked from the nav pills, the side menu and the sitemap; "Host an event" opens `/create?type=event`.
- **Saved posts (`/saved`)** – the posts you bookmarked, newest first, using the existing save button (`array-contains` on `savedBy`, no composite index). Only you can see it; it's in the side menu and blocked in `robots.txt`.
- **Trending tags** – a chip row on the home feed ("For you" tab) built from the posts already loaded, so it costs no extra reads. Each chip opens search for that `#tag` (`lib/trending.js`, `components/TrendingTags.js`).
- **Keyboard shortcuts** – `/` focuses search, `c` creates a post, `g` then `h / c / e / m / s / w` jumps to Home / Communities / Events / Messages / Saved / World, `?` lists them. They pause while typing and while another dialog is open (`components/KeyboardShortcuts.js`).
- **Polish (`app/enhance.css`, loaded last)** – keyboard focus rings, themed text selection and scrollbars, balanced headings, a quiet hover lift on feed cards, safe-area spacing for the scroll-to-top button, a "Skip to content" link (`components/SkipLink.js`), print styles, and `prefers-reduced-motion` support. On phones the four nav pills drop their icons so every label fits.

## Post card upgrades

All five formats (photo, video, poll, theory, event) share the same upgrades:

- **Typed cards**: a soft wash of the format colour, a matching hover, and a format badge with an icon (`app/cards.css`).
- **Clickable `#tags` and `@mentions`** in post text and in the tag row (`components/RichText.js`). The composer preview shows them but keeps them inert.
- **Media chips**: photo count, video length or YouTube (`components/MediaChip.js`).
- **Show more** on long text (never on the post's own page).
- **Polls**: Live / Final results pill, ticking countdown, Leading / Winner / Tied labels and a winner line.
- **Theories**: verdict chip, read time, show-more and a meter coloured by confidence.
- **Events**: Today / Tomorrow chip and a "Filling fast" capacity state.

The logic is in `lib/card-helpers.js` (pure, no imports) and tested with `npm test`,
which runs `tests/card-helpers.test.mjs` under three time zones (the day-label helpers depend on the viewer's zone).

## Event groups: status, countdown and host controls

Open an event's group chat and the panel starts with the event's name, date, status (starts in…, live now, ended) and a ticking countdown, so people are reminded what the chat is for. The host also gets two controls there (`components/EventGroup.js`, server side in `lib/event-group-data.js`, route `app/api/posts/group/route.js`):

- **End event** stores `event.closedAt` on the post. The event shows as ended everywhere (feed card, Events page, the group panel), nobody new can join, and the group chat stays open. It also works before the event starts, to call it off.
- **Delete group** wipes every message and closes the chat. The event stays up, and the host can **Start a new group** later. A small `deleted: true` marker is kept on `eventGroups/{postId}` so the group isn't quietly rebuilt.

Both are host-only and checked on the server again on every call.

## Polls: no expiry by default, visit-based clean-up

New polls never expire unless the author picks a length (`POLL_LENGTHS` in `lib/post-schema.js`; `poll.endsAt` is `null` for "No expiry"). A poll with a length is **deleted** (post, comments, votes) once its time is up. There is no cron job: `lib/poll-expiry.js` sweeps expired polls whenever someone loads the feed, a profile, search, saved posts or a post page, and when someone tries to vote on one. Until the sweep reaches a poll, `canView` in `lib/feed-data.js` already hides it. The sweep is one range query on `poll.endsAt` (Firestore's automatic single-field index covers it, so no composite index is needed). Theory "Facts or Cap" verdicts never expire.

## Community page layout

On a community's page the posts and the community's own information are kept apart. The posts sit in a framed box that scrolls on its own (`components/communities/CommunityFeed.js`), under a compact composer that opens when you click it, so the page stays short however many posts there are; a "Back to top" button appears inside the box. Posts load 20 at a time (`fetchCommunityPosts` in `lib/community-data.js`): the next page loads when you reach the end of the box, from `GET /api/communities/posts` (public communities for anyone, private ones for members only). Pinned posts always come first. About, what's allowed and the rules are one info panel: a sidebar on wide screens, and one folded "About & rules" bar above the feed on phones. The About tab shows the same information in full.

## Ads (`/advertise`)

Self-serve ads: advertisers create image or video ads, pay once for a budget, and the ads serve to live traffic.

- **Where they show:** home feed and community feeds (full card after every 4 to 5 posts), chats (compact row after every 5 messages). Each slot fetches ONE random ad via `GET /api/ads/serve`, only when it is about to scroll into view.
- **Pricing** lives in `lib/ads.js`: image $2 / 1k views + ($0.18 + 5%) tax; video $5 / 1k views + (10% + $0.50) fees; video max 30 s. Server and browser use the same `quote()`.
- **Payments:** `ADS_FREE_WHILE_TESTING` (lib/ads.js) is `true`, so launching and topping up record a TEST order and charge nothing. Set it to `false` and `/api/ads` refuses to launch or top up (402) until you add a payment step in `lib/ads-data.js` (`paymentGate`).
- **Tracking:** a view = 50% of the ad on screen for 1 s; counted once per slot, only while the ad has balance (never over-delivers). Clicks are tracked, not billed. Owners' own views/clicks are ignored. Counters are split by source (`feed` | `community` | `messages`) and by UTC day.
- **Firestore:** `ads/{id}` (+ `ads/{id}/media/0` for uploaded images / video posters), `adIndex/live` (ids that can serve per placement, cached 30 s), `adOrders/{id}`. Video files go to Storage at `ad-videos/{uid}/{adId}` (needs the same bucket + CORS as post videos). No composite indexes are needed.
- **Not built yet:** ad review/moderation, refunds, real checkout, per-user rate limits on ad creation.

## Post analytics and recommendations (all decided on the server)

**Tracking.** The browser can't report views, clicks, hashtags or sources. When the server serves a post in a list (home feed, Following, Saved, Events, the recommendation row, "More to explore") it signs a token (`lib/track-token.js`) that says exactly which post, which surface, to whom, and the post's fingerprint. The browser can only hand tokens back to `POST /api/posts/track`; the server re-checks every signature (edited, forged, expired, other-member and own-post tokens are all refused) and does all counting. Posts the server never sent can't be counted.
- **view** = the token's post was on screen for 1 s (bounded by what the server really sent), once per member/post/surface per 10 min; or a real browser opening `/p/{id}` directly (shared link, bookmark, refresh), counted by the post page itself (`sec-fetch-*` headers; crawlers, link previews, prefetches and in-app navigation don't count).
- **click** = the member opened the post from a list.
- Stored in `postStats/{postId}`: `views`, `clicks`, `vSrc` / `cSrc` per surface (`feed`, `following`, `recommend`, `postrec`, `saved`, `events`, `direct`) and `days.dYYYYMMDD.{v,c}` per UTC day. CTR = clicks / views, overall or per surface. No dashboard yet. One write per post per request, no reads.
- Dedupe and the per-minute cap live in server memory, so they are per instance (best effort on serverless). A shared store (Redis/Upstash) would make them exact.

**Interests.** `interests/{uid}` keeps counters for hashtags (`t`), game (`g`: gta6, gta5, gta4, San Andreas, ...), post type (`ty`) and authors (`au`). Written only by the server, from the post it loaded, with plain increments (one write, no read): like +3, save +3, comment +4, open +1 (also a direct visit). Entries fade with a 21-day half-life without any cleanup job (`lib/interests.js`).

**Recommendations** (`lib/recommend-data.js`, `lib/interests.js`). The member's profile (1 read) is matched against a shared pool of the newest 90 posts (cached 2 min for everybody), mixed with freshness and popularity; new members get trending. Every 4th slot is deliberately outside their taste, max 2 posts per author. Used by the "Recommended for you" row above the feed tabs and by "More to explore" under a post (ranked first, then newest-first).

## The Lobby (`/lobby`)

A live hangout for signed-in members, themed like a GTA Online lobby. Everything is polling over the existing Admin-SDK stack (no websockets, no new services, no composite indexes).

- **Who's here**: members check in every 15s while the page is open (`lobbyPresence/{uid}`); a check-in older than 45s drops off the list. Members with "Show when I'm online" or "Discoverable" off are counted but never listed. Blocked members never see each other. Each member picks a status (Cruising, Looking for crew, Watching trailers, Theorycrafting, Laying low).
- **Rooms**: six official rooms (defined in `lib/lobby-config.js`, `OFFICIAL_ROOMS`) plus member-run **sessions** (`lobbyRooms/{id}`). Chat is `lobbyRooms/{id}/messages`, fetched every 3s with a `since` cursor; your own message shows instantly. Authors and session hosts can remove messages; hosts can close a session. Sessions disappear after 6 quiet hours, chat older than 48h is purged lazily.
- **Plans**: how many sessions a member can run at once and how big they can be comes from `SESSION_RULES` in `lib/lobby-config.js` (Drifter 1 x 10 people ... Kingpin 5 x 50).
- **Crew finder**: one post per member (`lobbyCrew/{uid}`), platform / playstyle / region / crew size / note, lasts 48h. Others can filter, **Wave** (toggle) or Message. The poster sees who waved on their own card.
- **Starting soon**: events that are live or start within 3 days, from the existing events data.

Files: `lib/lobby-config.js` (shared rules, tested in `tests/lobby.test.mjs`), `lib/lobby-data.js` (Firestore), `app/api/lobby/route.js` (one route: `GET` live / chat, `POST` actions), `app/lobby/*`, `components/lobby/*`.

Known limits: a removed message disappears for the others only when they reopen the room (polling only fetches newer messages). Presence and chat reads scale with people online, so if the lobby gets busy, swap polling for Firestore listeners or a realtime service behind the same API.

## Profile page (`/u/[username]`)

A short header and one tab per kind of post. The header is the banner, name, actions, follower counts and a one-line bio; tapping the bio opens the **About** tab (bio with Read more, post / like / comment / save totals, top posts, joined / location / website). Under it the tabs are **Posts, Videos, Polls, Theories, Events, About**, each with a count and its own card design (`components/profile/Tiles.js`): photo cards, 16:9 video cards, live polls you can vote on, theory cards with the author's confidence, event cards with a date block and who is going.

- The open tab is kept in the URL (`?tab=videos`), so Back from a post returns to it.
- A card opens the post's own page (`/p/[id]`, server-rendered with a canonical URL), not a popup. That page has a sticky bar with Back, the post type and the author (`components/post/PostBar.js`).
- Spoiler posts are blurred in the cards; pinned, scheduled and private posts are labelled (for the owner).
- On your own profile, Upgrade, Settings and Log out live in a small "..." menu.
- Files: `components/ProfileView.js` (header + tab state), `components/profile/*`, `app/profile.css`.
