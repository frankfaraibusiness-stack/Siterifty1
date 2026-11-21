import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { INFO_PAGES, LEGAL, NOT_AFFILIATED, SITE, siteUrl } from "@/lib/site";
import { shareMeta } from "@/lib/seo";
import Banner from "./Banner";
import InfoIcon from "./icons";
import Toc from "./Toc";
import { JsonLd, PageLinks } from "./blocks";

// Metadata for an info page, built from lib/site.js so every page gets the
// same title format, canonical link and social preview.
export function infoMetadata(page, overrides = {}) {
  const title = `${page.title} · ${SITE.name}`;
  return { ...shareMeta({ title, description: page.description, path: page.href }), ...overrides };
}

// The frame every info page shares: header, banner hero, "not affiliated"
// strip, a left rail (on this page + all info pages) and the content column.
// Left-aligned and full width on desktop, stacked on phones.
export default async function InfoShell({
  page,
  title,
  lead,
  chips = [],
  scene,
  image,
  toc = [],
  updated = false,
  children,
}) {
  const user = await getCurrentUser();
  const others = INFO_PAGES.filter((p) => p.key !== page.key);
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl()}/` },
      { "@type": "ListItem", position: 2, name: page.title, item: `${siteUrl()}${page.href}` },
    ],
  };

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="ip" style={{ "--pa": page.a, "--pb": page.b }}>
        <JsonLd data={crumbs} />

        <nav className="ip-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <InfoIcon name="chevron" />
          <span aria-current="page">{page.title}</span>
        </nav>

        <header className="ip-hero">
          <Banner scene={scene || page.key} a={page.a} b={page.b} image={image} />
          <div className="ip-hero-copy">
            <h1 className="ip-title">{title || page.title}</h1>
            <p className="ip-sub">{lead || page.blurb}</p>
            {(updated || chips.length > 0) && (
              <ul className="ip-chips">
                {updated && (
                  <li>
                    <InfoIcon name="clock" />
                    <span>
                      Updated <time dateTime={LEGAL.updatedISO}>{LEGAL.updated}</time>
                    </span>
                  </li>
                )}
                {chips.map((c) => (
                  <li key={c.label}>
                    <InfoIcon name={c.icon} />
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <div className="ip-notice" role="note">
          <span className="ip-notice-ic">
            <InfoIcon name="info" />
          </span>
          <p>
            <b>{NOT_AFFILIATED.headline}.</b> {NOT_AFFILIATED.short}
          </p>
          {page.key !== "disclaimer" && (
            <Link href="/disclaimer" prefetch={false} className="ip-notice-link">
              Read the disclaimer
            </Link>
          )}
        </div>

        <div className="ip-body">
          <aside className="ip-rail">
            <Toc items={toc} />
            <nav className="ip-pages" aria-label="All info pages">
              <span className="ip-toc-h">More from {SITE.name}</span>
              <ul>
                {INFO_PAGES.map((p) => (
                  <li key={p.key}>
                    <Link
                      href={p.href}
                      prefetch={false}
                      aria-current={p.key === page.key ? "page" : undefined}
                      style={{ "--pa": p.a, "--pb": p.b }}
                    >
                      <InfoIcon name={p.icon} />
                      <span>{p.menuTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="ip-main">
            {children}

            <section className="ip-sec ip-more" aria-labelledby="ip-more-h">
              <h2 id="ip-more-h" className="ip-h2">
                <span>Keep exploring</span>
              </h2>
              <PageLinks pages={others} />
            </section>
          </div>
        </div>

        <footer className="ip-foot">
          <div className="ip-foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE.logo} alt="" width="120" height="67" loading="lazy" decoding="async" />
            <div>
              <b>{SITE.domain}</b>
              <span>{SITE.tagline}</span>
            </div>
          </div>
          <p className="ip-foot-legal">{NOT_AFFILIATED.trademark}</p>
          <p className="ip-foot-copy">
            © {new Date().getFullYear()} {SITE.name}. A fan-made community, not affiliated with Rockstar Games or
            Take-Two Interactive.
          </p>
        </footer>
      </main>
      <ScrollTopButton />
    </>
  );
}
