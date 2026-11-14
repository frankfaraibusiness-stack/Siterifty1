# GTA6FanBase

A fan social-feed UI for the world of GTA6 / Leonida, built with Next.js 16 (App Router) and React 19.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.js        Root layout, loads global styles and metadata
  page.js           Home page — assembles header, nav, stories, feed
  globals.css       Ported theme styles (dark GTA6-inspired palette)
components/
  SiteHeader.js      Top bar with brand + "Join the Heist" button
  MainNav.js         Horizontally scrollable section nav
  StoriesRail.js     Story bubbles rail
  Feed.js            Renders the list of posts
  PostCard.js        Single post: like/save/double-tap-to-like (client component)
  PostMedia.js       Renders 16:9 / 1:1 / grid media layouts
  ScrollTopButton.js Floating scroll-to-top button (client component)
  icons.js           Shared inline SVG icons
lib/
  mock-data.js       Mock stories + posts (swap for real data later)
  format-count.js    Like-count formatting helpers (e.g. 2400 -> "2.4K")
```

## Notes

- Interactivity (like, save, double-tap heart burst, scroll-to-top) is implemented with small client components, everything else renders as server components.

## Feed data (real, Firestore via Admin SDK)

Mock data is gone. The home page (`app/page.js`) is an async Server Component that reads posts and stories straight from Firestore using the Admin SDK (`lib/feed-data.js`) — no client Firestore SDK, same service-account credentials already used for Auth. The page is marked `export const dynamic = "force-dynamic"` so likes/saves and new posts are never stale from caching.

There is currently **no UI to create a post or story** — by design, for now. Until you add a composer, `posts` and `stories` collections will be empty and the feed shows a clean empty state (`components/EmptyFeed.js`) instead of a broken-looking blank page.

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
}
```

### New API routes

| Route | What it does |
|---|---|
| `POST /api/posts/like` | Toggles the current user's like on a post (requires session cookie) |
| `POST /api/posts/save` | Toggles the current user's save on a post (requires session cookie) |

Both run as a Firestore transaction and are rejected with `401` if there's no valid session — `PostCard.js` calls these optimistically and rolls back on failure (e.g. if you're logged out).

### Adding data while there's no composer yet

Until a create-post/story UI exists, add documents directly in the Firebase Console (Firestore Database tab) matching the schema above, or write a small seed script using the same Admin SDK credentials.

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

### Required environment variables

Copy `.env.example` to `.env.local` for local dev; in Vercel, add the same four vars to your project settings (you said these are already there):

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_WEB_API_KEY
```

`FIREBASE_PRIVATE_KEY` must keep its `\n` sequences (either as literal two-character escapes, which `lib/firebase-admin.js` un-escapes, or as real newlines — both work).
