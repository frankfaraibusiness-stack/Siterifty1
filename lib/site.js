// Single source of truth for everything the public info pages share:
// the site's name, contact details, legal dates, the page registry (which the
// side menu, sitemap and every page read), the cookie list and the contact
// topics. Safe to import from server AND client code (plain data, no secrets).
//
// To change something, change it here once:
//   - contact email / operator / governing law  -> CONTACT and LEGAL below
//   - plan names, prices, limits, benefits      -> lib/plans.js (not here)
//   - the "not affiliated" wording              -> NOT_AFFILIATED below
//
// Dates: bump LEGAL.updated / LEGAL.updatedISO whenever you edit the terms,
// privacy, cookies, guidelines, copyright or disclaimer pages.

export const SITE = {
  name: "GTAFanbase",
  domain: "GTAFanbase.com",
  tagline: "Discuss. Share. Connect.",
  // What the site is, in one sentence. Used in meta descriptions and JSON-LD.
  summary:
    "GTAFanbase is a fan-made community where GTA 6 fans can talk, post, vote on polls and theories, join communities and hang out in one place.",
  logo: "/logo.webp",
  banner: "/banner.webp",
  // The picture link previews show (Discord, WhatsApp, iMessage, X, Facebook, Google) on any page that
  // has no image of its own. 1200x630 JPG in /public; swap the file to change it everywhere (lib/seo.js).
  ogImage: {
    path: "/og-default.jpg",
    width: 1200,
    height: 630,
    alt: "GTAFanbase.com: the social media for GTA fans. Join the ultimate GTA community.",
  },
};

// Public address of the site (used for canonical links, the sitemap and
// link previews). Set NEXT_PUBLIC_APP_URL in Vercel; this is only a fallback.
export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://gtafanbase.com";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://gtafanbase.com";
  }
}

// ---- Contact --------------------------------------------------------------
// The contact form on /contact always works (messages are saved to the
// `contactMessages` collection in Firestore). If you also want a public email
// address shown on the info pages, set NEXT_PUBLIC_CONTACT_EMAIL in Vercel
// (or type it between the quotes below). Leave it empty to show the form only.
export const CONTACT = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};

// ---- Legal facts ----------------------------------------------------------
export const LEGAL = {
  updated: "November 21, 2026",
  updatedISO: "2026-11-21",
  // Youngest age allowed to create an account.
  minAge: 13,
  // Optional. When filled in, the Terms add a "governing law" clause that
  // names it (for example "the laws of England and Wales"). Leave empty to
  // leave that clause out until you have taken legal advice.
  governingLaw: "",
  // Optional. Shown in the Terms and Privacy Policy as the operator of the
  // site (a person, studio or company name). Leave empty to say "the
  // GTAFanbase team".
  operatorName: "",
  // How many days we aim to answer privacy requests and takedown notices in.
  responseDays: 30,
  // Optional. If you register a DMCA designated agent with the US Copyright
  // Office, type their name and postal/email address here and the Copyright
  // page will show it. Leave empty until then.
  dmcaAgent: "",
};

// Who "we" is in the legal pages.
export const OPERATOR = LEGAL.operatorName || `the ${SITE.name} team`;

// ---- The "we are not Rockstar" wording -----------------------------------
export const NOT_AFFILIATED = {
  headline: "Unofficial fan site",
  short:
    "GTAFanbase was not built by, and is not affiliated with, endorsed by or sponsored by Rockstar Games or Take-Two Interactive.",
  long:
    "GTAFanbase is an independent fan project. It was not created by Rockstar Games or Take-Two Interactive Software, it has no official connection to them or to any of their subsidiaries or partners, and nothing here is approved, endorsed or sponsored by them.",
  trademark:
    "Grand Theft Auto, GTA, GTA VI, Rockstar Games and related names, logos, characters and artwork are trademarks or copyrighted works of Take-Two Interactive Software, Inc. and/or its subsidiaries, including Rockstar Games, Inc. They belong to their owners and are used here only to say what this fan community is about.",
};

