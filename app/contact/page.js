import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import ContactForm from "@/components/info/ContactForm";
import { Callout, Cards, Facts, Faq, JsonLd, P, Sec, faqLd } from "@/components/info/blocks";
import { getCurrentUser } from "@/lib/current-user";
import { CONTACT, CONTACT_TOPICS, LEGAL, NOT_AFFILIATED, SITE, infoPage, isTopicId } from "@/lib/site";

const page = infoPage("contact");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "ways", label: "What can we help with?" },
  { id: "form", label: "Send a message" },
  { id: "faq", label: "Before you write" },
];

const FAQS = [
  { q: "How long will you take to reply?", a: `We read every message and reply as soon as we can. Privacy requests and copyright notices get an answer within ${LEGAL.responseDays} days. Check your spam folder in case our reply lands there.` },
  { q: "Can you help with a problem in the game?", a: `No. ${NOT_AFFILIATED.short} For game support, use Rockstar Games’ official support channels.` },
  { q: "How do I report a post, person or community?", a: "Choose “Report a post, person or community” in the form and paste the link to it. That is the quickest way for us to find it." },
  { q: "How do I send a copyright (DMCA) notice?", a: "Choose “Copyright or DMCA notice” in the form, and follow the checklist on the [Copyright and DMCA](/copyright) page so your notice is complete." },
  { q: "How do I delete my account or get a copy of my data?", a: "Choose “Privacy request” in the form and send it from the email on your account. You can also download a copy of your data yourself from [Settings](/settings)." },
  { q: "What do you do with my details?", a: "We use them only to answer you. We save your message so the team can read it. See the [Privacy Policy](/privacy) for the details." },
  { q: "Is there a phone number?", a: "No. Please use the form so your message reaches the right person with all the details." },
];

const TONES = ["cyan", "cyan", "pink", "violet", "gold", "lime", "orange", "pink"];
const ICONS = { general: "chat", account: "user", report: "flag", appeal: "scale", copyright: "copyright", privacy: "lock", bug: "bolt", business: "megaphone" };

export default async function Page({ searchParams }) {
  const sp = (await searchParams) || {};
  const asked = Array.isArray(sp.topic) ? sp.topic[0] : sp.topic;
  const initialTopic = isTopicId(asked) ? asked : CONTACT_TOPICS[0].id;
  const user = await getCurrentUser();

  return (
    <InfoShell
      page={page}
      toc={TOC}
      lead="Questions, reports, takedown notices and privacy requests all start here. A real person reads every message."
      chips={[
        { icon: "mail", label: "One simple form" },
        { icon: "clock", label: "We read every message" },
        { icon: "flag", label: "Reports welcome" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="ways" title="What can we help with?">
        <Cards
          min={230}
          items={CONTACT_TOPICS.map((t, i) => ({ icon: ICONS[t.id] || "mail", tone: TONES[i % TONES.length], title: t.label, text: t.hint }))}
        />
        <Facts
          items={[
            { icon: "mail", big: "1 form", label: "for every kind of message" },
            { icon: "clock", big: `${LEGAL.responseDays} days`, label: "longest we aim to take on privacy requests and notices" },
            { icon: "shield", big: "Private", label: "only the team reads what you send" },
          ]}
        />
        <Callout tone="warn" icon="alert" title={`${NOT_AFFILIATED.headline}`}>
          {`We are not Rockstar Games and cannot help with the game, its accounts or purchases. ${NOT_AFFILIATED.short}`}
        </Callout>
      </Sec>

      <Sec id="form" title="Send a message">
        {CONTACT.email && <P>{`You can also email us at [${CONTACT.email}](mailto:${CONTACT.email}). The form below gets to us with everything we need, so it is usually quicker.`}</P>}
        <ContactForm
          topics={CONTACT_TOPICS}
          initialTopic={initialTopic}
          defaults={{ email: user?.email || "", username: user?.username || "" }}
        />
      </Sec>

      <Faq items={FAQS} title="Before you write" />
    </InfoShell>
  );
}
