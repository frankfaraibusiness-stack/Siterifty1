// Single source of truth for the Gift Shop (/gifts). Safe to import from server
// AND client code (plain data, no secrets).
//
// IMPORTANT: prices are only ever trusted from THIS file. The browser sends a
// gift id; the server (lib/gifts-data.js) looks the price up here and works out
// the fees itself, so a tampered request can never change what is charged.
//
// Gifts are paid for with the member's WALLET (users/{uid}.walletMills), never
// a card. Money is stored and calculated in MILLS (1/1000 of a US dollar) as
// whole numbers, so $0.001 is the smallest unit and nothing is ever lost to
// floating point. The wallet and every gift amount are in US dollars.
//
// The shop is built to be shared: `kind` says what a gift does. Today every
// gift is a "collectible" (shown on the receiver's profile). Later kinds such as
// "perk" or "badge" can be added to GIFT_KINDS and handled in
// lib/gifts-data.js without touching the page, the checkout or the API.

export const GIFT_KINDS = ["collectible"];

// Longest message a sender can attach to a gift (the checkout counter and the server share it).
export const NOTE_MAX = 140;

// ---- fees ------------------------------------------------------------------
// Tax / service fee on every gift: a fixed $0.10 plus 5% of the gift's price.
export const FLAT_FEE_MILLS = 100; // $0.10
export const PERCENT_FEE = 0.05; // 5% of the gift price

export const MILLS_PER_DOLLAR = 1000;

export function dollarsToMills(usd) {
  return Math.round(Number(usd) * MILLS_PER_DOLLAR);
}

// 1234 -> "$1.234". Always three decimals, like the wallet card.
export function formatMills(mills) {
  const n = Number.isFinite(mills) ? mills : 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  const whole = Math.floor(abs / MILLS_PER_DOLLAR);
  const frac = String(abs % MILLS_PER_DOLLAR).padStart(3, "0");
  return `${sign}$${whole.toLocaleString("en-US")}.${frac}`;
}

// Short price for cards: $0.49, $12.99 (gift prices are whole cents).
export function formatPrice(usd) {
  return `$${Number(usd).toFixed(2)}`;
}

// What a gift costs the sender, all in mills:
//   price   the gift itself
//   flat    fixed $0.10
//   percent 5% of the price (rounded to the nearest mill)
//   fee     flat + percent  (the "tax")
//   total   price + fee     (what leaves the wallet)
export function giftQuote(gift) {
  const price = dollarsToMills(gift.price);
  const flat = FLAT_FEE_MILLS;
  const percent = Math.round(price * PERCENT_FEE);
  const fee = flat + percent;
  return { price, flat, percent, fee, total: price + fee };
}

// ---- where a gift is going --------------------------------------------------
// Opened from a comment, a post or a profile, the gift page remembers where the
// gift is going; opened from the menu ("shop") the sender types a handle.
export const CONTEXT_TYPES = ["comment", "post", "profile", "shop"];

const ID_RE = /^[A-Za-z0-9_-]{1,200}$/;
const HANDLE_RE = /^[a-zA-Z0-9_.]{3,20}$/;

export function cleanHandleInput(raw) {
  const h = String(raw ?? "").trim().replace(/^@/, "");
  return HANDLE_RE.test(h) ? h : "";
}

// Turns anything (search params, a request body) into a safe context object.
// `to` is only a hint for display; the server works out the real receiver
// from the comment / post it points at.
export function cleanContext(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const type = CONTEXT_TYPES.includes(r.type) ? r.type : "shop";
  const to = cleanHandleInput(r.to);
  const postId = typeof r.postId === "string" && ID_RE.test(r.postId) ? r.postId : "";
  const commentId = typeof r.commentId === "string" && ID_RE.test(r.commentId) ? r.commentId : "";
  if (type === "comment" && postId && commentId) return { type, postId, commentId, to };
  if (type === "post" && postId) return { type, postId, commentId: "", to };
  if (type === "profile" && to) return { type, postId: "", commentId: "", to };
  return { type: "shop", postId: "", commentId: "", to };
}

