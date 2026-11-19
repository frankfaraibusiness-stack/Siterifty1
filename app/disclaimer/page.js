import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { Bullets, Callout, Cards, DoDont, Faq, Facts, JsonLd, P, Sec, faqLd } from "@/components/info/blocks";
import { LEGAL, NOT_AFFILIATED, SITE, infoPage } from "@/lib/site";

const page = infoPage("disclaimer");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "statement", label: "The statement" },
  { id: "means", label: "What that means" },
  { id: "trademarks", label: "Trademarks" },
  { id: "content", label: "Fan-made content" },
  { id: "game", label: "Not for game support" },
  { id: "links", label: "Links and other sites" },
  { id: "faq", label: "Questions and answers" },
];

const FAQS = [
  { q: `Is ${SITE.name} an official Rockstar Games website?`, a: `No. ${NOT_AFFILIATED.long}` },
  { q: "Are you partnered with, sponsored by or approved by Rockstar or Take-Two?", a: "No. There is no partnership, sponsorship, licence or approval. We are an independent fan project." },
  { q: "Can you give me game news, release info or codes?", a: "We cannot confirm anything about the game. Members share news, rumours and theories, but they are fans, not Rockstar. For official information, use Rockstar Games’ own channels." },
  { q: "Can you help with a problem with the game?", a: "No. We have no access to the game, to Rockstar’s accounts or to its support systems. Please use Rockstar Games’ official support." },
  { q: "Do paid plans give me anything from Rockstar?", a: `No. Paid ${SITE.name} plans only change what you can do on this fan site, such as limits and badges. They give you nothing in the game and no connection to Rockstar or Take-Two.` },
  { q: "Who owns the Grand Theft Auto name and artwork?", a: NOT_AFFILIATED.trademark },
  { q: "I work for Rockstar or Take-Two and have a concern. What should I do?", a: "[Contact us](/contact?topic=copyright) and tell us who you are. We will look at it quickly and act on valid requests." },
];

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead="We are fans, not Rockstar Games. Here is exactly what that means for you."
      chips={[
        { icon: "flag", label: "Fan-made" },
        { icon: "scale", label: "Independent" },
        { icon: "heart", label: "Made by fans, for fans" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="statement" title="The statement">
        <Callout tone="warn" icon="alert" title={NOT_AFFILIATED.headline}>
          {NOT_AFFILIATED.long}
        </Callout>
        <Facts
          items={[
            { icon: "x", big: "Not built", label: "by Rockstar Games or Take-Two" },
            { icon: "x", big: "Not affiliated", label: "with either of them" },
            { icon: "x", big: "Not endorsed", label: "or sponsored by them" },
            { icon: "heart", big: "Fan-made", label: "to bring GTA 6 fans together" },
          ]}
        />
        <P>{`${SITE.name} is a fanbase page built to bring GTA 6 fans together in one place where they can hang out, share, and enjoy the wait and the game. Grand Theft Auto belongs to someone else, and we are just big fans.`}</P>
      </Sec>

      <Sec id="means" title="What that means">
        <DoDont
          yes={{
            title: `What ${SITE.name} is`,
            items: [
              "An independent, fan-made community website.",
              "A place for fans to post, vote on polls and theories, share stories and join communities.",
              "Run by fans, for fans, with its own rules, plans and team.",
            ],
          }}
          no={{
            title: `What ${SITE.name} is not`,
            items: [
              "Not made, owned, run or approved by Rockstar Games or Take-Two Interactive.",
              "Not a source of official news, release dates, codes or confirmed details.",
              "Not a way to contact Rockstar, or to get anything from them.",
              "Not an official fan club, partner, or licensed service of any kind.",
            ],
          }}
        />
        <Bullets
          items={[
            "Nobody who posts here speaks for Rockstar Games or Take-Two, unless they clearly say so and it is confirmed by Rockstar’s own channels. Treat any such claim with care.",
            "Badges on profiles show a member’s plan on this site. They are not a sign of any link to Rockstar.",
            "We have no access to unreleased content and do not ask for it. Please do not send us any.",
          ]}
        />
      </Sec>

      <Sec id="trademarks" title="Trademarks">
        <P>{NOT_AFFILIATED.trademark}</P>
        <P>{`We use these names and references only to say what this fan community is about. We do not claim any right in them, and we do not suggest the owners support us. If you are a rights owner with a concern, [contact us](/contact?topic=copyright) or read [Copyright and DMCA](/copyright).`}</P>
      </Sec>

      <Sec id="content" title="Fan-made content">
        <Cards
          min={250}
          items={[
            { icon: "users", tone: "pink", title: "Written by members", text: "Posts, comments, theories and stories are made by fans. They are their opinions and creations, not ours and not Rockstar’s." },
            { icon: "search", tone: "violet", title: "Leaks and rumours are unconfirmed", text: "Treat anything labelled a leak, rumour or theory as unconfirmed unless Rockstar has said it. We cannot promise it is true." },
            { icon: "eye", tone: "cyan", title: "Spoilers happen", text: "We ask members to label them, but we cannot catch everything. Use your spoiler settings to protect yourself." },
            { icon: "alert", tone: "gold", title: "Your own judgement", text: "Do not rely on information found here to make decisions about money, purchases or anything important." },
          ]}
        />
        <P>{`We do our best to keep the site accurate and safe, but we cannot guarantee everything members post. The [Terms](/terms) and [Community Guidelines](/guidelines) explain the rules, and you can [report a problem](/contact?topic=report).`}</P>
      </Sec>

      <Sec id="game" title="Not for game support">
        <P>{`We cannot help with the game itself: accounts, purchases, pre-orders, refunds, downloads, codes, bans or technical problems. We have no access to any of Rockstar’s systems. For those, use Rockstar Games’ own official support channels, and be careful with anyone offering to sell you game items or accounts.`}</P>
      </Sec>

      <Sec id="links" title="Links and other sites">
        <P>{`Posts and profiles may link to other websites, including YouTube, that we do not run or control. We are not responsible for them. This page was last updated on ${LEGAL.updated}.`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
