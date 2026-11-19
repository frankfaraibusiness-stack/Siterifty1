// The places on the site that used to be reachable only from the side menu
// (Perks shop, Gift shop, Advertise, World Hub, Saved posts, Upgrade), and which
// spots now point at them. One list, so a title, a note or a price is edited in
// one place and every spot follows. Pure data, safe on server and client.
// (Relative import on purpose: plain Node runs the tests and can't resolve "@/".)
import { AD_RATES } from "./ads.js";

const dollars = (cents) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

// `title` is the short name used on tiles and rows, `short` the one-line pitch.
// `tone` picks the accent colour (the same names the side menu uses).
export const DOORS = {
  perks: {
    id: "perks",
    title: "Perks shop",
    short: "Pay once, keep forever",
    href: "/perks",
    tone: "pink",
    icon: "spark",
  },
  gifts: {
    id: "gifts",
    title: "Gift shop",
    short: "Gifts from GTA 1 to GTA VI",
    href: "/gifts",
    tone: "cyan",
    icon: "gift",
  },
  advertise: {
    id: "advertise",
    title: "Advertise",
    short: `Reach fans from ${dollars(AD_RATES.image.cpmCents)} per 1,000 views`,
    href: "/advertise",
    tone: "gold",
    icon: "ads",
  },
  world: {
    id: "world",
    title: "World Hub",
    short: "Discover, collect and predict",
    href: "/world",
    tone: "lime",
    icon: "map",
  },
  saved: {
    id: "saved",
    title: "Saved posts",
    short: "Your bookmarks",
    href: "/saved",
    tone: "violet",
    icon: "bookmark",
  },
  upgrade: {
    id: "upgrade",
    title: "Upgrade",
    short: "Rank up your account",
    href: "/upgrade",
    tone: "orange",
    icon: "rank",
  },
};

// Which doors each spot shows, in order. A page never lists itself. Settings
// leaves Upgrade out because the Membership panel already is the upgrade door.
export const SPOTS = {
  settings: ["perks", "gifts", "advertise", "world", "saved"],
  profile: ["perks", "gifts", "advertise", "world"],
  feedEnd: ["perks", "gifts", "advertise"],
  perks: ["gifts", "advertise", "world"],
  gifts: ["perks", "advertise", "world"],
  advertise: ["perks", "gifts", "upgrade"],
  upgrade: ["perks", "gifts", "advertise"],
  world: ["gifts", "perks", "advertise"],
  saved: ["perks", "gifts", "world"],
  events: ["advertise", "perks", "gifts"],
  communities: ["advertise", "world", "perks"],
};

// The doors for a spot, as full objects. `notes` swaps a door's one-liner
// (the settings page shows how many perks you own, for example); anything
// empty falls back to the default.
export function doorsFor(spot, notes = {}) {
  return (SPOTS[spot] || [])
    .map((id) => DOORS[id])
    .filter(Boolean)
    .map((d) => (notes[d.id] ? { ...d, short: notes[d.id] } : d));
}
