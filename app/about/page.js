import Link from "next/link";
import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import PlansShowcase from "@/components/info/PlansShowcase";
import { Callout, Cards, DataTable, Faq, Facts, JsonLd, P, Sec, Steps, faqLd } from "@/components/info/blocks";
import InfoIcon, { topicIcon } from "@/components/info/icons";
import { CATEGORIES } from "@/lib/community-schema";
import { usdToken } from "@/lib/currency";
import { FAQ as PLAN_FAQ, FREE_WHILE_TESTING, LIMIT_GROUPS, PLANS, PRICING_POINTS } from "@/lib/plans";
import { LEGAL, NOT_AFFILIATED, SITE, infoPage, siteUrl } from "@/lib/site";

const page = infoPage("about");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "what", label: "What it is" },
  { id: "do", label: "What you can do" },
  { id: "how", label: "How it works" },
  { id: "topics", label: "What we talk about" },
  { id: "plans", label: "Plans and pricing" },
  { id: "compare", label: "Compare every limit" },
  { id: "safe", label: "Safety and privacy" },
  { id: "faq", label: "About the site" },
  { id: "plan-faq", label: "Plans questions" },
];

const FAQS = [
  { q: `What is ${SITE.name}?`, a: `${SITE.summary} It is free to join.` },
  { q: `Is ${SITE.name} made by Rockstar Games?`, a: `No. ${NOT_AFFILIATED.long} Read the [disclaimer](/disclaimer).` },
  { q: "Who can join?", a: `Anyone who is ${LEGAL.minAge} or older and loves GTA 6. Everything on the site must be about GTA 6.` },
  { q: "Is it free?", a: `${PLANS[0].name} is free forever. ${FREE_WHILE_TESTING ? "While we test, every other plan is free to switch to as well." : "Paid plans are optional."} See the plans on this page.` },
  { q: "Can I get official GTA 6 news here?", a: "Fans share news, rumours and theories here, but nothing on the site is official. For confirmed information, go to Rockstar Games’ own channels." },
  { q: "Where do I get help?", a: "The [Help Center](/help) has answers on accounts, posting, communities and plans, and you can always [contact us](/contact)." },
];

const PLAN_NAMES = PLANS.map((p) => p.short);

function cellText(v, soon) {
  const base = v === true ? "Yes" : v === false ? "No" : String(v);
  return soon ? `${base} (soon)` : base;
}

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: siteUrl(),
  logo: `${siteUrl()}${SITE.logo}`,
  description: SITE.summary,
};

