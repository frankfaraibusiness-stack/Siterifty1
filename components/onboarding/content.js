// Everything the welcome tour says, in one place. Edit the words here; the
// layout lives in Onboarding.js and the look in app/welcome/welcome.css.
//
// Every line below describes something the site really does today, so keep it
// that way when you edit: if a feature changes, change its line here too.

import { LEGAL, NOT_AFFILIATED } from "@/lib/site";

export const STEPS = [
  { id: "welcome", label: "The big picture" },
  { id: "explore", label: "Explore the city" },
  { id: "yours", label: "Make it yours" },
];

// ---------------------------------------------------------------- step 1

export const PILLARS = [
  {
    icon: "share",
    tone: "pink",
    title: "Share",
    text: "Post photos, video clips, polls and theories to a feed made for GTA fans.",
  },
  {
    icon: "discuss",
    tone: "cyan",
    title: "Discuss",
    text: "Join communities, argue about trailers and back your theories with receipts.",
  },
  {
    icon: "connect",
    tone: "lime",
    title: "Connect",
    text: "Follow people, make friends, message them and find a crew for GTA 6.",
  },
];

export const GLANCE = [
  { value: "5", label: "ways to post", hint: "Photo, video, poll, theory, event" },
  { value: "GTA 6", label: "is the focus", hint: "Communities must keep it GTA 6" },
  { value: "Free", label: "to join", hint: "Your plan is free, forever" },
];

export const QUICK_ANSWERS = [
  {
    q: "What is GTAFanbase?",
    a: "A social network built by fans, for fans, around GTA 6 and the world of Leonida. It works like the apps you already know (a feed, profiles, comments, messages) but everything in it is about GTA.",
  },
  {
    q: "Who is it for?",
    a: `Anyone who loves GTA: players, theory crafters, clip hunters, car-meet fans and people looking for a crew. You must be at least ${LEGAL.minAge} to have an account.`,
  },
  {
    q: "Does it cost anything?",
    a: "No. Every account starts on the free Boardwalk Drifter plan and can stay there forever. Paid plans, the Perks shop and gifts are optional extras for people who want them.",
  },
  {
    q: "Is it official?",
    a: `No. ${NOT_AFFILIATED.short}`,
  },
];

// ---------------------------------------------------------------- step 2

// One card per area of the site. `where` tells the member how to get there.
export const FEATURES = [
  {
    id: "feed",
    icon: "feed",
    tone: "pink",
    title: "Main Feed",
    tag: "Your front page",
    headline: "Everything the fanbase is posting, in one place.",
    text: "The home feed mixes posts from the whole community. Switch to Following to see only the people you follow, filter by format and tap any trending #tag to dive in.",
    points: [
      "Five formats: photo posts, video clips, polls, theories and events",
      "Stories at the top: quick updates that disappear after 24 hours",
      "Heart, comment, save and share anything you like",
      "Search for people, posts and #tags",
    ],
    where: "Top navigation → Main Feed",
  },
  {
    id: "reel",
    icon: "reel",
    tone: "orange",
    title: "Vice Reel",
    tag: "Clips that pay XP",
    headline: "A stream of short clips where watching earns you rank.",
    text: "Finish clips to earn XP, chain them into combos, clear daily missions and hunt Hidden Packages. Keep your daily streak alive and climb from Tourist all the way up to Vice Legend.",
    points: [
      "XP for watching, liking, commenting and sharing",
      "Three daily missions and a streak bonus",
      "Eight ranks, from Tourist to Vice Legend",
      "Upload your own clips or paste a YouTube link",
    ],
    where: "Top navigation → Videos",
  },
  {
    id: "communities",
    icon: "people",
    tone: "violet",
    title: "Communities",
    tag: "Find your crew",
    headline: "Clubs for every corner of GTA 6.",
    text: "Trailers, theories, the map, cars, fan art, roleplay crews and more. Every community has to keep it GTA 6, so you always know what you are walking into.",
    points: [
      "Public communities you join instantly; private ones ask a few questions first",
      "Each one has its own rules, about page and member list, kept apart from the posts",
      "Owners, admins and moderators keep things tidy",
      "Start your own with a simple 7-step creator",
    ],
    where: "Top navigation → Communities",
  },
  {
    id: "messages",
    icon: "chat",
    tone: "cyan",
    title: "Messages",
    tag: "Private chats",
    headline: "Talk one-to-one with friends, followers and your crew.",
    text: "Direct messages are built on the people you follow and befriend, and you decide who is allowed to start a chat with you.",
    points: [
      "By default, friends and followers can message you. Change it any time in Settings",
      "GTA tools in every chat: session invites, lobby codes and meet-up pins",
      "Replies, reactions, photos, stickers and custom GTA emoji",
      "Read receipts and online status are yours to switch off",
    ],
    where: "Top navigation → Messages",
  },
  {
    id: "events",
    icon: "calendar",
    tone: "lime",
    title: "Events",
    tag: "Meet up",
    headline: "Watch parties, car meets and in-game sessions.",
    text: "Browse what is coming up, what is live right now and what you are going to. RSVP with one tap, see a live countdown and add it to your calendar.",
    points: [
      "In-game, real-world and online events",
      "Filter by place, kind or what is happening this week",
      "Host your own from the Create button",
    ],
    where: "Top navigation → Events",
  },
  {
    id: "lobby",
    icon: "live",
    tone: "pink",
    title: "The Lobby",
    tag: "Who is online",
    headline: "Drop in, say hi and find people to play with.",
    text: "See who is online right now, jump into live chat rooms, start your own session and find a crew for GTA 6. New here? There is a room called Fresh Off the Bus just for you.",
    points: [
      "Official rooms for trailers, theories, cars and newcomers",
      "Start your own session and invite people to it",
      "A crew board for finding teammates (posts last two days)",
    ],
    where: "Top navigation → Lobby",
  },
  {
    id: "world",
    icon: "map",
    tone: "cyan",
    title: "Leonida World Hub",
    tag: "Fan-built guide",
    headline: "Discover, collect and predict everything Leonida.",
    text: "A hub the fans build together. Everything in it is a fan contribution, not official information from Rockstar.",
    points: [
      "Map discoveries by area, from Vice City to the Leonida Keys",
      "A vehicle spotter where members rate sightings from 1 to 5 stars",
      "Trailer frames: discuss one exact moment of a trailer",
      "Predictions: call it right and earn reputation points",
    ],
    where: "Menu (top left) → Leonida World Hub",
  },
];

