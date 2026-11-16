import { actions, callout, p, stats, table, timeline, ul } from "../kit";
import { GTA6, SERIES } from "../facts";

// Category: series (the GTA games, and where this site is going).
export default [
  {
    id: "series-list",
    cat: "series",
    q: "Which GTA games are there?",
    kw: ["games", "list", "all", "series", "history", "every", "timeline", "franchise", "order", "titles", "release order", "grand theft auto"],
    next: ["series-first", "series-cities", "series-site-future"],
    a: () => [
      p("The main-line Grand Theft Auto games, in order:"),
      timeline(SERIES.map((s) => (s.y === "Soon" ? { ...s, y: "2026" } : s))),
      p("There are also handheld and spin-off games, but these are the big ones."),
    ],
  },
  {
    id: "series-first",
    cat: "series",
    q: "Which GTA should I play first?",
    kw: ["start", "first", "beginner", "recommend", "best", "which", "new to gta", "where to begin", "play"],
    next: ["series-list", "series-gta5", "series-vice-city"],
    a: () => [
      p("It depends what you are in the mood for:"),
      table(
        ["If you want", "Try"],
        [
          ["Neon, 80s vibes and a classic story", "**Vice City**"],
          ["A huge map and endless freedom", "**San Andreas**"],
          ["A serious, gritty story", "**GTA IV**"],
          ["Modern graphics and online play", "**GTA V**"],
        ]
      ),
      callout("tip", "Hyped for GTA 6? Vice City and GTA V are the two closest in spirit."),
    ],
  },
  {
    id: "series-gta3",
    cat: "series",
    q: "Tell me about Grand Theft Auto III",
    kw: ["gta 3", "gta iii", "three", "2001", "liberty city", "3d", "first 3d", "claude"],
    next: ["series-vice-city", "series-list", "series-cities"],
    a: () => [
      p("**GTA III (2001)** took the series from a top-down view to a **full 3D open world**."),
      stats([
        { k: "Year", v: "2001" },
        { k: "City", v: "Liberty City" },
        { k: "Big deal", v: "First 3D" },
      ]),
      p("It set the template that every later game built on."),
    ],
  },
  {
    id: "series-vice-city",
    cat: "series",
    q: "Tell me about GTA: Vice City",
    kw: ["vice city", "2002", "tommy vercetti", "80s", "eighties", "miami", "neon", "retro"],
    next: ["gta6-vice-city", "series-san-andreas", "series-cities"],
    a: () => [
      p("**Vice City (2002)** is a love letter to 1980s Miami: neon, pastel suits, palm trees and a synth-heavy soundtrack."),
      stats([
        { k: "Year", v: "2002" },
        { k: "Lead", v: "Tommy Vercetti" },
        { k: "Vibe", v: "1980s" },
      ]),
      p("Its return in GTA 6 is a big part of why fans are so hyped."),
      actions({ label: "Is Vice City in GTA 6?", ask: "gta6-vice-city" }),
    ],
  },
  {
    id: "series-san-andreas",
    cat: "series",
    q: "Tell me about GTA: San Andreas",
    kw: ["san andreas", "2004", "cj", "carl johnson", "los santos", "san fierro", "las venturas", "three cities"],
    next: ["series-gta4", "series-cities", "series-list"],
    a: () => [
      p("**San Andreas (2004)** is a whole state in one game, with CJ as the lead."),
      stats([
        { k: "Year", v: "2004" },
        { k: "Lead", v: "CJ" },
        { k: "Cities", v: "3", hint: "Los Santos, San Fierro, Las Venturas" },
      ]),
    ],
  },
  {
    id: "series-gta4",
    cat: "series",
    q: "Tell me about GTA IV",
    kw: ["gta 4", "gta iv", "2008", "niko bellic", "liberty city", "realistic", "gritty", "four"],
    next: ["series-gta5", "series-san-andreas", "series-cities"],
    a: () => [
      p("**GTA IV (2008)** brought a more serious tone and a more realistic Liberty City, with **Niko Bellic** as the lead."),
      stats([
        { k: "Year", v: "2008" },
        { k: "Lead", v: "Niko Bellic" },
        { k: "City", v: "Liberty City" },
      ]),
    ],
  },
  {
    id: "series-gta5",
    cat: "series",
    q: "Tell me about GTA V",
    kw: ["gta 5", "gta v", "2013", "michael", "franklin", "trevor", "los santos", "blaine county", "five"],
    next: ["series-online", "gta6-vs-gta5", "series-list"],
    a: () => [
      p("**GTA V (2013)** is set in Los Santos and Blaine County, with three playable leads:"),
      ul("**Michael**", "**Franklin**", "**Trevor**"),
      p("You can switch between them at almost any time. It is still played by millions today."),
      actions({ label: "GTA V vs GTA 6", ask: "gta6-vs-gta5" }, { label: "What is GTA Online?", ask: "series-online" }),
    ],
  },
  {
    id: "series-online",
    cat: "series",
    q: "What is GTA Online?",
    kw: ["gta online", "online", "multiplayer", "shark card", "heists", "crew", "servers", "co-op"],
    next: ["series-gta5", "gta6-platforms", "gta6-news"],
    a: () => [
      p("**GTA Online** is the multiplayer world that launched for GTA V in 2013, a few weeks after the main game."),
      p("It lets you and your crew do jobs, heists and races in a shared city."),
      callout("info", "I don't have confirmed details about online play in GTA 6. Check Rockstar's official channels for that."),
    ],
  },
  {
    id: "series-cities",
    cat: "series",
    q: "Which real cities inspired the GTA cities?",
    kw: ["cities", "inspired", "real life", "new york", "los angeles", "miami", "san francisco", "las vegas", "florida", "based on"],
    next: ["series-list", "gta6-setting", "series-protagonists"],
    a: () => [
      table(
        ["GTA place", "Inspired by", "Games"],
        [
          ["Liberty City", "New York", "III, IV"],
          ["Vice City", "Miami", "Vice City, 6"],
          ["Los Santos", "Los Angeles", "San Andreas, V"],
          ["San Fierro", "San Francisco", "San Andreas"],
          ["Las Venturas", "Las Vegas", "San Andreas"],
          ["Leonida", "Florida", "6"],
        ]
      ),
    ],
  },
  {
    id: "series-protagonists",
    cat: "series",
    q: "Who are the main characters of each GTA?",
    kw: ["protagonist", "characters", "leads", "heroes", "who", "main character", "player", "cj", "niko", "tommy", "claude"],
    next: ["series-cities", "gta6-characters", "series-list"],
    a: () => [
      table(
        ["Game", "Lead"],
        [
          ["GTA III", "Claude"],
          ["Vice City", "Tommy Vercetti"],
          ["San Andreas", "CJ"],
          ["GTA IV", "Niko Bellic"],
          ["GTA V", "Michael, Franklin, Trevor"],
          ["GTA 6", "Lucia Caminos, Jason Duval"],
        ]
      ),
    ],
  },
  {
    id: "series-gta7",
    cat: "series",
    q: "Has GTA 7 been announced?",
    kw: ["gta 7", "gta vii", "next gta", "after gta 6", "sequel", "future", "seven", "next game", "next one"],
    next: ["series-site-gta7", "series-site-future", "gta6-news"],
    a: () => [
      p(`I don't have any announcement of a game after ${GTA6.short}. The wait for ${GTA6.short} has been long enough already.`),
      p("When Rockstar announces something new, it will be on its official channels first."),
      actions({ label: "Will the site change for new games?", ask: "series-site-gta7" }),
    ],
  },

  // ---- Where is this site going? -------------------------------------------
  {
    id: "series-site-future",
    cat: "series",
    q: "Will this site cover other GTA games?",
    kw: ["other games", "gta 5", "gta v", "vice city", "san andreas", "older", "all gta", "multiple", "more games", "expand", "support", "future", "roadmap", "other gta"],
    next: ["series-site-how", "series-site-now", "series-site-gta7"],
    a: () => [
      p(`${GTA6.short} is the home of this site today, and it is where all the energy is.`),
      p("But the platform is built to **grow beyond a single game**. The plan is for it to become the fan home for the whole series, past and future."),
      ul(
        "Older GTA games",
        "Whatever Rockstar releases after GTA 6",
        "Everything under one account"
      ),
      callout("info", "No dates are promised. New games will be announced on the site first."),
      actions({ label: "How would that work?", ask: "series-site-how" }, { label: "What can I post about now?", ask: "series-site-now" }),
    ],
  },
  {
    id: "series-site-gta7",
    cat: "series",
    q: "Will the site change with every new GTA release?",
    kw: ["new release", "every release", "gta 7", "change", "redesign", "new site", "rebuild", "next game", "franchise", "each game", "update"],
    next: ["series-site-how", "series-site-carry", "series-site-name"],
    a: () => [
      p("No new site for each game. The idea is **one home that grows**, not a new website every few years."),
      p("When a new GTA arrives, it is added as a new area of the same site, with its own communities and hub, rather than a reset."),
      ul(
        "Your account stays",
        "Your plan and perks stay",
        "The things you love about the site keep working"
      ),
      callout("info", "Rockstar has not announced a game after GTA 6, so there is nothing to add yet."),
    ],
  },
  {
    id: "series-site-how",
    cat: "series",
    q: "How would new games be added to the site?",
    kw: ["how", "added", "worlds", "districts", "areas", "sections", "per game", "separate", "structure", "organised", "switch game"],
    next: ["series-site-carry", "series-site-plans", "series-site-suggest"],
    a: () => [
      p("Think of each game as a **new district on the same map**."),
      steps(
        "A game gets its own communities, hub and topics.",
        "You switch between games without leaving the site.",
        "One feed, one profile and one login cover all of them."
      ),
      p("That way the GTA 6 crowd and, say, the Vice City nostalgia crowd each have a place without getting in each other's way."),
    ],
  },
  {
    id: "series-site-now",
    cat: "series",
    q: "Can I post about older GTA games right now?",
    kw: ["now", "today", "older", "gta 5", "gta v", "post about", "allowed", "other games", "off topic", "rule", "keep it gta 6"],
    next: ["series-site-future", "post-formats", "community-topic"],
    a: () => [
      p("Right now the rule is **Keep it GTA 6**. Posts, communities and the World Hub are all about GTA 6."),
      p("Other games can be mentioned **when they are being compared with GTA 6**. Off-topic posts can be removed."),
      actions({ label: "Read the Guidelines", href: "/guidelines" }),
    ],
  },
  {
    id: "series-site-carry",
    cat: "series",
    q: "Will my account, plan and perks carry over to new games?",
    kw: ["carry over", "keep", "account", "plan", "perks", "posts", "profile", "transfer", "lose", "badge", "future games"],
    next: ["series-site-plans", "series-site-name", "perks-forever"],
    a: () => [
      p("That is the plan. Your account belongs to **you**, not to one game."),
      ul(
        "Your username and profile",
        "Your plan, badges and one-time perks",
        "Your posts and followers"
      ),
      callout("info", "Details will be shared before any new game is added."),
    ],
  },
  {
    id: "series-site-name",
    cat: "series",
    q: "Why is it called GTA6FanBase if you add other games?",
    kw: ["name", "rename", "brand", "title", "gta6fanbase", "why gta6", "domain", "logo", "change name"],
    next: ["series-site-future", "series-site-gta7", "what-is-site"],
    a: () => [
      p("Because GTA 6 is where it started, and it is the main event right now."),
      p("If the name or look changes as the site grows, it will be announced on the site first, with plenty of notice."),
    ],
  },
  {
    id: "series-site-plans",
    cat: "series",
    q: "Will plans and prices change for new games?",
    kw: ["pricing", "plans", "cost", "per game", "extra", "subscription", "upgrade", "pay again", "separate plan"],
    next: ["plans-overview", "series-site-carry", "plans-limits-change"],
    a: () => [
      p("Plans today cover the **whole site**. No per-game plan has been announced."),
      p("If anything about plans changes when more games arrive, it will be announced here before it happens."),
      actions({ label: "See current plans", ask: "plans-overview" }),
    ],
  },
  {
    id: "series-site-suggest",
    cat: "series",
    q: "Can I suggest which game should be added first?",
    kw: ["suggest", "vote", "request", "which game", "first", "ask", "poll", "want", "demand"],
    next: ["site-suggest", "series-site-future", "site-contact"],
    a: () => [
      p("Yes. Tell the team what you would love to see through the contact form."),
      actions({ label: "Send an idea", href: "/contact?topic=bug" }, { label: "More ways to suggest", ask: "site-suggest" }),
    ],
  },
  {
    id: "series-site-when",
    cat: "series",
    q: "When will other games be added?",
    kw: ["when", "date", "timeline", "soon", "eta", "release", "schedule", "other games"],
    next: ["series-site-future", "site-new", "series-site-suggest"],
    a: () => [
      p("There is no date yet, and I'd rather not guess."),
      p("Any new game will be announced on the site first. In the meantime, GTA 6 is the focus."),
      actions({ label: "What is coming soon?", ask: "site-new" }),
    ],
  },
];