export default function Page() {
  return (
    <InfoShell
      page={page}
      image={SITE.banner}
      toc={TOC}
      lead={`${SITE.summary} Built by fans, for fans.`}
      chips={[
        { icon: "users", label: "Fan-made" },
        { icon: "heart", label: "Free to join" },
        { icon: "flag", label: "100% GTA 6" },
      ]}
    >
      <JsonLd data={[ORG_LD, faqLd([...FAQS, ...PLAN_FAQ])]} />

      <Sec id="what" title="What it is">
        <div className="ip-split">
          <div>
            <P>{`${SITE.name} is a fanbase page built to bring GTA 6 fans together in one place where they can hang out and enjoy. Post, vote, theorise, share stories and join communities for every corner of the world of Leonida. ${SITE.tagline}`}</P>
            <P>{`It is built by fans, not by Rockstar Games. ${NOT_AFFILIATED.short} Read the [disclaimer](/disclaimer) to see what that means.`}</P>
            <div className="ip-cta-row">
              <Link href="/" className="ip-btn" prefetch={false}>
                Go to the feed
              </Link>
              <Link href="/communities" className="ip-btn ghost" prefetch={false}>
                Browse communities
              </Link>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE.banner} alt={`${SITE.domain} banner`} width="830" height="369" loading="lazy" decoding="async" />
        </div>
        <Facts
          items={[
            { icon: "flag", big: "100%", label: "about GTA 6" },
            { icon: "users", big: String(CATEGORIES.length), label: "community topics to join or create" },
            { icon: "image", big: "4", label: "ways to post: photos, clips, polls, theories" },
            { icon: "heart", big: "Free", label: `${PLANS[0].name} is free forever` },
          ]}
        />
      </Sec>

      <Sec id="do" title="What you can do">
        <Cards
          min={250}
          items={[
            { icon: "image", tone: "pink", title: "Post photos and clips", text: "Share screenshots, fan art and map finds, upload a video or link a YouTube clip." },
            { icon: "chart", tone: "lime", title: "Run polls", text: "Ask the fanbase anything, with real votes, live results and a timer." },
            { icon: "eye", tone: "violet", title: "Share theories", text: "Lay out your evidence and confidence, then let the crew call it facts or cap." },
            { icon: "camera", tone: "cyan", title: "Add to your story", text: "Quick photos and short clips that show up at the top of the home page and expire." },
            { icon: "users", tone: "orange", title: "Join or start a community", text: "Find your corner of GTA 6 or build your own with rules, flairs and join questions." },
            { icon: "palette", tone: "gold", title: "Make it yours", text: "Pick profile themes, set site colours in City Look, and control privacy in Settings." },
          ]}
        />
      </Sec>

      <Sec id="how" title="How it works">
        <Steps
          items={[
            { title: "Look around for free", text: "You can read the public feed and browse communities without an account." },
            { title: "Join in a minute", text: `Pick a username, add your email and a password, or continue with Google. You must be ${LEGAL.minAge} or older.` },
            { title: "Set up your profile", text: "Add a picture, banner and bio, and choose your privacy settings." },
            { title: "Post, vote and join", text: "Share something, answer polls, comment, save posts and join communities." },
            { title: "Rank up if you want", text: "Move to a bigger plan for higher limits, badges and perks. It is optional." },
          ]}
        />
      </Sec>

      <Sec id="topics" title="What we talk about">
        <P>{`Communities cover every corner of GTA 6. These are the topics you can join or build one around:`}</P>
        <ul className="ip-chips" style={{ marginTop: 0 }}>
          {CATEGORIES.map((c) => (
            <li key={c.id} style={{ borderColor: `${c.a}66`, background: `${c.a}1f` }} title={c.blurb}>
              <InfoIcon name={topicIcon(c.icon)} />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </Sec>

      <Sec id="plans" title="Plans and pricing">
        <P>{`${PLANS.length} plans, from free to everything unlocked. Each plan builds on the one before it. ${FREE_WHILE_TESTING ? "While we test, switching to any plan costs nothing." : ""} Log in and open the [Upgrade](/upgrade) page to choose one.`}</P>
        <PlansShowcase />
        <Cards
          min={240}
          items={PRICING_POINTS.map((p, i) => ({ icon: ["tag", "star", "heart", "clock"][i % 4], tone: ["pink", "cyan", "lime", "gold"][i % 4], title: p.title, text: p.body }))}
        />
      </Sec>

      <Sec id="compare" title="Compare every limit">
        {LIMIT_GROUPS.map((g) => (
          <div key={g.title}>
            <h3>{g.title}</h3>
            <DataTable
              caption={`${g.title} limits by plan`}
              head={["Feature", ...PLAN_NAMES]}
              rows={g.rows.map(([label, cells, opts]) => [label, ...cells.map((c) => cellText(c, opts?.soon && c === true))])}
            />
          </div>
        ))}
        <P>{`Prices: ${PLANS.map((p) => `${p.short} ${p.price === 0 ? "free" : `${usdToken(p.price)} a month`}`).join(", ")}. Features marked “soon” are planned and are not live yet.`}</P>
      </Sec>

      <Sec id="safe" title="Safety and privacy">
        <Cards
          min={240}
          items={[
            { icon: "flag", tone: "lime", title: "Community Guidelines", text: "Keep it GTA 6, be respectful and label spoilers. Read the [Guidelines](/guidelines)." },
            { icon: "lock", tone: "cyan", title: "Your data, your control", text: "No ads and no selling your data. Read the [Privacy Policy](/privacy) and the [Cookie Policy](/cookies)." },
            { icon: "doc", tone: "pink", title: "The rules of the site", text: "Plain-English [Terms](/terms) say what you can expect from us and we expect from you." },
            { icon: "copyright", tone: "violet", title: "Respect for creators", text: "Credit artists and report copying through [Copyright and DMCA](/copyright)." },
          ]}
        />
      </Sec>

      <Faq items={FAQS} title="About the site" id="faq" />
      <Faq items={PLAN_FAQ} title="Plans questions" id="plan-faq" />
    </InfoShell>
  );
}