// Post formats shown as a little strip under the Main Feed card.
export const FORMATS = [
  { icon: "share", label: "Photo" },
  { icon: "reel", label: "Video" },
  { icon: "poll", label: "Poll" },
  { icon: "bulb", label: "Theory" },
  { icon: "calendar", label: "Event" },
];

// ---------------------------------------------------------------- step 3

export const FIRST_MOVES = [
  {
    icon: "plus",
    tone: "pink",
    title: "Make your first post",
    text: "Tap Create in the top bar. A photo, a clip or a hot take all count.",
  },
  {
    icon: "people",
    tone: "violet",
    title: "Join a community",
    text: "Pick one that matches what you are into. Public ones let you in right away.",
  },
  {
    icon: "live",
    tone: "lime",
    title: "Say hi in the Lobby",
    text: "Drop into Fresh Off the Bus. Nobody minds a newcomer's question.",
  },
  {
    icon: "palette",
    tone: "orange",
    title: "Style your profile",
    text: "Add a photo, banner and bio, and pick an accent colour in Settings.",
  },
];

export const YOURS = [
  {
    id: "look",
    icon: "palette",
    tone: "orange",
    title: "Your profile and look",
    text: "Your profile has a banner, photo, bio and an accent colour that themes your profile. In Settings > City Look you can retheme the whole site: colour presets, night tint, glow, interface size and a reduced-motion switch.",
  },
  {
    id: "spoilers",
    icon: "eyeoff",
    tone: "pink",
    title: "Spoilers and leaks, your way",
    text: "Authors can cover a post as a spoiler, and enough flags from members cover it for everyone. In Settings > Leak Filter you choose what happens to covered posts: keep them covered, show them, or hide them completely. Theories carry a confidence rating, and everyone can vote Facts or Cap.",
  },
  {
    id: "safety",
    icon: "shield",
    tone: "cyan",
    title: "You are in control",
    text: "Block people, mute words, limit who can comment or message you, and make your account private from Settings. If something breaks the rules, copy its link and report it from the Contact page.",
  },
  {
    id: "rules",
    icon: "flag",
    tone: "lime",
    title: "The house rules",
    text: "Keep it GTA 6, be good to each other, label guesses as theories and cover spoilers. Fake leaks, stolen game files, scams and harassment get removed.",
    link: { href: "/guidelines", label: "Read the full guidelines" },
  },
  {
    id: "shops",
    icon: "gift",
    tone: "violet",
    title: "Plans, perks and gifts",
    text: "Everything above is free. If you ever want more, there are optional plans with badges and bigger limits, one-time perks like Neon Glow and Gradient Name, and a Gift shop for sending gifts to other members from a wallet.",
    plans: true,
  },
];
