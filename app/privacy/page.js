import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { Bullets, Callout, Cards, DataTable, Faq, Facts, JsonLd, P, Sec, Steps, faqLd } from "@/components/info/blocks";
import { FREE_WHILE_TESTING } from "@/lib/plans";
import { SESSION_MAX_AGE_MS } from "@/lib/session";
import { CONTACT, LEGAL, NOT_AFFILIATED, OPERATOR, PROVIDERS, SITE, infoPage } from "@/lib/site";

const page = infoPage("privacy");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "summary", label: "The short version" },
  { id: "who", label: "Who is responsible" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "Why we use it" },
  { id: "see", label: "Who can see it" },
  { id: "share", label: "Who we share it with" },
  { id: "keep", label: "How long we keep it" },
  { id: "rights", label: "Your choices and rights" },
  { id: "kids", label: "Children" },
  { id: "security", label: "Security" },
  { id: "abroad", label: "Where data goes" },
  { id: "changes", label: "Changes and contact" },
  { id: "faq", label: "Questions and answers" },
];

const DAYS = Math.round(SESSION_MAX_AGE_MS / 86_400_000);

const FAQS = [
  { q: "Do you sell my personal data?", a: "No. We do not sell your personal data and we do not run advertising on the site." },
  { q: "Do you use analytics or advertising trackers?", a: `No. At the time of writing ${SITE.name} does not load third-party advertising or analytics trackers. Our hosting provider sees the normal technical data any web host sees. See the [Cookie Policy](/cookies) for the full list of cookies and storage we use.` },
  { q: "Do you store my password?", a: "No, not ourselves. Passwords are handled by our sign-in provider (Google Firebase Authentication). We never see or store your password in readable form." },
  { q: "Can other people see my email address?", a: "No. Your email is used to sign you in and to reply to you. It is not shown on your profile or on your posts." },
  { q: "How do I download my data?", a: "Open [Settings](/settings) and use the download option. You get a JSON file with your account details, profile, settings and the text of your posts. Photos and profile pictures are left out to keep the file small." },
  { q: "How do I delete my account and data?", a: `There is no delete button yet. Send a [privacy request](/contact?topic=privacy) from the email on your account and tell us your username. We aim to answer within ${LEGAL.responseDays} days.` },
  { q: "Who can see my posts?", a: "That depends on your settings. Posts are public by default. You can make your account private, or choose every time whether a post is public or private. See the Who can see it section above." },
  { q: "Is the site for children?", a: `No. You must be at least ${LEGAL.minAge} years old to have an account.` },
];

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead={`What ${SITE.name} collects, why, who can see it and the controls you have. Written to be read, not skimmed past.`}
      chips={[
        { icon: "lock", label: "No ads" },
        { icon: "eyeoff", label: "No selling data" },
        { icon: "download", label: "Download your data" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="summary" title="The short version">
        <Facts
          items={[
            { icon: "eyeoff", big: "Never sold", label: "We do not sell your personal data" },
            { icon: "lock", big: "No ads", label: "No advertising or tracking pixels" },
            { icon: "download", big: "Yours", label: "Download a copy of your data in Settings" },
            { icon: "gear", big: "Private", label: "Make your account private any time" },
          ]}
        />
        <Callout tone="ok" icon="shield" title="In plain words">
          We collect what we need to run a fan community: your account, what you post and the settings you choose. We use it to run the site and keep it safe. We share it only with the services that run the site for us, or when the law says we must.
        </Callout>
        <Callout tone="note" icon="info" title="This is a fan site">
          {NOT_AFFILIATED.short} Rockstar Games and Take-Two Interactive do not receive your data from us, and we do not receive yours from them.
        </Callout>
      </Sec>

      <Sec id="who" title="Who is responsible for your data">
        <P>{`${OPERATOR} runs ${SITE.name} and decides how your personal data is used (the “controller”, in privacy law words). To ask us anything about your data, use the [contact form](/contact?topic=privacy)${CONTACT.email ? ` or email ${CONTACT.email}` : ""}.`}</P>
      </Sec>

      <Sec id="collect" title="What we collect">
        <P>{`This table covers everything the site collects today.`}</P>
        <DataTable
          caption="Personal data we collect, why, and who can see it"
          head={["What", "Examples", "Why we need it", "Who can see it"]}
          rows={[
            ["Account", "Username, email address, password (kept by our sign-in provider), the plan you chose, the date you joined, the country you signed up from (worked out from your IP address, or \"unknown\")", "To create your account, log you in and apply your plan", "Your username is public. Your email is never shown to other members."],
            ["Profile", "Display name, bio, location, website, profile picture, banner, profile theme, a gender icon and a country flag (you choose who sees each)", "To show your profile", "Anyone who can see your profile. All optional except your username."],
            ["Posts and comments", "Text, photos, video files or YouTube links, polls, theories, tags, comments, likes, saves, votes and poll answers", "To run the feed, polls, theories and discussions", "As set by you: public, private, or members only of a community"],
            ["Stories", "Photos or short clips with an optional caption", "To show stories in the stories row for a limited time", "People who can see your profile or the home page"],
            ["Communities", "Communities you create or join, your role, and answers to join questions", "To run communities and approve new members", "Community staff see join answers; membership may show on the community"],
            ["Your settings", "Private account, who can comment, blocked usernames, muted words, feed choices, City Look colours", "To remember how you want the site to work", "Only you (and the site to apply them)"],
            ["Messages to us", "Your name, email, optional username and link, topic, message, and your username if you were logged in", "To answer you, handle reports, appeals, takedown notices and requests", "Only the people who run the site"],
            ["Technical data", "IP address, browser and device type, pages requested, time of the request", "To deliver the site, keep it secure and stop abuse", "Our hosting provider and the people who run the site"],
          ]}
        />
        <Callout tone="warn" icon="alert" title="What we do not collect">
          {FREE_WHILE_TESTING
            ? "We do not ask for payment details today because every plan is free while we test. If that changes, a payment provider will handle your card and we will update this page first. We do not collect your precise location, contacts or microphone audio."
            : "Payments are handled by a payment provider, and we do not store your full card number. We do not collect your precise location, contacts or microphone audio."}
        </Callout>
        <P>{`Voice search uses your browser’s own speech tool. We only receive the words it turns your speech into, never the audio.`}</P>
        <P>{`Your choice of “location” on a post is a label you pick from a list of places in the game’s world (like Vice City), not a real-world location.`}</P>
      </Sec>

      <Sec id="use" title="Why we use it">
        <Cards
          min={250}
          items={[
            { icon: "user", tone: "pink", title: "To run the site", text: "Create your account, log you in, show posts and profiles, count votes, run communities and apply your plan." },
            { icon: "flag", tone: "cyan", title: "To keep people safe", text: "Review reports, enforce the Guidelines, stop spam and abuse, and keep the Service secure." },
            { icon: "mail", tone: "lime", title: "To talk to you", text: "Answer your messages, send password reset emails and tell you about changes that affect you." },
            { icon: "scale", tone: "gold", title: "To follow the law", text: "Handle takedown notices and legal requests, and keep records we are required to keep." },
          ]}
        />
        <P>{`If you are in the UK or European Economic Area, the legal reasons we rely on are: **contract** (to give you the Service you signed up for), **legitimate interests** (to keep the site safe, fix problems and improve it, balanced against your rights), **consent** (where we ask, such as when your browser asks for microphone permission for voice search) and **legal obligation**.`}</P>
      </Sec>

      <Sec id="see" title="Who can see it">
        <Bullets
          items={[
            "**Public by default.** Your username, profile and posts can be seen by anyone, including people without an account and search engines, unless you change that.",
            "**You are in control.** In [Settings](/settings) you can make your account private, choose that posts are always public, always private or ask each time, hide like counts, limit who can comment, stay out of discovery, block people and mute words.",
            "**Communities.** Posts in a community are visible according to that community’s rules. Join answers are seen by its staff.",
            "**Once it is out, it can be copied.** Anyone who can see something can screenshot or save it. Think before you post.",
          ]}
        />
      </Sec>

      <Sec id="share" title="Who we share it with">
        <P>{`We share personal data only with companies that help us run the Service (our “processors”), and only so they can do that job:`}</P>
        <DataTable
          caption="Services we use that handle personal data"
          head={["Service", "What it does for us"]}
          rows={PROVIDERS.map((p) => [p.name, p.what])}
        />
        <Bullets
          items={[
            "**The law.** We may share information if we are legally required to, to protect someone’s safety, to enforce our Terms or to defend ourselves.",
            "**A new operator.** If the site is ever passed to someone else, your data would go with it under the same promises, and we would tell you.",
            "**Not Rockstar or Take-Two.** We do not give your data to Rockstar Games or Take-Two Interactive.",
          ]}
        />
      </Sec>

      <Sec id="keep" title="How long we keep it">
        <Bullets
          items={[
            `**Login.** Your login on one browser lasts up to ${DAYS} days, or until you log out.`,
            "**Account, profile and content.** Kept while your account is open, so the site can show it. When you delete a post, comment or story we remove it from the Service.",
            "**Stories.** Disappear from the stories row after their time is up.",
            "**Messages to us.** Kept as long as we need them to answer you and to keep a record of reports, appeals and takedown notices, then deleted when no longer needed.",
            "**After you ask us to delete your account.** We remove your account and personal content from the Service. Copies others saved or quoted, content we must keep by law, and routine backups may remain for a short time.",
          ]}
        />
      </Sec>

      <Sec id="rights" title="Your choices and rights">
        <P>{`Depending on where you live (for example under UK or EU GDPR, or US state laws such as California’s), you may have rights over your personal data.`}</P>
        <Cards
          min={250}
          items={[
            { icon: "eye", tone: "cyan", title: "Access", text: "See what we hold about you. Download your data yourself in Settings." },
            { icon: "gear", tone: "lime", title: "Correct", text: "Edit your profile and settings yourself. Ask us if something else is wrong." },
            { icon: "trash", tone: "pink", title: "Delete", text: "Ask us to delete your account and personal data." },
            { icon: "download", tone: "violet", title: "Take it with you", text: "Get your data in a file you can reuse (JSON)." },
            { icon: "lock", tone: "gold", title: "Object or restrict", text: "Ask us to stop or limit certain uses of your data." },
            { icon: "flag", tone: "orange", title: "Complain", text: "You can complain to your local data protection authority at any time." },
          ]}
        />
        <Steps
          items={[
            { title: "Do it yourself", text: "Edit your profile and use [Settings](/settings) to change privacy options, block people, mute words, or download your data." },
            { title: "Or ask us", text: `Send a [privacy request](/contact?topic=privacy) from the email on your account and tell us your username and what you want us to do. We may need to check it is really you.` },
            { title: "We reply", text: `We aim to answer within ${LEGAL.responseDays} days and will tell you if we need more time or cannot do something and why.` },
          ]}
        />
        <P>{`We do not use your personal data to make automated decisions that have legal or similarly significant effects on you.`}</P>
      </Sec>

      <Sec id="kids" title="Children">
        <P>{`${SITE.name} is not for children under ${LEGAL.minAge}. We do not knowingly collect personal data from them. If you think a child under ${LEGAL.minAge} has made an account, [tell us](/contact?topic=privacy) and we will remove it. Parents and guardians can also ask us to review or delete a child’s data.`}</P>
      </Sec>

      <Sec id="security" title="Security">
        <P>{`Your login cookie is HTTP-only, which means scripts on a page cannot read it. Sign-in, our database and storage run on Google’s Firebase and the site runs on Vercel, both of which use industry-standard security. We limit how many messages one visitor can send us per hour and store only a one-way scrambled version of the visitor’s address for that, not the address itself. No online service is perfectly secure, so please use a strong, unique password and log out on shared devices. If you find a security problem, please [tell us](/contact?topic=bug) before making it public.`}</P>
      </Sec>

      <Sec id="abroad" title="Where your data goes">
        <P>{`Our providers run data centres in several countries, including the United States, so your data may be processed outside the country where you live. When that happens we rely on the safeguards our providers offer, such as standard contractual clauses or approved data transfer frameworks, where the law requires them.`}</P>
      </Sec>

      <Sec id="changes" title="Changes and contact">
        <P>{`If we change what we collect or how we use it, we will update this page and its date (now ${LEGAL.updated}). Questions? Use the [contact form](/contact?topic=privacy)${CONTACT.email ? ` or email ${CONTACT.email}` : ""}. Also see the [Cookie Policy](/cookies) and [Terms](/terms).`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