// ---- The info pages -------------------------------------------------------
// Order here is the order in the side menu and the rail on every info page.
// `a` / `b` are the two colours each page uses for its banner and accents.
export const INFO_PAGES = [
  {
    key: "terms",
    href: "/terms",
    group: "legal",
    menuTitle: "Terms & Conditions",
    title: "Terms & Conditions",
    icon: "doc",
    a: "#ff3d7f",
    b: "#b07bff",
    blurb: "The rules for using GTAFanbase, in plain English.",
    description:
      "The Terms & Conditions for GTAFanbase, the unofficial GTA 6 fan community: who can join, what you own, the rules, plans and what happens if things go wrong.",
  },
  {
    key: "privacy",
    href: "/privacy",
    group: "legal",
    menuTitle: "Privacy Policy",
    title: "Privacy Policy",
    icon: "shield",
    a: "#2de2c5",
    b: "#1b6fa8",
    blurb: "What we collect, why, and the controls you have.",
    description:
      "How GTAFanbase handles your data: what we collect, who can see it, who we share it with, how long we keep it and how to access, export or delete it.",
  },
  {
    key: "cookies",
    href: "/cookies",
    group: "legal",
    menuTitle: "Cookie Policy",
    title: "Cookie Policy",
    icon: "cookie",
    a: "#ff9a3d",
    b: "#ffd36b",
    blurb: "The few cookies and browser storage items we use.",
    description:
      "The cookies and browser storage GTAFanbase uses, what each one does, how long it lasts and how to control or clear it.",
  },
  {
    key: "guidelines",
    href: "/guidelines",
    group: "legal",
    menuTitle: "Community Guidelines",
    title: "Community Guidelines",
    icon: "flag",
    a: "#9ee62c",
    b: "#2de2c5",
    blurb: "How we keep the fanbase fun, safe and on topic.",
    description:
      "The GTAFanbase community guidelines: keep it GTA 6, be respectful, handle spoilers and leaks properly, how to report problems and what happens when rules are broken.",
  },
  {
    key: "copyright",
    href: "/copyright",
    group: "legal",
    menuTitle: "Copyright & DMCA",
    title: "Copyright & DMCA",
    icon: "copyright",
    a: "#b07bff",
    b: "#ff3d7f",
    blurb: "Who owns what, and how to send a takedown notice.",
    description:
      "Copyright on GTAFanbase: who owns fan content, how to report infringement with a DMCA notice, how counter-notices work and our repeat infringer policy.",
  },
  {
    key: "disclaimer",
    href: "/disclaimer",
    group: "legal",
    menuTitle: "Fan site disclaimer",
    title: "Fan Site Disclaimer",
    icon: "info",
    a: "#ffd36b",
    b: "#ff3d7f",
    blurb: "We are not Rockstar Games or Take-Two. Here is what that means.",
    description:
      "GTAFanbase is an unofficial fan site. It was not built by and has no affiliation with Rockstar Games or Take-Two Interactive. Read what that means for you.",
  },
  {
    key: "help",
    href: "/help",
    group: "help",
    menuTitle: "Help center",
    title: "Help Center",
    icon: "help",
    a: "#2de2c5",
    b: "#9ee62c",
    blurb: "Answers on accounts, posting, communities, plans and more.",
    description:
      "Help for GTAFanbase: getting started, accounts and logging in, posting, stories, communities, settings, plans and troubleshooting, with searchable questions and answers.",
  },
  {
    key: "contact",
    href: "/contact",
    group: "help",
    menuTitle: "Contact us",
    title: "Contact Us",
    icon: "mail",
    a: "#ff3d7f",
    b: "#ff9a3d",
    blurb: "Questions, reports, takedowns and privacy requests.",
    description:
      "Contact the GTAFanbase team: ask a question, report a post or person, send a copyright notice, make a privacy request or share a bug or idea.",
  },
  {
    key: "about",
    href: "/about",
    group: "help",
    menuTitle: "About GTAFanbase",
    title: "About GTAFanbase",
    icon: "star",
    a: "#ff3d7f",
    b: "#2de2c5",
    blurb: "A fan-made home for GTA 6 fans.",
    description:
      "About GTAFanbase: an unofficial, fan-made community for GTA 6 fans with a feed, communities, polls, theories, stories and profiles. Not affiliated with Rockstar Games.",
  },
];

