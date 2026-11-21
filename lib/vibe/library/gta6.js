import { actions, callout, countdown, h, p, paras, stats, steps, table, timeline, ul } from "../kit";
import { GTA6, WORLD_AREAS, gta6Released } from "../facts";

const out = (now) => gta6Released(now);

// Category: gta6 (the game itself).
export default [
  {
    id: "gta6-release",
    cat: "gta6",
    q: "When does GTA 6 come out?",
    kw: ["release", "date", "launch", "when", "out", "coming", "come out", "available", "gta vi", "gta6"],
    next: ["gta6-delays", "gta6-platforms", "gta6-pc"],
    a: ({ now }) => [
      out(now)
        ? p(`GTA 6 is **out now**. Rockstar's release date was **${GTA6.releaseLabel}**.`)
        : p(`Rockstar's current release date for GTA 6 is **${GTA6.releaseLabel}**.`),
      countdown(GTA6.releaseDate, "until GTA 6"),
      p(`It is planned for ${GTA6.platforms}. ${GTA6.pc}`),
      callout("info", `Last checked on ${GTA6.asOf}. Dates can move, so Rockstar's own channels are the final word.`),
    ],
  },
  {
    id: "gta6-countdown",
    cat: "gta6",
    q: "How many days until GTA 6?",
    kw: ["countdown", "days", "how long", "wait", "time left", "hours", "timer", "until"],
    next: ["gta6-release", "gta6-delays", "gta6-platforms"],
    a: ({ now }) => [
      out(now) ? p("The wait is over. Welcome to Leonida!") : p("Here is the live clock, counting to the start of release day in **your** time zone:"),
      countdown(GTA6.releaseDate, "until GTA 6"),
    ],
  },
  {
    id: "gta6-delays",
    cat: "gta6",
    q: "How many times has GTA 6 been delayed?",
    kw: ["delay", "delayed", "postponed", "pushed back", "why late", "history of dates", "2025", "may 2026"],
    next: ["gta6-release", "gta6-countdown", "gta6-trailers"],
    a: () => [
      p("Twice. Here is the date history:"),
      timeline([
        { y: "2025", t: GTA6.delays[0].when, x: GTA6.delays[0].what + ", the first window Take-Two gave.", tone: "dim" },
        { y: "2026", t: GTA6.delays[1].when, x: GTA6.delays[1].what + ", announced with a delay out of 2025.", tone: "orange" },
        { y: "2026", t: GTA6.delays[2].when, x: GTA6.delays[2].what + ", announced in November 2025.", tone: "pink" },
      ]),
      p("Rockstar said the extra time was to finish the game to the level of polish fans expect."),
    ],
  },
  {
    id: "gta6-platforms",
    cat: "gta6",
    q: "Which platforms is GTA 6 on?",
    kw: ["platform", "ps5", "playstation", "xbox", "series x", "series s", "console", "switch", "steam", "epic", "pc", "ps4", "xbox one"],
    next: ["gta6-pc", "gta6-release", "gta6-developer"],
    a: () => [
      p(`Rockstar has confirmed **${GTA6.platforms}**.`),
      ul("PlayStation 5", "Xbox Series X|S"),
      p("It is not planned for last-generation consoles."),
      actions({ label: "Will it come to PC?", ask: "gta6-pc" }),
    ],
  },
  {
    id: "gta6-pc",
    cat: "gta6",
    q: "Will GTA 6 come to PC?",
    kw: ["pc", "computer", "windows", "steam", "epic games", "laptop", "port"],
    next: ["gta6-platforms", "gta6-release", "gta6-theories"],
    a: () => [
      p(`${GTA6.pc} Only the console versions have been confirmed.`),
      p("Plenty of fans have theories about a later PC version. You can read or post them in the **Theories** format."),
      callout("fact", "Fan talk is not official news. Treat anything about PC as a rumour until Rockstar says so."),
      actions({ label: "Post a theory", href: "/create" }),
    ],
  },
  {
    id: "gta6-setting",
    cat: "gta6",
    q: "Where is GTA 6 set? What is Leonida?",
    kw: ["leonida", "setting", "location", "florida", "vice city", "state", "where", "map", "world", "city"],
    next: ["gta6-map", "gta6-vice-city", "gta6-characters"],
    a: () => [
      p(`GTA 6 takes place in ${GTA6.setting}.`),
      p("Leonida is Rockstar's fictional take on Florida: beaches, swamps, small towns, islands and neon nightlife."),
      actions({ label: "See the map areas", ask: "gta6-map" }, { label: "Enter the World Hub", href: "/world" }),
    ],
  },
  {
    id: "gta6-vice-city",
    cat: "gta6",
    q: "Is Vice City in GTA 6?",
    kw: ["vice city", "return", "miami", "back", "classic", "tommy"],
    next: ["gta6-setting", "series-vice-city", "gta6-map"],
    a: () => [
      p("Yes. **Vice City** is back and sits at the heart of Leonida."),
      p("It first appeared in the original 1997 game, then got its own 1980s-flavoured game in 2002. This time it is the centre of a whole state."),
      actions({ label: "About Vice City (2002)", ask: "series-vice-city" }),
    ],
  },
  {
    id: "gta6-map",
    cat: "gta6",
    q: "What areas are on the Leonida map?",
    kw: ["map", "areas", "regions", "districts", "port gellhorn", "ambrosia", "mount kalaga", "grassrivers", "keys", "locations", "size"],
    next: ["world-map", "gta6-setting", "gta6-vice-city"],
    a: () => [
      p("These are the Leonida areas fans use to sort discoveries:"),
      ul(WORLD_AREAS.map((a) => `**${a}**`)),
      callout("warn", "The World Hub map is a fan index of areas. It is not an official or geographically exact map."),
      actions({ label: "Open map discoveries", href: "/world" }),
    ],
  },
  {
    id: "gta6-characters",
    cat: "gta6",
    q: "Who are Lucia and Jason?",
    kw: ["lucia", "jason", "characters", "protagonists", "main", "heroes", "leads", "duo", "caminos", "duval", "female"],
    next: ["world-characters", "gta6-setting", "gta6-trailers"],
    a: () => [
      p("They are the two lead characters of GTA 6:"),
      stats([
        { k: "Lucia Caminos", v: "Lead", hint: "billed as the series' first female lead" },
        { k: "Jason Duval", v: "Lead", hint: "the other half of the duo" },
      ]),
      p("You can add both to your collection in the World Hub."),
      actions({ label: "Collect them", href: "/world" }),
    ],
  },
  {
    id: "gta6-trailers",
    cat: "gta6",
    q: "How many GTA 6 trailers are there?",
    kw: ["trailer", "trailers", "teaser", "video", "reveal", "december 2023", "trailer 2", "watch"],
    next: ["world-trailers", "gta6-theories", "gta6-release"],
    a: () => [
      p("Two so far:"),
      timeline([
        { y: "Dec 2023", t: "Trailer 1", x: "The first look at Vice City, Lucia and Jason.", tone: "pink" },
        { y: "May 2025", t: "Trailer 2", x: "More of Leonida and its cast.", tone: "cyan" },
      ]),
      p("Want to break a trailer down frame by frame? Do it in the **Trailer frames** tab of the World Hub."),
      actions({ label: "Open Trailer frames", href: "/world" }),
    ],
  },
  {
    id: "gta6-developer",
    cat: "gta6",
    q: "Who makes GTA 6?",
    kw: ["rockstar", "developer", "publisher", "take-two", "studio", "made by", "company", "who makes"],
    next: ["site-official", "gta6-release", "series-list"],
    a: () => [
      p(`GTA 6 is made by **${GTA6.developer}** and published by **${GTA6.publisher}**.`),
      p("Rockstar's own channels are the official source of news. This site is an independent fan project."),
      actions({ label: "Is this site official?", ask: "site-official" }),
    ],
  },
  {
    id: "gta6-price",
    cat: "gta6",
    q: "How much does GTA 6 cost? Can I pre-order?",
    kw: ["price", "cost", "preorder", "pre-order", "edition", "buy", "store", "collector", "how much", "deluxe", "bundle"],
    next: ["gta6-platforms", "gta6-release", "gta6-news"],
    a: () => [
      p("I don't track store prices, editions or pre-orders. They can change by region and by shop."),
      p("For the real numbers, check **Rockstar's official page** or your console's store."),
      callout("tip", "Beware of unofficial sellers and \"leaked\" keys. If a deal looks too good, it probably is."),
    ],
  },
  {
    id: "gta6-news",
    cat: "gta6",
    q: "Where can I get official GTA 6 news?",
    kw: ["news", "latest", "official", "updates", "announcement", "newswire", "rockstar social", "source", "rumours"],
    next: ["gta6-leaks", "gta6-theories", "site-official"],
    a: () => [
      p("**Official news comes from Rockstar Games** through its own website and social channels."),
      p("On GTAFanbase, fans post what they spot and discuss it. That is great for hype and theories, but fan posts are **not verified** by Rockstar."),
      actions({ label: "Release & news community", href: "/communities" }),
    ],
  },
  {
    id: "gta6-leaks",
    cat: "gta6",
    q: "Are leaks allowed here?",
    kw: ["leak", "leaks", "rumour", "rumor", "spoiler", "spoilers", "allowed", "fake leak", "cover", "blurred"],
    next: ["gta6-spoilers", "report-someone", "gta6-news"],
    a: () => [
      p("Leaks can be discussed, but they are **covered by default** so nobody gets spoiled by accident."),
      ul(
        "Posts marked as spoilers or leaks sit behind a tap-to-reveal cover.",
        "Communities choose their own policy: allowed, covered or banned.",
        "Made-up leaks posted as real can get you removed."
      ),
      p("Read the full rules in the [Community Guidelines](/guidelines)."),
    ],
  },
  {
    id: "gta6-spoilers",
    cat: "gta6",
    q: "How do I avoid spoilers?",
    kw: ["spoiler", "avoid", "hide", "cover", "leak filter", "mute", "block", "spoil", "no spoilers"],
    next: ["gta6-leaks", "settings-muted", "settings-look"],
    a: () => [
      p("Set up the **Leak Filter** once and the site does the rest."),
      steps(
        "Open [Settings](/settings) and choose **Leak Filter**.",
        "Pick **cover**, **show** or **hide** for spoilers.",
        "Add **muted words** for names or topics you never want to see."
      ),
      callout("tip", "Hide the stories rail and post box there too if you want a calmer feed."),
      actions({ label: "Open Settings", href: "/settings#leaks" }),
    ],
  },
  {
    id: "gta6-theories",
    cat: "gta6",
    q: "Where do I post GTA 6 theories?",
    kw: ["theory", "theories", "easter egg", "evidence", "facts", "cap", "verdict", "speculation", "breakdown", "analysis"],
    next: ["post-formats", "world-trailers", "gta6-trailers"],
    a: () => [
      p("Use the **Theory** format when you create a post. Lay out your evidence and let people vote on it."),
      p("Everyone can cast a **Facts** or **Cap** verdict, so the community decides if your theory holds up."),
      actions({ label: "Write a theory", href: "/create" }),
    ],
  },
  {
    id: "gta6-vs-gta5",
    cat: "gta6",
    q: "How does GTA 6 compare to GTA V?",
    kw: ["compare", "comparison", "versus", "vs", "gta 5", "gta v", "difference", "better", "bigger", "los santos", "leonida"],
    next: ["series-gta5", "gta6-setting", "gta6-characters"],
    a: () => [
      p("What is confirmed so far, side by side:"),
      table(
        ["", "GTA V", "GTA 6"],
        [
          ["Released", "2013", GTA6.releaseLabel.replace("Thursday, ", "")],
          ["Setting", "Los Santos and Blaine County", "Leonida, with Vice City"],
          ["Leads", "Michael, Franklin, Trevor", "Lucia and Jason"],
          ["Launch platforms", "PS3, Xbox 360", "PS5, Xbox Series X|S"],
        ]
      ),
      p("Past that, it is theory territory. Share yours in the [Theories](/create) format."),
    ],
  },
];
