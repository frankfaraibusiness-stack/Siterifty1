import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { Bullets, Callout, Cards, DataTable, DoDont, Faq, Facts, JsonLd, P, Sec, faqLd } from "@/components/info/blocks";
import { usdToken } from "@/lib/currency";
import { FREE_WHILE_TESTING, PLANS } from "@/lib/plans";
import { LEGAL, NOT_AFFILIATED, OPERATOR, SITE, infoPage } from "@/lib/site";

const page = infoPage("terms");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "who", label: "Who we are" },
  { id: "agree", label: "Agreeing to these terms" },
  { id: "eligibility", label: "Who can use the site" },
  { id: "account", label: "Your account" },
  { id: "content", label: "Your content" },
  { id: "rules", label: "The rules" },
  { id: "plans", label: "Plans and payments" },
  { id: "ip", label: "Rockstar, Take-Two and other owners" },
  { id: "moderation", label: "Moderation and ending an account" },
  { id: "third", label: "Other people’s services" },
  { id: "warranty", label: "No promises about the service" },
  { id: "liability", label: "Our responsibility" },
  { id: "law", label: "Law and changes" },
  { id: "faq", label: "Questions and answers" },
];

const FAQS = [
  {
    q: `Is ${SITE.name} made by Rockstar Games?`,
    a: `No. ${NOT_AFFILIATED.long} Read the [fan site disclaimer](/disclaimer).`,
  },
  {
    q: "How old do I have to be?",
    a: `You must be at least ${LEGAL.minAge} years old. If the law where you live sets a higher age for using online services without a parent or guardian, you must meet that age too.`,
  },
  {
    q: "Do I own what I post?",
    a: "Yes, if it is yours to post. You keep ownership of your content. You give us a limited licence to host, show and share it on the site so the service can work. See the Your content section above.",
  },
  {
    q: "Can my account be removed?",
    a: "Yes, if you break these terms or the [Community Guidelines](/guidelines), or if we have to for legal reasons. You can also ask us to close your account at any time through the [contact form](/contact?topic=privacy).",
  },
  {
    q: "Do I have to pay?",
    a: FREE_WHILE_TESTING
      ? `No. ${PLANS[0].name} is free forever and, while we test, switching to any other plan is free too. Nothing is charged right now.`
      : `No. ${PLANS[0].name} is free forever. Paid plans are optional.`,
  },
  {
    q: "What if I think something on the site breaks my copyright?",
    a: "Use the steps on the [Copyright and DMCA](/copyright) page to send us a notice.",
  },
  { q: "Where do I send questions about these terms?", a: "Use the [contact form](/contact?topic=general)." },
];

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead={`The rules for using ${SITE.name}, the unofficial GTA 6 fan community. Plain English, no tricks.`}
      chips={[
        { icon: "users", label: `Ages ${LEGAL.minAge}+` },
        { icon: "scale", label: "Fan project" },
        { icon: "heart", label: "Free to join" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Facts
        items={[
          { icon: "users", big: `${LEGAL.minAge}+`, label: "Minimum age to join" },
          { icon: "star", big: "You", label: "keep ownership of your content" },
          { icon: "flag", big: "1 rule", label: "Keep it about GTA 6" },
          { icon: "heart", big: "Free", label: `${PLANS[0].name} is free forever` },
        ]}
      />

      <Sec id="who" num="1" title="Who we are">
        <Callout tone="key" icon="info" title={`${NOT_AFFILIATED.headline}, not Rockstar`}>
          {NOT_AFFILIATED.long}
        </Callout>
        <P>{`${SITE.name} (“we”, “us”) is run by ${OPERATOR}. We built it as a fan project so GTA 6 fans can find each other, hang out and talk about the game in one place. These Terms and Conditions (the “Terms”) are the agreement between you and us for using ${SITE.domain}, its pages, features and plans (the “Service”).`}</P>
      </Sec>

      <Sec id="agree" num="2" title="Agreeing to these terms">
        <P>{`By creating an account, or by using the Service, you agree to these Terms, our [Privacy Policy](/privacy), our [Cookie Policy](/cookies) and our [Community Guidelines](/guidelines). If you do not agree, please do not use the Service. You can still read public pages without an account.`}</P>
        <P>{`We may update these Terms as the site grows. When we make a change we update the date at the top of this page (currently ${LEGAL.updated}). If you keep using the Service after a change, you accept the new Terms. If you do not agree to a change, you can stop using the Service and ask us to close your account.`}</P>
      </Sec>

      <Sec id="eligibility" num="3" title="Who can use the site">
        <Bullets
          items={[
            `You must be at least **${LEGAL.minAge} years old**. If the law where you live sets a higher age to use online services on your own, you must be at least that age, or have a parent or guardian agree to these Terms for you.`,
            "You must give accurate details when you sign up, and keep them up to date.",
            "You must not be banned from the Service, and you must not use it if the law where you live forbids it.",
            "If you use the Service for a group, channel or business, you confirm you are allowed to accept these Terms for it.",
          ]}
        />
      </Sec>

      <Sec id="account" num="4" title="Your account">
        <P>{`Your account is yours alone. Keep your password private and do not share your login. You are responsible for what happens under your account, so tell us right away through the [contact form](/contact?topic=account) if you think someone else has got in.`}</P>
        <Bullets
          items={[
            "One person, one account. Please do not create accounts to dodge a ban or to pretend to be several people.",
            "Do not pretend to be another person, a Rockstar Games or Take-Two employee, or an official account.",
            "Usernames must not be offensive, misleading or use someone else’s name or brand to deceive people.",
            "We may change or reclaim a username that breaks these rules.",
          ]}
        />
      </Sec>

      <Sec id="content" num="5" title="Your content">
        <P>{`“Content” means anything you post or send on ${SITE.name}: posts, photos, videos, polls, theories, comments, stories, community pages, profile details and messages to us.`}</P>
        <Cards
          min={260}
          items={[
            { icon: "heart", tone: "pink", title: "You keep ownership", text: "Your content stays yours. We do not claim to own your photos, videos or words." },
            { icon: "globe", tone: "cyan", title: "You give us a licence to run the site", text: "So the site can work, you give us a worldwide, non-exclusive, royalty-free licence to host, store, resize, brand with our logo, display and distribute your content on and through the Service. It lasts as long as your content is on the Service." },
            { icon: "check", tone: "lime", title: "You promise it is yours to share", text: "You confirm you made the content or have permission to post it, and that it does not break the law or anyone else’s rights." },
            { icon: "image", tone: "gold", title: "Photos carry our logo", text: `Photos added to posts show the ${SITE.name} logo, so downloaded or screenshotted copies show where they came from. This does not change who owns your photo.` },
          ]}
        />
        <P>{`When your content is public, other people can see it, and it may appear in search results and link previews. Private content is limited to the audience you choose, but anyone who can see it could still copy it, so only share what you are comfortable sharing. When you delete content we remove it from the Service, but copies that other people already saved, shared or quoted, and routine backups, may last a little longer.`}</P>
      </Sec>

      <Sec id="rules" num="6" title="The rules">
        <P>{`The full rules are in the [Community Guidelines](/guidelines). The short version:`}</P>
        <DoDont
          yes={{
            title: "Please do",
            items: [
              "Keep things about GTA 6 and its world.",
              "Be respectful, even when you disagree.",
              "Label spoilers, leaks and theories honestly.",
              "Credit artists and sources.",
            ],
          }}
          no={{
            title: "Please do not",
            items: [
              "Harass, threaten, hate on or share private information about anyone.",
              "Post illegal content, or any sexual content involving minors (we report this).",
              "Post malware, spam, scams or fake giveaways.",
              "Share stolen game files, cracked copies or other people’s private information.",
              "Try to break, overload or get around the security of the Service.",
              "Pretend to be Rockstar Games, Take-Two or our team.",
            ],
          }}
        />
      </Sec>

      <Sec id="plans" num="7" title="Plans and payments">
        <P>{`${SITE.name} has ${PLANS.length} plans. The names, prices and what each one includes are kept on the [plans section](/about#plans) and on the [Upgrade](/upgrade) page, which are always the current ones.`}</P>
        <DataTable
          caption="Plans and monthly prices"
          head={["Plan", "Price"]}
          rows={PLANS.map((p) => [p.name, p.price === 0 ? "Free" : `${usdToken(p.price)} per month`])}
        />
        {FREE_WHILE_TESTING ? (
          <Callout tone="ok" title="Free while we test">
            Right now every plan is free to switch to and we do not ask for payment details. Before we start charging for any plan we will announce it clearly on the site first.
          </Callout>
        ) : (
          <Callout tone="note" title="Billing">
            Paid plans are billed monthly in advance until you change or cancel. You can switch plans at any time from the Upgrade page.
          </Callout>
        )}
        <Bullets
          items={[
            "Plans change how much you can do on the site (for example photos per post, video length, stories and scheduling) and add profile badges and perks. They do not change who owns your content.",
            `A badge shows your plan. It is not a statement that we, or anyone else, have checked what you say, and it does not connect you with Rockstar Games.`,
            "Features marked “Soon” are planned and are not promised for a specific date.",
            "Moving to a lower plan does not remove what you already posted. It limits what you can add from then on.",
            "We may change limits, prices or features as the site grows. We will update the pages above when we do.",
          ]}
        />
      </Sec>

      <Sec id="ip" num="8" title="Rockstar, Take-Two and other owners">
        <Callout tone="warn" icon="alert" title="Trademarks">
          {NOT_AFFILIATED.trademark}
        </Callout>
        <P>{`${SITE.name} does not own the Grand Theft Auto games or anything in them. Fan art, edits, screenshots and discussion are welcome, but you may not post content that gives other people the game itself or unreleased material you have no right to share (for example stolen files, source code or assets). If Rockstar Games, Take-Two or any other rights owner asks us to remove something, we will act on it. See [Copyright and DMCA](/copyright) to report something.`}</P>
        <P>{`The ${SITE.name} name, logo, design and the site’s own software and text belong to us or our licensors. You may not copy or reuse them in a way that suggests we made or approve of your work.`}</P>
      </Sec>

      <Sec id="moderation" num="9" title="Moderation and ending an account">
        <P>{`We may remove content, hide it from search, limit what an account can do, or suspend or close an account if we reasonably believe the Terms or the Guidelines have been broken, if the law requires it, or if it is needed to keep people safe or protect the Service. Where we can, we will tell you why. You can [appeal a decision](/contact?topic=appeal).`}</P>
        <P>{`You can stop using the Service at any time. To close your account and ask us to remove your data, send a [privacy request](/contact?topic=privacy). We aim to answer within ${LEGAL.responseDays} days. Some parts of these Terms keep applying after your account ends, such as the licence for copies already shared, our right to defend ourselves, and anything that by its nature should continue.`}</P>
      </Sec>

      <Sec id="third" num="10" title="Other people’s services">
        <P>{`${SITE.name} uses services from other companies to work, such as Google Firebase for sign-in, our database and video storage, and YouTube for embedded videos. Posts and profiles can also link to other websites. We do not control those sites or services and are not responsible for them, and their own terms and privacy policies apply when you use them. The [Privacy Policy](/privacy) lists the services we use.`}</P>
      </Sec>

      <Sec id="warranty" num="11" title="No promises about the service">
        <P>{`${SITE.name} is a free fan project that is still growing. We work to keep it running, but we provide the Service “as is” and “as available”. We do not promise it will always be online, error-free or secure from every threat, or that content on it (including leaks, rumours, theories and news posted by other fans) is true, accurate or complete. Do not rely on anything posted here as official information about GTA 6. For that, go to Rockstar Games’ own channels.`}</P>
      </Sec>

      <Sec id="liability" num="12" title="Our responsibility">
        <P>{`Nothing in these Terms limits any right or responsibility that cannot be limited by law, including liability for death or personal injury caused by negligence, or for fraud.`}</P>
        <P>{`Subject to that, and to the fullest extent the law allows, we are not responsible for indirect or consequential losses, lost profits, lost data or lost opportunities, for what other users post, or for problems with other people’s services. If we are found responsible to you for something, our total responsibility is limited to the amount you paid us for the Service in the 12 months before the problem. Some places do not allow some of these limits, so they apply to you only as far as your local law lets them.`}</P>
        <P>{`You agree to use the Service lawfully and to be responsible for your own content. If your content or your breach of these Terms leads to a claim against us, you agree, where the law allows, to cover our reasonable costs that result from your own wrongdoing.`}</P>
      </Sec>

      <Sec id="law" num="13" title="Law and changes">
        {LEGAL.governingLaw ? (
          <P>{`These Terms are governed by ${LEGAL.governingLaw}, without affecting any consumer rights you have under the law where you live.`}</P>
        ) : (
          <P>{`These Terms are governed by the law that applies to you as a consumer where you live, and nothing here takes away rights you have under that law.`}</P>
        )}
        <P>{`If any part of these Terms is found to be unenforceable, the rest stays in force. If we do not enforce a rule straight away, that does not mean we have given it up. You may not transfer your account or your rights under these Terms to anyone else; we may transfer ours if the site is passed to a new operator, and we will tell you. These Terms, together with the pages they link to, are the whole agreement between you and us about the Service.`}</P>
        <P>{`Questions about these Terms? Use the [contact form](/contact?topic=general).`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
