import { usdToken } from "./currency";

// Single source of truth for the plans shown on /upgrade and stored on
// users/{uid}.plan. Safe to import from server and client code.
//
// IMPORTANT: the limits listed below are DISPLAY ONLY for now. Nothing in the
// app enforces them yet — edit the numbers here and the /upgrade page (cards,
// comparison table) updates everywhere.

// All prices below are in US dollars (the base currency). Visitors see them in
// their own currency at the live exchange rate: see lib/currency.js and lib/fx.js.

// While true, switching to any plan costs $0 and needs no payment. Flip to
// false once real checkout exists (app/api/plan/route.js then refuses paid
// plans until you add the payment step).
export const FREE_WHILE_TESTING = true;

export const DEFAULT_PLAN = "drifter";

// How long a member's comment stays pinned above the others, in hours. The
// deadline is saved on the comment when it is posted (so changing plan later
// never rewrites old comments) and checked whenever comments are shown: no
// background job, a pin simply stops counting once its time has passed.
export const PIN_HOURS = { drifter: 0, wheelman: 24, mastermind: 72, kingpin: 168 };

export function pinHours(planId) {
  return PIN_HOURS[planId] || 0;
}

// 24 -> "24 hours", 72 -> "3 days", 168 -> "7 days"
export function pinLabel(hours) {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} hours`;
}

// Card highlights are strings, or { text, soon: true } for planned features.
export const PLANS = [
  {
    id: "drifter",
    name: "Boardwalk Drifter",
    short: "Drifter",
    price: 0,
    a: "#2de2c5",
    b: "#1b6fa8",
    badges: [],
    tagline: "Walk the boardwalk, join the conversation. Free forever.",
    lead: "Everything you need to be part of the fanbase",
    highlights: [
      "Photo posts, clips, polls and theories",
      "4 photos per post",
      "60 MB video uploads, up to 3 min",
      "3 stories at once, 15 s each",
      "2 profile themes",
      "Like, comment and save 100 posts",
    ],
  },
  {
    id: "wheelman",
    name: "Getaway Wheelman",
    short: "Wheelman",
    price: 4.99,
    a: "#ff9a3d",
    b: "#ff3d7f",
    badges: ["verified"],
    tagline: "Faster wheels, longer clips and more room to post.",
    lead: "Everything in Drifter, plus",
    highlights: [
      "30 posts a day",
      "6 photos per post",
      "150 MB video, up to 5 min",
      "6 stories at once, 30 s each",
      "All 5 profile themes",
      "Verified badge on your posts, comments and profile",
      `Comments pinned on top for ${pinLabel(PIN_HOURS.wheelman)}`,
    ],
  },
  {
    id: "mastermind",
    name: "Heist Mastermind",
    short: "Mastermind",
    price: 9.99,
    a: "#b07bff",
    b: "#7b2ff7",
    badges: ["verified", "target"],
    tagline: "Plan the big one with scheduling and bigger polls and theories.",
    lead: "Everything in Wheelman, plus",
    highlights: [
      "Schedule posts 30 days ahead",
      "8 photos per post",
      "300 MB video, up to 10 min",
      "Polls with 10 options, open up to 30 days",
      "Stories that stay up 48 hours",
      "3 exclusive profile themes",
      "Verified and target badges",
      `Comments pinned on top for ${pinLabel(PIN_HOURS.mastermind)}`,
      { text: "Early access to new features", soon: true },
    ],
  },
  {
    id: "kingpin",
    name: "Vice Kingpin",
    short: "Kingpin",
    price: 19.99,
    a: "#ffd36b",
    b: "#ff7a59",
    badges: ["verified", "crown", "diamond"],
    tagline: "The whole of Leonida, no ceilings. Everything is unlocked.",
    lead: "Everything in Mastermind, plus",
    everything: true,
    highlights: [
      "Unlimited posts per day",
      "12 photos per post",
      "1 GB video, up to 20 min",
      "25 stories at once, 90 s each, up for 72 hours",
      "Unlimited saved posts",
      "Gold verified, crown and diamond badges",
      `Comments pinned on top for ${pinLabel(PIN_HOURS.kingpin)}`,
      { text: "Profile analytics and priority support", soon: true },
    ],
  },
];

export const PLAN_IDS = PLANS.map((p) => p.id);

// The FanBase logo badge: shown next to every comment posted by a paid member
// (all three paid plans). Free plan does not get it.
export const MEMBER_LOGO = {
  src: "/logo.webp",
  label: "GTA6 FanBase member",
  title: "FanBase badge",
  note: "Shown on every comment you post",
};

export function hasMemberLogo(id) {
  return planRank(id) > 0;
}

export function isPlanId(id) {
  return typeof id === "string" && PLAN_IDS.includes(id);
}

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || PLANS[0];
}

// Badges shown next to a name on posts, comments, search and profiles.
// Free plan has none; each paid plan adds one more (see `badges` per plan).
// `color` overrides the plan colour for that badge.
export const BADGES = {
  verified: { label: "Verified" },
  target: { label: "Mastermind" },
  crown: { label: "Crown" },
  diamond: { label: "Diamond", color: "#ff3d7f" },
};

// 0 for the free plan or anything unknown, 1..3 for paid plans (higher = better).
export function planRank(id) {
  const i = PLAN_IDS.indexOf(id);
  return i > 0 ? i : 0;
}

// ---- Comparison table -----------------------------------------------------
// Each row: [label, [drifter, wheelman, mastermind, kingpin], opts]
// A cell is a string, true (included) or false (not included).
// opts.soon marks features that are planned but not live yet.
export const LIMIT_GROUPS = [
  {
    title: "Posting",
    rows: [
      ["Posts per day", ["10", "30", "75", "Unlimited"]],
      ["Photos per post", ["4", "6", "8", "12"]],
      ["Post text length", ["600 characters", "1,000 characters", "1,500 characters", "3,000 characters"]],
      ["Theory write-up length", ["1,500 characters", "3,000 characters", "5,000 characters", "10,000 characters"]],
      ["Tags per post", ["5", "8", "10", "15"]],
      ["Pinned posts on your profile", ["1", "3", "6", "12"]],
      ["Schedule posts ahead", ["7 days", "14 days", "30 days", "90 days"]],
      ["Draft autosave", [true, true, true, true]],
    ],
  },
  {
    title: "Video",
    rows: [
      ["Upload size", ["60 MB", "150 MB", "300 MB", "1 GB"]],
      ["Clip length", ["3 min", "5 min", "10 min", "20 min"]],
      ["YouTube links", [true, true, true, true]],
    ],
  },
  {
    title: "Polls and theories",
    rows: [
      ["Options per poll", ["6", "8", "10", "12"]],
      ["Poll timer up to", ["7 days", "14 days", "30 days", "60 days"]],
      ["Multi-select polls", [true, true, true, true]],
      ["Facts / Cap verdict votes", [true, true, true, true]],
    ],
  },
  {
    title: "Stories",
    rows: [
      ["Stories live at once", ["3", "6", "10", "25"]],
      ["Story video length", ["15 s", "30 s", "60 s", "90 s"]],
      ["Story stays up for", ["24 hours", "24 hours", "48 hours", "72 hours"]],
    ],
  },
  {
    title: "Profile",
    rows: [
      ["Bio length", ["160 characters", "240 characters", "320 characters", "500 characters"]],
      ["Profile themes", ["2", "All 5", "5 + 3 exclusive", "All, including new drops"]],
      ["Profile badges", [false, "1 (verified)", "2 (verified, target)", "3 (verified, crown, diamond)"]],
    ],
  },
  {
    title: "Community",
    rows: [
      ["Comment length", ["500 characters", "800 characters", "1,200 characters", "2,000 characters"]],
      ["FanBase logo badge on all your comments", [false, true, true, true]],
      [
        "Your comments pinned on top for",
        [false, pinLabel(PIN_HOURS.wheelman), pinLabel(PIN_HOURS.mastermind), pinLabel(PIN_HOURS.kingpin)],
      ],
      ["Saved posts", ["100", "500", "2,000", "Unlimited"]],
      ["Search and voice search", [true, true, true, true]],
    ],
  },
  {
    title: "Perks",
    rows: [
      ["Early access to new features", [false, false, true, true], { soon: true }],
      ["Profile analytics", [false, false, false, true], { soon: true }],
      ["Priority support", [false, false, false, true], { soon: true }],
    ],
  },
];

// ---- How pricing works ----------------------------------------------------
export const PRICING_POINTS = [
  {
    title: "One flat price a month",
    body: `Drifter is ${usdToken(PLANS[0].price)}, Wheelman is ${usdToken(PLANS[1].price)}, Mastermind is ${usdToken(PLANS[2].price)} and Kingpin is ${usdToken(PLANS[3].price)}. No setup fees and no charges per post. Prices are set in US dollars and shown in your own currency at the live exchange rate.`,
  },
  {
    title: "Each plan builds on the last",
    body: "Wheelman has everything in Drifter, Mastermind has everything in Wheelman, and Kingpin has everything. Higher plans only ever add.",
  },
  {
    title: "Free while we test",
    body: "Right now every plan is free to switch to. You will see the real price on each card, and nothing is charged during testing.",
  },
  {
    title: "Change whenever you like",
    body: "Move up or down from this page at any time. Your posts, stories and profile stay yours either way.",
  },
];

// ---- FAQ ------------------------------------------------------------------
export const FAQ = [
  {
    q: "What does each plan give me?",
    a: "Plans change how much you can do, not who you are on the platform. Higher plans raise limits like photos per post, video size, stories and scheduling, and add profile badges and perks. The full list is in the comparison table above.",
  },
  {
    q: "How much does each plan cost?",
    a: `${PLANS[0].name} is ${usdToken(PLANS[0].price)}, ${PLANS[1].name} is ${usdToken(PLANS[1].price)} a month, ${PLANS[2].name} is ${usdToken(PLANS[2].price)} a month and ${PLANS[3].name} is ${usdToken(PLANS[3].price)} a month. Pricing is monthly. Prices are set in US dollars. Outside the US we show them in your local currency at the live exchange rate, rounded up to a neat number where we can.`,
  },
  {
    q: "Do I have to pay anything right now?",
    a: "No. We are testing, so switching to any plan costs nothing and asks for no payment details. When paid billing goes live it will be announced here first.",
  },
  {
    q: "What plan do new accounts start on?",
    a: "Every new account starts on Boardwalk Drifter, the free plan. You can move up whenever you are ready.",
  },
  {
    q: "Can I switch plans or go back to free?",
    a: "Yes. Pick any plan on this page and it applies straight away. Choosing Boardwalk Drifter puts you back on the free plan.",
  },
  {
    q: "What happens to my posts if I move to a lower plan?",
    a: "Nothing you have already posted is removed. A lower plan only changes what you can add from then on.",
  },
  {
    q: "Which plan is right for me?",
    a: "Drifter is great for browsing, commenting and the odd post. Wheelman suits regular posters who share clips and stories. Mastermind is built for people who plan content, run polls and write theories. Kingpin is for creators who want no limits.",
  },
  {
    q: "What is the difference between Mastermind and Kingpin?",
    a: "Kingpin is the everything plan. It has the highest limit on every row of the table, unlimited posts and saves, the Gold Kingpin badge and every perk, including profile analytics and priority support as they launch.",
  },
  {
    q: "What is the FanBase logo badge?",
    a: "Every paid plan (Wheelman, Mastermind and Kingpin) adds the GTA6 FanBase logo next to your name on every comment you post. It shows on all of your comments, old and new, for as long as you are on a paid plan. Boardwalk Drifter doesn't include it.",
  },
  {
    q: "How do pinned comments work?",
    a: `When you comment as a member, your comment is pinned above everyone else's and a countdown shows how long is left. Wheelman pins last ${pinLabel(PIN_HOURS.wheelman)}, Mastermind ${pinLabel(PIN_HOURS.mastermind)} and Kingpin ${pinLabel(PIN_HOURS.kingpin)}. When time runs out the comment drops into the normal order and ranks like any other, and your badges stay. The timer starts when you post, and changing plan later doesn't change comments you already posted.`,
  },
  {
    q: "What does the Soon tag mean?",
    a: "Features marked Soon are planned for your plan but are not live yet. They will switch on for everyone on that plan when they launch.",
  },
  {
    q: "Will the limits change?",
    a: "They may grow as the platform does. The numbers on this page are always the current ones for each plan.",
  },
];