export function infoPage(key) {
  return INFO_PAGES.find((p) => p.key === key);
}

export const LEGAL_PAGES = INFO_PAGES.filter((p) => p.group === "legal");
export const HELP_PAGES = INFO_PAGES.filter((p) => p.group === "help");

// ---- Contact topics (the form on /contact and its API both use these) ----
export const CONTACT_TOPICS = [
  { id: "general", label: "General question", hint: "Anything you want to ask us." },
  { id: "account", label: "Help with my account", hint: "Logging in, your username, your plan, anything that is stuck." },
  { id: "report", label: "Report a post, person or community", hint: "Paste the link so we can find it fast." },
  { id: "appeal", label: "Appeal a moderation decision", hint: "Tell us your username and what was removed or limited." },
  { id: "copyright", label: "Copyright or DMCA notice", hint: "Use the checklist on the Copyright page so the notice is complete." },
  { id: "privacy", label: "Privacy request (access, correct, delete)", hint: "Tell us your username and what you would like us to do." },
  { id: "bug", label: "Bug or feature idea", hint: "What happened, on which page and on what device or browser." },
  { id: "business", label: "Press or partnerships", hint: "Who you are and what you have in mind." },
];

export function isTopicId(id) {
  return CONTACT_TOPICS.some((t) => t.id === id);
}

// ---- Cookies and browser storage -----------------------------------------
// The Cookie Policy table is built from this list. If you add a cookie or a
// localStorage key anywhere in the app, add it here too.
// `lasts` for the login cookie is filled in on the page from lib/session.js.
export const STORAGE_ITEMS = [
  {
    name: "gta6fb_session",
    kind: "Cookie",
    group: "essential",
    purpose: "Keeps you logged in. It is HTTP-only, so scripts on the page cannot read it.",
    lasts: "5 days",
  },
  {
    name: "gta6fb_ref",
    kind: "Cookie",
    group: "preference",
    purpose: "Set only when you open someone's referral link. It remembers which member invited you, so they get credit if you create an account. It is HTTP-only and removed once you sign up.",
    lasts: "30 days",
  },
  {
    name: "gta6fb_look",
    kind: "Cookie",
    group: "preference",
    purpose: "Remembers your City Look (site colours, glow, text size, reduced motion) so every page opens the way you set it.",
    lasts: "1 year",
  },
  {
    name: "gta6fb:composer-draft:v1",
    kind: "Local storage",
    group: "preference",
    purpose: "Autosaves the text of an unfinished post on your device so you can pick it up again. Photos and videos are not kept.",
    lasts: "Until you post, discard it or clear your browser data",
  },
  {
    name: "gta6fb-community-draft-v1",
    kind: "Local storage",
    group: "preference",
    purpose: "Autosaves an unfinished community you were setting up. Artwork is not kept.",
    lasts: "Until you finish, discard it or clear your browser data",
  },
  {
    name: "g6-booted",
    kind: "Session storage",
    group: "preference",
    purpose: "Remembers that you already saw the intro screen in this tab, so it plays a shorter version on reloads.",
    lasts: "Until you close the tab",
  },
];

// ---- Third parties the site talks to ------------------------------------
// Used by the Privacy and Cookie policies. Keep in sync with what the code
// actually loads.
export const PROVIDERS = [
  {
    name: "Google Firebase",
    what: "Sign-in (Firebase Authentication), our database (Cloud Firestore) and video file storage (Firebase Storage).",
  },
  {
    name: "Google Sign-In",
    what: "The optional Continue with Google button. Its script loads from Google only when you open the log-in window.",
  },
  {
    name: "YouTube",
    what: "Videos posted as YouTube links play in an embedded player from youtube-nocookie.com, and thumbnails load from YouTube's servers.",
  },
  {
    name: "Our hosting provider (Vercel)",
    what: "Runs the website and receives the normal technical data any web host sees, such as your IP address and browser type.",
  },
  {
    name: "Your browser's speech service",
    what: "Voice search uses your browser's built-in speech recognition. Depending on the browser, your audio may be processed by its maker (for example Google in Chrome). We never receive the audio, only the words it turns into.",
  },
];
