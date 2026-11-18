import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import GiftCheckout from "@/components/gifts/GiftCheckout";
import GiftCard from "@/components/gifts/GiftCard";
import { getCurrentUser } from "@/lib/current-user";
import { getWalletMills, previewReceiver } from "@/lib/gifts-data";
import {
  GIFTS,
  contextFromParams,
  getCategory,
  getGame,
  getGift,
  giftsHref,
} from "@/lib/gifts";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const gift = getGift(id);
  if (!gift) return { title: "Gift not found · GTAFanbase" };
  const game = getGame(gift.game);
  const title = `${gift.name} (${game.name}) · Gift Shop · GTAFanbase`;
  const description = `${gift.blurb} Send the ${gift.name} ${gift.emoji} to a fellow GTA fan for $${gift.price.toFixed(2)}, paid from your wallet.`;
  return {
    title,
    description,
    alternates: { canonical: `/gifts/${gift.id}` },
    openGraph: { title, description },
  };
}

export default async function GiftPage({ params, searchParams }) {
  const { id } = await params;
  const gift = getGift(id);
  if (!gift) notFound();

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

  const related = [
    ...GIFTS.filter((g) => g.id !== gift.id && g.game === gift.game),
    ...GIFTS.filter((g) => g.id !== gift.id && g.game !== gift.game && g.category === gift.category),
  ].slice(0, 4);

  const game = getGame(gift.game);
  const base = siteUrl();
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: gift.name,
    description: gift.blurb,
    sku: gift.id,
    category: `${game.name} · ${getCategory(gift.category).name}`,
    url: `${base}/gifts/${gift.id}`,
    offers: {
      "@type": "Offer",
      price: gift.price.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${base}/gifts/${gift.id}`,
    },
  }).replace(/</g, "\\u003c");

  return (
    <>
      <SiteHeaderClient user={user} returnHome />
      <main className="gf-page">
        <nav className="gf-crumbs" aria-label="Breadcrumb">
          <Link href={giftsHref(preview.ctx)}>Gift Shop</Link>
          <span aria-hidden="true">/</span>
          <span>{gift.name}</span>
        </nav>

        <GiftCheckout
          key={gift.id}
          gift={gift}
          signedIn={signedIn}
          balanceMills={balance}
          initialReceiver={preview.receiver}
          initialContext={preview.ctx}
          problem={preview.problem}
        />

        {related.length > 0 && (
          <section className="gf-related" aria-label="More gifts">
            <h2 className="gf-h2">More from {game.name}</h2>
            <div className="gf-grid">
              {related.map((g) => (
                <GiftCard key={g.id} gift={g} ctx={preview.ctx} />
              ))}
            </div>
          </section>
        )}
      </main>
      <ScrollTopButton />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
    </>
  );
}
