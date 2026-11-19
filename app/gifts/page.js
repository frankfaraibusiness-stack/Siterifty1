import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import WalletCard from "@/components/gifts/WalletCard";
import Stepper from "@/components/gifts/Stepper";
import GiftsShop from "@/components/gifts/GiftsShop";
import Discover from "@/components/Discover";
import { getCurrentUser } from "@/lib/current-user";
import { getWalletMills, previewReceiver } from "@/lib/gifts-data";
import {
  CATEGORIES,
  GAMES,
  GIFTS,
  RARITIES,
  contextFromParams,
  giftHref,
} from "@/lib/gifts";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "GTA Gift Shop · GTAFanbase",
  description: `Send gifts to other GTA fans: ${GIFTS.length} collectibles from GTA 1 to GTA VI, including cars, badges, properties, outfits and more. Pay from your wallet, no card needed.`,
  alternates: { canonical: "/gifts" },
  openGraph: {
    title: "GTA Gift Shop · GTAFanbase",
    description: "Send cars, badges, properties and more to fellow GTA fans, from GTA 1 to GTA VI.",
  },
};

const pick = (v) => (Array.isArray(v) ? v[0] : v) || "";
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

export default async function GiftsPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  const requested = contextFromParams(sp);

  const [balance, preview] = await Promise.all([
    signedIn ? getWalletMills(user.uid) : 0,
    requested.type !== "shop" || requested.to
      ? previewReceiver(user, requested)
      : { ctx: requested, receiver: null, problem: "" },
  ]);

  const initial = {
    q: pick(sp.q).slice(0, 60),
    game: oneOf(pick(sp.game), GAMES.map((g) => g.id), "all"),
    category: oneOf(pick(sp.cat), CATEGORIES.map((c) => c.id), "all"),
    rarity: oneOf(pick(sp.rarity), RARITIES.map((r) => r.id), "all"),
    sort: oneOf(pick(sp.sort), ["featured", "new", "low", "high", "az"], "featured"),
  };

  const base = siteUrl();
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GTAFanbase Gift Shop",
    numberOfItems: GIFTS.length,
    itemListElement: GIFTS.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.name,
      url: `${base}${giftHref(g.id)}`,
    })),
  }).replace(/</g, "\\u003c");

  return (
    <>
      <SiteHeaderClient user={user} returnHome />
      <main className="gf-page">
        <WalletCard mills={balance} signedIn={signedIn} />

        <header className="gf-hero">
          <p className="gf-eyebrow">Gift Shop</p>
          <h1 className="gf-title">Send a gift to a fellow fan</h1>
          <p className="gf-sub">
            {GIFTS.length} collectibles from GTA 1 to GTA VI. Pick one, choose who it is for and pay from your
            wallet.
          </p>
        </header>

        <Stepper step={1} />

        <GiftsShop
          ctx={preview.ctx}
          receiver={preview.receiver}
          problem={preview.problem}
          initial={initial}
        />

        <section className="gf-how" aria-label="How gifting works">
          <div>
            <b>1. Pick a gift</b>
            <span>Cars, badges, properties, outfits and more from every GTA game.</span>
          </div>
          <div>
            <b>2. Choose who gets it</b>
            <span>Gifts from a comment, post or profile go straight to that person. Or type any handle.</span>
          </div>
          <div>
            <b>3. Pay from your wallet</b>
            <span>The gift price plus a fixed $0.10 and 5% tax. No card needed.</span>
          </div>
        </section>

        <Discover spot="gifts" variant="tiles" className="dc-foot" title="More from GTAFanbase" />
      </main>
      <ScrollTopButton />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
    </>
  );
}
