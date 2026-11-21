import { callout, actions, h, p, paras, steps, stats, ul } from "../kit";
import { CONTACT, OPERATOR, SITE, NOT_AFFILIATED } from "@/lib/site";
import { FREE_WHILE_TESTING } from "@/lib/plans";

// Category: start (about the site and about Vibe).
export default [
  {
    id: "what-is-site",
    cat: "start",
    q: `What is ${SITE.name}?`,
    kw: ["about", "website", "this site", "what is this", "gtafanbase", "gta6fanbase", "fanbase"],
    next: ["what-can-i-do", "site-tour", "site-official"],
    a: () => [
      p(SITE.summary),
      p("It is built around one idea: **everything GTA 6 in one place**, from trailer breakdowns to your own theories."),
      ul(
        "Post photos, clips, polls and theories",
        "Share short stories on the home rail",
        "Join or start communities for every corner of Leonida",
        "Collect characters, spot vehicles and make predictions in the World Hub"
      ),
      actions({ label: "Take the tour", ask: "site-tour" }, { label: "Open the feed", href: "/" }),
    ],
  },
  {
    id: "what-can-i-do",
    cat: "start",
    q: "What can I do here?",
    kw: ["features", "functions", "do", "options", "activities"],
    next: ["site-tour", "site-no-account", "gta6-release"],
    a: () => [
      p("Quite a lot. Here is the short list:"),
      stats([
        { k: "Post", v: "5 formats", hint: "photo, clip, poll, theory, event" },
        { k: "Stories", v: "Quick clips", hint: "on the home rail" },
        { k: "Communities", v: "Join or run", hint: "GTA 6 topics" },
        { k: "World Hub", v: "6 areas", hint: "map, cast, cars, more" },
      ]),
      p("You can also change the whole look of the site, level up your profile with plans and perks, and ask me anything from the question list."),
      actions({ label: "Start a post", href: "/create" }, { label: "Browse communities", href: "/communities" }, { label: "Visit the World Hub", href: "/world" }),
    ],
  },
  {
    id: "site-tour",
    cat: "start",
    q: "Give me a quick tour of the site",
    kw: ["tour", "guide", "walkthrough", "pages", "where is", "navigate", "menu", "map"],
    next: ["what-can-i-do", "plans-overview", "gta6-release"],
    a: () => [
      p("Here is the lay of the land. Open the **menu** (top left) any time to jump around."),
      steps(
        "**Main feed**: the latest posts from the fanbase. [Open it](/)",
        "**Communities**: find your crew by topic. [Browse](/communities)",
        "**Leonida World Hub**: discover, collect and predict. [Enter](/world)",
        "**Create**: drop a photo, clip, poll or theory. [Post](/create)",
        "**Search**: people and posts, with voice search. [Search](/search)",
        "**Settings**: privacy, spoilers and the site's colours. [Tune it](/settings)",
        "**Upgrade** and **Perks shop**: [plans](/upgrade) and [one-time perks](/perks)"
      ),
    ],
  },
  {
    id: "who-is-vibe",
    cat: "start",
    q: "Who are you, Vibe?",
    kw: ["vibe", "who", "name", "assistant", "bot", "guide", "ai"],
    next: ["how-vibe-works", "vibe-real-ai", "vibe-levels"],
    a: () => [
      p("I'm **Vibe**, the built-in guide of GTAFanbase. Think of me as the friendly local who knows every street in Leonida and every setting on this site."),
      p("I can walk you through plans, perks, posting, communities, your account and the GTA series, all from the question list."),
      callout("tip", "Tap any question, or search the list. I answer in seconds, and it is always free."),
    ],
  },
  {
    id: "how-vibe-works",
    cat: "start",
    q: "How does this chat work? Can I type my own question?",
    kw: ["how", "work", "type", "free text", "ask anything", "chat", "search", "questions", "use"],
    next: ["vibe-real-ai", "vibe-privacy", "vibe-levels"],
    a: () => [
      p("You pick the question, I answer. There is no typing box for free text. Instead there is a **big list of questions** with answers I know by heart."),
      steps(
        "Browse the list by topic, or **search** it by typing a few words.",
        "Tap a question. It goes into the chat and I reply.",
        "Use the **Ask next** chips under my answers to keep going."
      ),
      p("Because every answer is written and checked ahead of time, I am fast, free and I never make things up."),
      callout("info", "Can't find your question? Tell the team on the [contact page](/contact?topic=general) and it may join the list."),
    ],
  },
  {
    id: "vibe-real-ai",
    cat: "start",
    q: "Are you a real AI? Are you ChatGPT?",
    kw: ["real", "ai", "chatgpt", "gpt", "claude", "gemini", "robot", "human", "powered", "model", "openai"],
    next: ["how-vibe-works", "vibe-privacy", "who-is-vibe"],
    a: () => [
      p("I'm not ChatGPT or any other outside service. I'm a **built-in guide** that lives on this site."),
      p("My answers come from a library the team wrote and keeps up to date. That means no surprise bills, no made-up facts and nothing you type is sent to an AI company."),
      callout("fact", "The trade-off: I can only answer questions that are on the list. If you can't find yours, let the team know."),
    ],
  },
  {
    id: "vibe-privacy",
    cat: "start",
    q: "Does Vibe save my chats?",
    kw: ["privacy", "save", "history", "stored", "data", "delete chat", "remember", "private", "cookies"],
    next: ["vibe-real-ai", "how-vibe-works", "privacy-data"],
    a: () => [
      p("Only in **your own browser tab**, and only for this visit. Close the tab and the chat is gone."),
      ul(
        "Your messages are **not** stored on our servers.",
        "If you are logged in, I look up your account details (like your plan and join date) so my answers can be personal.",
        "Guests can use me too. No account needed."
      ),
      p("Full details are in the [Privacy Policy](/privacy) and [Cookie Policy](/cookies)."),
    ],
  },
  {
    id: "vibe-levels",
    cat: "start",
    q: "What are XP and levels in this chat?",
    kw: ["xp", "level", "levels", "rank", "points", "game", "gamified", "lv", "progress", "district", "discovered"],
    next: ["how-vibe-works", "who-is-vibe", "fun-fact"],
    a: () => [
      p("Just for fun: every question you ask earns **XP**, and your level climbs as you explore."),
      ul(
        "**+10 XP** for each question",
        "**+25 XP** the first time you open a new topic (a \"district\")",
        "Level up from **Street Rookie** to **Leonida Legend**"
      ),
      p("XP lives only in this tab for this visit, so there is nothing to lose and nothing to pay."),
    ],
  },
  {
    id: "site-official",
    cat: "start",
    q: "Is this site run by Rockstar Games?",
    kw: ["official", "rockstar", "affiliated", "take-two", "fan site", "fan made", "legit", "endorsed"],
    next: ["site-who-runs", "what-is-site", "site-contact"],
    a: () => [
      p("No. " + NOT_AFFILIATED.short),
      p("This is an independent fan project. Rockstar Games and Take-Two have nothing to do with it, so for official news check Rockstar's own channels."),
      actions({ label: "Read the disclaimer", href: "/disclaimer" }),
    ],
  },
  {
    id: "site-who-runs",
    cat: "start",
    q: "Who runs the site?",
    kw: ["owner", "team", "operator", "admin", "creator", "made by", "founder", "staff", "moderators"],
    next: ["site-official", "site-contact", "what-is-site"],
    a: () => [
      p(`${SITE.name} is run by ${OPERATOR}, a group of fans, not a studio.`),
      p("Moderators and community owners help keep things on topic. You can read how it works in the [Community Guidelines](/guidelines)."),
    ],
  },
  {
    id: "site-contact",
    cat: "start",
    q: "How do I contact the team?",
    kw: ["contact", "support", "help", "email", "message", "talk to human", "report", "feedback", "reach"],
    next: ["site-who-runs", "bug-report", "report-someone"],
    a: () => [
      p("Use the contact form. It reaches the team directly and works for everything: questions, bugs, reports and privacy requests."),
      ...(CONTACT.email ? [p(`You can also email **${CONTACT.email}**.`)] : []),
      actions({ label: "Open the contact form", href: "/contact" }, { label: "Help Center", href: "/help" }),
    ],
  },
  {
    id: "site-app",
    cat: "start",
    q: "Is there an app? Does it work on my phone?",
    kw: ["app", "mobile", "phone", "ios", "android", "iphone", "tablet", "download", "install", "browser", "devices", "responsive"],
    next: ["site-tour", "fix-load", "what-can-i-do"],
    a: () => [
      p("There is no separate app right now. The site runs in your browser and is built to feel great on **phones, tablets and desktops**."),
      p("Add it to your home screen from your browser's menu if you want a shortcut."),
    ],
  },
  {
    id: "site-language",
    cat: "start",
    q: "What language is the site in?",
    kw: ["language", "english", "translate", "spanish", "portuguese", "french", "german", "translation"],
    next: ["site-currency", "what-can-i-do"],
    a: () => [
      p("English, for now. You can post in any language, but the menus, help and my answers are in English."),
      p("Prices are different: they are shown in **your own currency** at the live exchange rate."),
    ],
  },
  {
    id: "site-currency",
    cat: "start",
    q: "Why do prices show in my currency?",
    kw: ["currency", "dollar", "usd", "rand", "euro", "pound", "exchange rate", "convert", "local", "price looks different", "rounded"],
    next: ["plans-overview", "plans-how-priced", "perks-overview"],
    a: () => [
      p("All prices are set in **US dollars**. We show them in your own money using a live exchange rate, so you see what it means for you."),
      p("Where we can, the amount is rounded up to a neat number, so it might not match a straight conversion to the cent."),
      callout("info", FREE_WHILE_TESTING ? "While we test, nothing is charged at all." : "You are only ever charged in the currency shown at checkout."),
    ],
  },
  {
    id: "site-new",
    cat: "start",
    q: "What's coming soon to the site?",
    kw: ["roadmap", "upcoming", "new features", "soon", "future", "planned", "next", "updates", "coming"],
    next: ["series-site-future", "plans-soon", "site-suggest"],
    a: () => [
      p("A few things are marked **Soon** on the plan cards:"),
      ul(
        "**Early access** to new features (Mastermind, Kingpin and Creator Plus)",
        "**Profile analytics** (Kingpin and Creator Plus)",
        "**Priority support** (Kingpin and Creator Plus)",
        "**Monetization** and the **creator analytics dashboard** (Creator Plus)"
      ),
      p("The bigger picture, including how the site can grow beyond a single game, is in the **GTA series & future** topic."),
      actions({ label: "Where is the site going?", ask: "series-site-future" }),
    ],
  },
  {
    id: "site-suggest",
    cat: "start",
    q: "Can I suggest a feature?",
    kw: ["suggest", "idea", "feature request", "wish", "improve", "feedback", "request", "add"],
    next: ["site-contact", "world-wishlist", "bug-report"],
    a: () => [
      p("Yes please! Two good places:"),
      ul(
        "The **Feature wishlist** in the [World Hub](/world), where members vote once per idea",
        "The [contact form](/contact?topic=bug) for bigger ideas for the site itself"
      ),
    ],
  },
];
