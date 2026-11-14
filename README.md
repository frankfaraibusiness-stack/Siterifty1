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
