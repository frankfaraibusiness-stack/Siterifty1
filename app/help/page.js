import Link from "next/link";
import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import HelpCenter from "@/components/info/HelpCenter";
import { Cards, JsonLd, Sec, faqLd } from "@/components/info/blocks";
import { HELP_GROUPS, HELP_TOTAL } from "@/lib/help";
import { SITE, infoPage } from "@/lib/site";

const page = infoPage("help");
export const metadata = infoMetadata(page);

const TOC = HELP_GROUPS.map((g) => ({ id: g.id, label: g.title }));

export default function Page() {
  const all = HELP_GROUPS.flatMap((g) => g.items);

  return (
    <InfoShell
      page={page}
      toc={TOC}
      lead={`Answers on accounts, posting, stories, communities, settings and plans. Search, or pick a topic. Still stuck? Message us.`}
      chips={[
        { icon: "help", label: `${HELP_TOTAL} answers` },
        { icon: "search", label: "Searchable" },
        { icon: "mail", label: "Human replies" },
      ]}
    >
      <JsonLd data={faqLd(all)} />

      <Sec id="quick" title="Quick help">
        <Cards
          min={230}
          items={[
            { icon: "key", tone: "cyan", title: "Can’t log in?", text: "Reset your password or check which email you signed up with. See Account and logging in below." },
            { icon: "flag", tone: "pink", title: "Report a problem", text: "[Report a post, person or community](/contact?topic=report). Paste the link so we can find it fast." },
            { icon: "gear", tone: "orange", title: "Privacy and safety", text: "Make your account private, block people and mute words in [Settings](/settings)." },
            { icon: "star", tone: "gold", title: "Plans and pricing", text: "See what each plan includes in the [plans section](/about#plans)." },
          ]}
        />
      </Sec>

      <HelpCenter groups={HELP_GROUPS} />

      <Sec id="more" title="Did not find it?">
        <p className="ip-p">
          {`Tell us what you were trying to do and we will help. `}
          <Link href="/contact" prefetch={false}>
            Contact the {SITE.name} team
          </Link>
          {`. Remember: we cannot help with the game itself. See the `}
          <Link href="/disclaimer" prefetch={false}>
            fan site disclaimer
          </Link>
          {`.`}
        </p>
      </Sec>
    </InfoShell>
  );
}