export function contextFromParams(params) {
  const get = (k) => {
    const v = params?.[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return cleanContext({
    type: get("ctx"),
    to: get("to"),
    postId: get("post"),
    commentId: get("c"),
  });
}

// Context -> "?to=lucia&ctx=comment&post=abc&c=def" (empty string for none).
export function contextQuery(ctx) {
  const c = cleanContext(ctx);
  const p = new URLSearchParams();
  if (c.to) p.set("to", c.to);
  if (c.type !== "shop") p.set("ctx", c.type);
  if (c.postId) p.set("post", c.postId);
  if (c.commentId) p.set("c", c.commentId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function giftsHref(ctx) {
  return `/gifts${contextQuery(ctx)}`;
}

export function giftHref(id, ctx) {
  return `/gifts/${id}${contextQuery(ctx)}`;
}

// Where "Back to where you were" goes after a gift is sent.
export function contextBackHref(ctx, username) {
  const c = cleanContext(ctx);
  if ((c.type === "comment" || c.type === "post") && c.postId) return `/p/${c.postId}`;
  if (c.type === "profile" && (c.to || username)) return `/u/${c.to || username}`;
  return "/";
}

export function contextLabel(ctx) {
  const c = cleanContext(ctx);
  if (c.type === "comment") return "their comment";
  if (c.type === "post") return "their post";
  if (c.type === "profile") return "their profile";
  return "the Gift Shop";
}

// ---- games, categories, rarity ---------------------------------------------
export const GAMES = [
  { id: "gta1", name: "GTA 1", year: 1997, color: "#ff8a3d" },
  { id: "gta2", name: "GTA 2", year: 1999, color: "#f2c230" },
  { id: "gta3", name: "GTA III", year: 2001, color: "#4fa3ff" },
  { id: "vc", name: "Vice City", year: 2002, color: "#ff4fb0" },
  { id: "sa", name: "San Andreas", year: 2004, color: "#3ecf6e" },
  { id: "lcs", name: "Liberty City Stories", year: 2005, color: "#7a8cff" },
  { id: "vcs", name: "Vice City Stories", year: 2006, color: "#ff7ac8" },
  { id: "gta4", name: "GTA IV", year: 2008, color: "#9aa7b8" },
  { id: "cw", name: "Chinatown Wars", year: 2009, color: "#e0483a" },
  { id: "gta5", name: "GTA V", year: 2013, color: "#7ddc4b" },
  { id: "online", name: "GTA Online", year: 2013, color: "#ffb23d" },
  { id: "gta6", name: "GTA VI", year: 2026, color: "#ff3d7f" },
  { id: "fan", name: "Fan Favourites", year: null, color: "#2de2c5" },
];

export const CATEGORIES = [
  { id: "badge", name: "Badges & Trophies" },
  { id: "vehicle", name: "Vehicles" },
  { id: "cash", name: "Cash & Loot" },
  { id: "wear", name: "Outfits & Style" },
  { id: "gear", name: "Gear & Gadgets" },
  { id: "place", name: "Properties & Places" },
  { id: "pet", name: "Animals" },
  { id: "food", name: "Food & Drinks" },
  { id: "music", name: "Radio & Music" },
  { id: "party", name: "Party & Fun" },
];

// Rarity comes from the price, so it can never disagree with it.
export const RARITIES = [
  { id: "common", name: "Common", max: 1, color: "#aab4c3" },
  { id: "rare", name: "Rare", max: 3, color: "#4fc3ff" },
  { id: "epic", name: "Epic", max: 10, color: "#b07bff" },
  { id: "legendary", name: "Legendary", max: 30, color: "#ffb23d" },
  { id: "mythic", name: "Mythic", max: Infinity, color: "#ff3d7f" },
];

export function rarityOf(price) {
  return RARITIES.find((r) => price < r.max) || RARITIES[RARITIES.length - 1];
}

export function getGame(id) {
  return GAMES.find((g) => g.id === id) || GAMES[GAMES.length - 1];
}

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

// ---- the gifts --------------------------------------------------------------
// [id, name, game, category, price (USD), emoji, one-line description]
// Add a row to add a gift. Ids must be unique, lower-case, URL-safe.
const RAW = [
  // GTA 1 (1997)
  ["g1-pager", "Mission Pager", "gta1", "gear", 0.49, "📟", "The beeper that started every job in the original top-down city."],
  ["g1-multiplier", "x10 Score Multiplier", "gta1", "badge", 0.99, "✖️", "Chain the carnage and watch the multiplier climb."],
  ["g1-siren", "Fuzz Siren", "gta1", "gear", 0.79, "🚨", "Red and blue, seen from straight above."],
  ["g1-wanted", "Wanted Stars", "gta1", "badge", 1.29, "⭐", "Five stars of pure top-down chaos."],
  ["g1-taxi", "Top-Down Taxi", "gta1", "vehicle", 1.49, "🚕", "Flat, fast and always in a hurry."],
  ["g1-payout", "Mission Payout", "gta1", "cash", 2.99, "💵", "A fat stack for a job well done."],
  ["g1-getaway", "Getaway Car", "gta1", "vehicle", 3.49, "🚗", "Engine running, driver ready."],
  ["g1-trophy", "City Founder Trophy", "gta1", "badge", 9.99, "🏆", "For the ones who were there at the very start."],

  // GTA 2 (1999)
  ["g2-postcard", "Anywhere City Postcard", "gta2", "place", 0.89, "🏙️", "Greetings from a city that could be anywhere."],
  ["g2-respect", "Gang Respect Meter", "gta2", "badge", 1.19, "🤝", "Earn it from every gang in town."],
  ["g2-loonies", "Loonies Smile", "gta2", "party", 1.49, "🤪", "Just a little bit unhinged."],
  ["g2-mayhem", "Mayhem Combo", "gta2", "badge", 1.79, "💥", "A chain of explosions worth framing."],
  ["g2-van", "Gang Van", "gta2", "vehicle", 2.29, "🚐", "Room for the whole crew."],
  ["g2-yakuza", "Yakuza Dragon Patch", "gta2", "badge", 2.49, "🐉", "A dragon stitched in gold thread."],
  ["g2-torch", "Flamethrower Torch", "gta2", "gear", 3.99, "🔥", "Turn up the heat on the whole block."],
  ["g2-briefcase", "Zaibatsu Briefcase", "gta2", "cash", 4.49, "💼", "Corporate cash, no questions asked."],

  // GTA III (2001)
  ["g3-token", "Liberty Subway Token", "gta3", "cash", 0.69, "🪙", "One ride across Liberty City."],
  ["g3-package", "Hidden Package", "gta3", "gear", 1.49, "📦", "One of a hundred. Go find the rest."],
  ["g3-radio", "Chatterbox FM", "gta3", "music", 1.99, "🎙️", "Talk radio that never stops talking."],
  ["g3-ambulance", "Paramedic Siren", "gta3", "vehicle", 2.49, "🚑", "Save lives, then save the high score."],
  ["g3-rampage", "Rampage Skull", "gta3", "badge", 2.99, "💀", "A rampage completed with style."],
  ["g3-jacket", "Claude's Green Jacket", "gta3", "wear", 3.99, "🧥", "The silent type, in a very loud jacket."],
  ["g3-dodo", "Dodo Airplane", "gta3", "vehicle", 4.99, "🛩️", "It almost flies. Almost."],
  ["g3-patriot", "Patriot 4x4", "gta3", "vehicle", 5.49, "🚙", "A big, boxy off-roader for a big, boxy city."],
  ["g3-bridge", "Callahan Bridge", "gta3", "place", 6.99, "🌉", "The skyline's favourite jump."],
  ["g3-banshee", "Banshee Roadster", "gta3", "vehicle", 7.99, "🏎️", "Sleek, loud and impossible to parallel park."],
  ["g3-suit", "Leone Family Suit", "gta3", "wear", 8.99, "🕴️", "Sharp enough to make the family proud."],

  // Vice City (2002)
  ["vc-cocktail", "Neon Cocktail", "vc", "food", 0.99, "🍹", "Served cold on Ocean Beach."],
  ["vc-golf", "Golf Club", "vc", "gear", 1.29, "⛳", "Fore! Aim at the horizon, or at someone."],
  ["vc-wave", "Wave 103 Radio", "vc", "music", 1.79, "📻", "Pure eighties synth, all night long."],
  ["vc-flash", "Flash FM Mixtape", "vc", "music", 1.69, "📼", "Press play on the neon decade."],
  ["vc-shades", "Vice Shades", "vc", "wear", 1.99, "🕶️", "Pastel suit not included."],
  ["vc-palm", "Neon Palm Sign", "vc", "place", 2.49, "🌴", "Glowing pink over the strip."],
  ["vc-shirt", "Hawaiian Shirt", "vc", "wear", 2.99, "👕", "Loud, loose and ready for the beach."],
  ["vc-sanchez", "Sanchez Dirt Bike", "vc", "vehicle", 3.99, "🏍️", "Light, fast and built for the dunes."],
  ["vc-trophy", "Vice City Assets Trophy", "vc", "badge", 5.99, "🏆", "Every asset collected, every dollar earned."],
  ["vc-cash", "Briefcase of Cash", "vc", "cash", 7.49, "💼", "Packed to the brim with eighties money."],
  ["vc-vercetti", "Vercetti Suit", "vc", "wear", 9.49, "🕴️", "Tailored for taking over a city."],
  ["vc-hunter", "Hunter Helicopter", "vc", "vehicle", 12.99, "🚁", "Rotor blades and a very bad attitude."],
  ["vc-infernus", "Infernus Supercar", "vc", "vehicle", 14.99, "🏎️", "The red rocket of Vice City."],
  ["vc-hotel", "Ocean View Hotel", "vc", "place", 19.99, "🏨", "A pink and teal art-deco landmark."],
  ["vc-yacht", "Marquis Yacht", "vc", "vehicle", 24.99, "🛥️", "Sunset cruising for people who made it."],
  ["vc-mansion", "Starfish Island Mansion", "vc", "place", 49.99, "🏰", "The kingpin's palace, pool and all."],

  // San Andreas (2004)
  ["sa-pizza", "Well Stacked Pizza", "sa", "food", 0.89, "🍕", "Extra stacked, extra cheesy."],
  ["sa-order", "Smoke's Order", "sa", "food", 1.09, "🍔", "Two number nines, a number nine large."],
  ["sa-cluckin", "Cluckin' Bell Combo", "sa", "food", 0.99, "🍗", "Crispy, loud and gone in a minute."],
  ["sa-cap", "Flat Cap", "sa", "wear", 1.19, "🧢", "The official headwear of Grove Street."],
  ["sa-bmx", "BMX Bike", "sa", "vehicle", 1.29, "🚲", "Pedal like your wanted level depends on it."],
  ["sa-gym", "Gym Membership", "sa", "gear", 1.49, "🏋️", "Gains guaranteed, hotdogs optional."],
  ["sa-flag", "Grove Street Flag", "sa", "badge", 1.99, "🚩", "Green forever."],
  ["sa-radio", "K-DST Classic Rock", "sa", "music", 1.89, "🎸", "Guitar solos for the long highway."],
  ["sa-chain", "Gold Chain", "sa", "wear", 3.49, "⛓️", "Heavy, shiny and impossible to miss."],
  ["sa-chiliad", "Mount Chiliad", "sa", "place", 4.99, "⛰️", "The biggest peak in the state, and the best view."],
  ["sa-lowrider", "Lowrider", "sa", "vehicle", 6.49, "🚗", "Hydraulics bouncing down the boulevard."],
  ["sa-train", "Brown Streak Train", "sa", "vehicle", 8.49, "🚂", "All aboard the cross-state express."],
  ["sa-jetpack", "Jetpack", "sa", "gear", 9.99, "🚀", "Skip the traffic. Skip the roads."],
  ["sa-casino", "Four Dragons Casino", "sa", "place", 14.49, "🎰", "Lights, dice and a very big gamble."],
  ["sa-hydra", "Hydra Jet", "sa", "vehicle", 17.99, "✈️", "Vertical takeoff, zero chill."],

  // Liberty City Stories (2005)
  ["lcs-donuts", "Donut Box", "lcs", "food", 0.79, "🍩", "A dozen, and the police are welcome."],
  ["lcs-bike", "Angel Bike", "lcs", "vehicle", 2.49, "🏍️", "Wind in the face, mob in the rear-view."],
  ["lcs-skyline", "Staunton Island Skyline", "lcs", "place", 3.29, "🌃", "The island lights up at night."],
  ["lcs-bar", "Salvatore's Bar", "lcs", "place", 4.29, "🍸", "A quiet drink and a quiet word."],
  ["lcs-ring", "Leone Family Ring", "lcs", "wear", 5.49, "💍", "Kiss the ring, respect the family."],
  ["lcs-trophy", "Liberty Hustler Trophy", "lcs", "badge", 6.49, "🏆", "Every street corner remembers you."],

  // Vice City Stories (2006)
  ["vcs-cap", "Vic's Army Cap", "vcs", "badge", 1.89, "🎖️", "Salute, then back to business."],
  ["vcs-disco", "Disco Ball", "vcs", "party", 2.19, "🪩", "Spin it like it's 1984."],
  ["vcs-boat", "Speedboat", "vcs", "vehicle", 4.49, "🚤", "Skim the bay at full throttle."],
  ["vcs-bag", "Heist Bag", "vcs", "cash", 6.99, "💰", "Heavy, loud and totally unmarked."],
  ["vcs-empire", "Empire Building Deed", "vcs", "place", 11.49, "📜", "Own the block, own the business."],

  // GTA IV (2008)
  ["gta4-phone", "Flip Phone", "gta4", "gear", 1.29, "📱", "T9 texting at its finest."],
  ["gta4-cluck", "Cluckin' Bell Bucket", "gta4", "food", 1.19, "🍗", "A bucket to share, or not."],
  ["gta4-comedy", "Comedy Club Ticket", "gta4", "party", 1.69, "🎤", "Front row, no heckling."],
  ["gta4-bowling", "Bowling Night", "gta4", "party", 1.99, "🎳", "Strikes, spares and a cousin who's late."],
  ["gta4-radio", "Vladivostok FM", "gta4", "music", 1.89, "📻", "Eastern beats for the late drive."],
  ["gta4-badge", "LCPD Badge", "gta4", "badge", 2.99, "🛡️", "Serve and protect, mostly."],
  ["gta4-taxi", "Roman's Taxi Cab", "gta4", "vehicle", 3.99, "🚕", "Cousin Roman's pride and joy."],
  ["gta4-jacket", "Niko's Jacket", "gta4", "wear", 4.49, "🧥", "Worn leather and a whole lot of backstory."],
  ["gta4-skyline", "Algonquin Skyline", "gta4", "place", 5.49, "🌆", "Rain, steel and a thousand windows."],
  ["gta4-statue", "Statue of Happiness", "gta4", "place", 8.99, "🗽", "Liberty's cheeky cousin."],
  ["gta4-nrg", "NRG-900 Bike", "gta4", "vehicle", 8.49, "🏍️", "A sport bike with a death wish."],
  ["gta4-heli", "Annihilator Helicopter", "gta4", "vehicle", 13.49, "🚁", "Rooftop-to-rooftop firepower."],
  ["gta4-pad", "Hove Beach Pad", "gta4", "place", 17.49, "🏢", "Your very own Liberty City penthouse."],

  // Chinatown Wars (2009)
  ["cw-minigame", "Minigame Trophy", "cw", "badge", 0.99, "🕹️", "Top score on the handheld."],
  ["cw-dimsum", "Dim Sum Basket", "cw", "food", 0.89, "🥟", "Steamed, stacked and shared."],
  ["cw-pda", "Handheld PDA", "cw", "gear", 1.99, "📲", "Everything you need in one touchscreen."],
  ["cw-racer", "Street Racer", "cw", "vehicle", 3.19, "🏎️", "Tuned for the late-night run."],
  ["cw-gate", "Chinatown Gate", "cw", "place", 4.19, "⛩️", "Red, gold and watching over the block."],
  ["cw-dragon", "Huang's Dragon Ring", "cw", "wear", 5.99, "🐲", "A family heirloom with a dangerous history."],

  // GTA V (2013)
  ["gta5-yoga", "Yoga on the Hill", "gta5", "party", 0.99, "🧘", "Breathe in, breathe out, ignore the helicopters."],
  ["gta5-tennis", "Tennis Racket", "gta5", "gear", 1.09, "🎾", "Game, set, match, Los Santos."],
  ["gta5-radio", "Los Santos Rock Radio", "gta5", "music", 1.99, "🎶", "Classics for the Vinewood drive."],
  ["gta5-alien", "Chiliad Alien", "gta5", "place", 1.99, "👽", "The mystery nobody has solved."],
  ["gta5-customs", "Customs Voucher", "gta5", "gear", 2.69, "🔧", "Free upgrades at the garage."],
  ["gta5-chop", "Chop the Dog", "gta5", "pet", 2.99, "🐕", "Loyal, loud and a very good boy."],
  ["gta5-cable", "Cable Car", "gta5", "vehicle", 3.59, "🚡", "A quiet ride over a loud city."],
  ["gta5-mask", "Heist Crew Mask", "gta5", "gear", 3.69, "🎭", "Everyone gets one. Nobody gets a name."],
  ["gta5-plane", "Trevor's Toy Plane", "gta5", "vehicle", 4.79, "🛩️", "Small plane, large problems."],
  ["gta5-kraken", "Kraken Submersible", "gta5", "vehicle", 7.99, "🤿", "Hunt for wrecks on the sea floor."],
  ["gta5-sign", "Vinewood Sign", "gta5", "place", 9.49, "🎬", "A white-letter icon on the hill."],
  ["gta5-vault", "Pacific Standard Vault", "gta5", "place", 14.99, "🏦", "The big score, in a very big room."],
  ["gta5-adder", "Adder Supercar", "gta5", "vehicle", 19.99, "🏎️", "Two seats and a very long straight."],
  ["gta5-mansion", "Rockford Hills Mansion", "gta5", "place", 29.99, "🏡", "Pool, views and a therapist on speed dial."],

  // GTA Online (2013)
  ["on-arcade", "Arcade Token", "online", "party", 0.59, "🕹️", "One more round, then one more."],
  ["on-rp", "RP Boost", "online", "badge", 1.49, "📈", "Level up faster, brag louder."],
  ["on-chip", "Casino Chip", "online", "party", 1.99, "🃏", "Place your bet, ride your luck."],
  ["on-crate", "Supply Crate", "online", "gear", 2.19, "📦", "Contents unknown, fun guaranteed."],
  ["on-tune", "Drift Tune Kit", "online", "gear", 2.39, "🛞", "Slide sideways with confidence."],
  ["on-keycard", "Bunker Keycard", "online", "gear", 3.49, "🔑", "Opens doors that should stay shut."],
  ["on-rank100", "Rank 100 Badge", "online", "badge", 3.99, "💯", "Triple digits and still going."],
  ["on-shark", "Shark Card", "online", "cash", 4.99, "🦈", "A pocketful of in-game cash."],
  ["on-nightclub", "Nightclub Pass", "online", "place", 7.49, "🎧", "Skip the line, own the dance floor."],
  ["on-bull", "Bull Shark Card", "online", "cash", 9.99, "🦈", "Bigger bites, bigger bills."],
  ["on-diamond", "Pink Diamond", "online", "cash", 12.99, "💎", "The prize from the island heist."],
  ["on-oppressor", "Oppressor Hoverbike", "online", "vehicle", 22.99, "🏍️", "Fly low, annoy everyone."],
  ["on-whale", "Whale Shark Card", "online", "cash", 24.99, "🐋", "The biggest card in the ocean."],
  ["on-penthouse", "Diamond Penthouse", "online", "place", 34.99, "🏙️", "Casino views from the top floor."],
  ["on-superyacht", "Luxury Super Yacht", "online", "vehicle", 39.99, "🛥️", "A floating mansion with a helipad."],

  // GTA VI (2026)
  ["g6-ticket", "Trailer Hype Ticket", "gta6", "badge", 0.99, "🎟️", "You watched the trailer. Twice. At least."],
  ["g6-countdown", "Launch Countdown", "gta6", "badge", 1.49, "⏳", "Every second counts down to Leonida."],
  ["g6-storm", "Hurricane Warning", "gta6", "party", 1.59, "🌀", "Batten down the hatches, keep posting."],
  ["g6-flamingo", "Leonida Flamingo", "gta6", "pet", 1.99, "🦩", "Pink, proud and standing on one leg."],
  ["g6-mixtape", "Vice Radio Mixtape", "gta6", "music", 2.29, "🎧", "Sun-soaked beats for the Keys."],
  ["g6-bar", "Ocean Drive Bar Tab", "gta6", "food", 2.79, "🍹", "Cold drinks, warm nights."],
  ["g6-beach", "Vice Beach Pass", "gta6", "place", 2.99, "🏖️", "Sand, sun and a sunburn."],
  ["g6-gator", "Gator Plushie", "gta6", "pet", 3.49, "🐊", "Big smile, soft teeth."],
  ["g6-scooter", "Beach Cruiser Scooter", "gta6", "vehicle", 3.79, "🛵", "Cruise the boardwalk in style."],
  ["g6-sunset", "Leonida Keys Sunset", "gta6", "place", 3.99, "🌅", "The skyline turns orange and pink."],
  ["g6-cap", "Jason's Cap", "gta6", "wear", 4.99, "🧢", "Pulled low for the long drive."],
  ["g6-patrol", "Leonida Highway Patrol", "gta6", "vehicle", 5.19, "🚓", "Lights on across the causeway."],
  ["g6-jacket", "Lucia's Fan Jacket", "gta6", "wear", 5.99, "🧥", "Stitched for the new era."],
  ["g6-airboat", "Grassrivers Airboat", "gta6", "vehicle", 6.99, "🚤", "Skim the swamp, wave at the gators."],
  ["g6-lowrider", "Leonida Lowrider", "gta6", "vehicle", 8.99, "🚗", "Candy paint and a booming trunk."],
  ["g6-dayone", "Day-One Edition Badge", "gta6", "badge", 9.99, "🥇", "You were here on day one."],
  ["g6-penthouse", "Mile-High Penthouse", "gta6", "place", 44.99, "🌇", "The best view in Vice City."],
  ["g6-duo", "Lucia & Jason Duo Trophy", "gta6", "badge", 29.99, "🏆", "Two partners. One legendary run."],
  ["g6-vault", "Ultimate Vice Vault", "gta6", "cash", 99.99, "💰", "The biggest score the fanbase has ever seen."],

  // Fan favourites (any game)
  ["fan-heart", "Big Love Heart", "fan", "badge", 0.29, "❤️", "A little love, delivered instantly."],
  ["fan-thumb", "Respect+", "fan", "badge", 0.39, "👍", "Plain old respect, always welcome."],
  ["fan-star", "Gold Star", "fan", "badge", 0.49, "🌟", "A shiny gold star for a great take."],
  ["fan-confetti", "Confetti Pop", "fan", "party", 0.59, "🎉", "Because it deserves a celebration."],
  ["fan-fire", "Hot Take Fire", "fan", "badge", 0.69, "🔥", "A scorching opinion, well said."],
  ["fan-banger", "Certified Banger", "fan", "badge", 0.79, "✅", "Stamped and approved."],
  ["fan-chicken", "Lucky Chicken", "fan", "pet", 0.99, "🐔", "Brings luck to the whole thread."],
  ["fan-coffee", "Buy Me a Coffee", "fan", "food", 1.0, "☕", "Fuel for the next great post."],
  ["fan-pigeon", "Flying Rat", "fan", "pet", 1.19, "🐦", "Every city has one, and you found yours."],
  ["fan-detective", "Detective Magnifier", "fan", "badge", 1.39, "🔎", "For the sharpest eyes in every trailer."],
  ["fan-rocket", "Hype Rocket", "fan", "party", 1.49, "🚀", "Send the hype to the moon."],
  ["fan-cake", "Birthday Cake", "fan", "party", 1.79, "🎂", "Candles lit, wish made."],
  ["fan-medal", "Top Commenter Medal", "fan", "badge", 1.89, "🏅", "For the one who is always in the replies."],
  ["fan-brain", "Big Brain Award", "fan", "badge", 1.99, "🧠", "For the theory nobody saw coming."],
  ["fan-controller", "Golden Controller", "fan", "badge", 2.49, "🎮", "A trophy for a lifetime of button mashing."],
  ["fan-mic", "Golden Mic", "fan", "music", 3.29, "🎤", "Drop it. Everyone is listening."],
  ["fan-rain", "Make It Rain", "fan", "cash", 3.99, "💸", "Cash falling like confetti."],
  ["fan-champagne", "Champagne Pop", "fan", "food", 4.69, "🍾", "Pop the cork, you earned it."],
  ["fan-crown", "Fanbase Crown", "fan", "badge", 6.49, "👑", "A royal nod to a legend of the community."],
  ["fan-diamond", "Flawless Diamond", "fan", "cash", 14.99, "💎", "Rare, clear and impossible to ignore."],
];

export const GIFTS = RAW.map(([id, name, game, category, price, emoji, blurb]) => {
  const rarity = rarityOf(price);
  return {
    id,
    name,
    game,
    category,
    price,
    emoji,
    blurb,
    kind: "collectible",
    rarity: rarity.id,
  };
});

// Shown first on the default "Featured" order of the shop.
export const FEATURED = [
  "g6-dayone",
  "vc-infernus",
  "fan-crown",
  "sa-jetpack",
  "gta5-chop",
  "g6-gator",
  "on-shark",
  "gta4-statue",
  "fan-heart",
  "vc-mansion",
  "g6-flamingo",
  "fan-brain",
];

const BY_ID = new Map(GIFTS.map((g) => [g.id, g]));

// ---- animations -------------------------------------------------------------
// Every gift moves in its own way. There are 24 idle motions and 8 hover
// bursts (see app/gifts.css, `fxi-*` and `fxh-*`); a gift's look is the PAIR
// (idle + hover) plus its own timing, and no two gifts share a pair. Motion is
// themed (cars drive, helicopters fly, fire flickers, cash drops...) and the
// pairs are handed out in catalog order, so they never change between visits.
// Adding gifts past the number of free pairs reuses one (with its own timing).
export const IDLE_FX = [
  "bob", "spin", "sway", "pulse", "heartbeat", "wiggle", "shake", "drive",
  "fly", "flicker", "twinkle", "jelly", "swing", "flip", "rise", "drop",
  "orbit", "glitch", "zoom", "rock", "hop", "blink", "slide", "wobble",
];
export const HOVER_FX = ["pop", "spin", "shake", "jump", "flip", "tada", "bounce", "wiggle"];

// Best-fitting motions per type, most fitting first (used before the rest).
const CATEGORY_FX = {
  vehicle: ["drive", "slide", "rock", "fly", "bob", "sway"],
  cash: ["drop", "twinkle", "flip", "bob", "jelly", "pulse"],
  badge: ["twinkle", "pulse", "heartbeat", "zoom", "swing", "flip"],
  wear: ["sway", "swing", "bob", "jelly", "wobble", "pulse"],
  gear: ["glitch", "shake", "wiggle", "blink", "swing", "flicker"],
  place: ["pulse", "bob", "twinkle", "sway", "rise", "wobble"],
  pet: ["hop", "wiggle", "jelly", "bob", "blink", "wobble"],
  food: ["rise", "bob", "wobble", "jelly", "sway", "pulse"],
  music: ["sway", "pulse", "bob", "zoom", "wiggle", "orbit"],
  party: ["zoom", "jelly", "wiggle", "spin", "pulse", "twinkle"],
};
// Even better when the picture itself says how it should move.
const EMOJI_FX = {
  "🚗": "drive", "🚕": "drive", "🚙": "drive", "🚐": "drive", "🚓": "drive", "🚑": "drive",
  "🏎️": "slide", "🛵": "slide", "🏍️": "slide", "🚲": "slide", "🚂": "slide",
  "🚁": "fly", "🛩️": "fly", "✈️": "fly", "🚀": "fly", "🐦": "fly", "🚡": "swing",
  "🛥️": "rock", "🚤": "rock", "🤿": "rock", "🦈": "rock", "🐋": "rock",
  "🔥": "flicker", "🚨": "flicker", "⭐": "twinkle", "🌟": "twinkle", "💎": "twinkle", "👑": "twinkle",
  "❤️": "heartbeat", "💵": "drop", "💸": "drop", "💰": "drop", "💼": "drop",
  "🪙": "flip", "🎰": "flip", "🃏": "flip", "🔑": "swing", "🎟️": "swing", "🪩": "spin", "🕹️": "glitch", "📟": "glitch",
  "🎉": "zoom", "🐕": "hop", "🐔": "hop", "🐊": "hop", "🦩": "sway", "👽": "wobble", "🌀": "spin", "⏳": "flip",
};

function hashOf(str) {
  let h = 5381;
  for (const ch of String(str)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h;
}

function assignFx(list) {
  const used = new Set();
  for (const g of list) {
    const h = hashOf(g.id);
    const wanted = [EMOJI_FX[g.emoji], ...(CATEGORY_FX[g.category] || []), ...IDLE_FX].filter(Boolean);
    const order = [...new Set(wanted)];
    let idle = null;
    let hover = null;
    search: for (const i of order) {
      for (let k = 0; k < HOVER_FX.length; k++) {
        const hv = HOVER_FX[(h + k) % HOVER_FX.length];
        if (!used.has(`${i}|${hv}`)) {
          idle = i;
          hover = hv;
          break search;
        }
      }
    }
    if (!idle) {
      idle = order[h % order.length];
      hover = HOVER_FX[h % HOVER_FX.length];
    }
    used.add(`${idle}|${hover}`);
    // Own speed (2.4s to 4.7s) and start offset, so neighbours never move in step.
    g.fx = {
      idle,
      hover,
      dur: Number((2.4 + ((h >>> 3) % 24) / 10).toFixed(1)),
      delay: Number((((h >>> 9) % 30) / 10).toFixed(1)),
    };
  }
}
assignFx(GIFTS);

// className + style for the element that holds a gift's emoji, so any screen
// (shop, checkout, comments, profile) animates a gift the same way.
export function giftFxProps(giftOrId) {
  const g = typeof giftOrId === "string" ? BY_ID.get(giftOrId) : giftOrId;
  const fx = g?.fx || { idle: "bob", hover: "pop", dur: 3.2, delay: 0 };
  return {
    className: `gf-fx fx-i-${fx.idle} fx-h-${fx.hover}`,
    style: { "--fd": `${fx.dur}s`, "--fdl": `-${fx.delay}s` },
  };
}

// ---- default messages -------------------------------------------------------
// A gift sent with no message of its own still says something where people
// read it (comments, profiles). It is picked from the gift's type, and is
// always the same for the same gift (seeded by the receipt id), so it never
// changes between page loads. The stored message stays empty.
const DEFAULT_NOTES = {
  badge: ["Well earned. Take a bow.", "A little something for the trophy shelf.", "You deserve this one.", "Wear it with pride."],
  vehicle: ["Keys are in the ignition. Go for a drive.", "Fresh ride, on the house.", "Park it somewhere nice.", "Engine running. Don't wait up."],
  cash: ["Consider this a payday.", "Spend it wisely. Or don't.", "Cash drop! Try not to spend it all at once.", "A little loot for the road."],
  wear: ["Fresh look, on me.", "Looking sharp already.", "A new fit for the next mission."],
  gear: ["Handy for your next mission.", "Every crew needs one of these.", "Gear up, you're going to need it."],
  place: ["A new spot to call your own.", "Home sweet home. Enjoy the view.", "Welcome to the neighbourhood."],
  pet: ["Meet your new best friend.", "Take good care of this one.", "Say hello to the newest member of the crew."],
  food: ["Grab a bite on me.", "Dinner is served.", "Cheers! This one is on me."],
  music: ["Turn it up loud.", "Press play and cruise.", "A tune for the long drive."],
  party: ["Let's celebrate!", "Party time. You earned it.", "Bring the noise."],
};
const DEFAULT_ANY = ["Sent with love from the fanbase.", "Just because you're awesome.", "A little gift to brighten your day."];

export function defaultGiftMessage(giftId, seed = "") {
  const g = BY_ID.get(giftId);
  const list = (g && DEFAULT_NOTES[g.category]) || DEFAULT_ANY;
  return list[hashOf(`${giftId}:${seed}`) % list.length];
}

// What to show for a gift's message: the sender's own words, or a default.
export function giftMessage(giftId, note, seed = "") {
  const own = String(note || "").trim();
  return own ? { text: own, auto: false } : { text: defaultGiftMessage(giftId, seed), auto: true };
}

export function getGift(id) {
  return typeof id === "string" ? BY_ID.get(id) || null : null;
}

export function isGiftId(id) {
  return typeof id === "string" && BY_ID.has(id);
}

// Filters + sorts the catalog (used by the shop's search and chips).
export function filterGifts(list, { q = "", game = "all", category = "all", rarity = "all", sort = "featured" } = {}) {
  const needle = q.trim().toLowerCase();
  const words = needle ? needle.split(/\s+/) : [];
  let out = list.filter((g) => {
    if (game !== "all" && g.game !== game) return false;
    if (category !== "all" && g.category !== category) return false;
    if (rarity !== "all" && g.rarity !== rarity) return false;
    if (!words.length) return true;
    const hay = `${g.name} ${g.blurb} ${getGame(g.game).name} ${getCategory(g.category).name} ${g.rarity}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  if (sort === "low") out = [...out].sort((a, b) => a.price - b.price);
  else if (sort === "high") out = [...out].sort((a, b) => b.price - a.price);
  else if (sort === "az") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "new") {
    // Newest game first, GTA VI on top (Fan Favourites go last).
    const rank = (g) => (g.game === "fan" ? -1 : GAMES.findIndex((x) => x.id === g.game));
    out = [...out].sort((a, b) => rank(b) - rank(a) || a.price - b.price);
  } else {
    // "featured": the hand-picked list first, then the catalog order.
    const pos = (g) => {
      const i = FEATURED.indexOf(g.id);
      return i === -1 ? FEATURED.length : i;
    };
    out = [...out].sort((a, b) => pos(a) - pos(b));
  }
  return out;
}

// Splits a post's gifts for the comments sheet: `post` are gifts sent to the
// post itself, `byComment` maps a comment id to the gifts sent from it.
export function groupPostGifts(gifts) {
  const post = [];
  const byComment = new Map();
  for (const g of Array.isArray(gifts) ? gifts : []) {
    if (!g.commentId) {
      post.push(g);
      continue;
    }
    if (!byComment.has(g.commentId)) byComment.set(g.commentId, []);
    byComment.get(g.commentId).push(g);
  }
  return { post, byComment };
}
