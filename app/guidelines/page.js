import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { topicIcon } from "@/components/info/icons";
import { Bullets, Callout, Cards, DoDont, Faq, Facts, JsonLd, P, Sec, Steps, faqLd } from "@/components/info/blocks";
import { CATEGORIES, FIXED_RULE, FLAIRS, RULE_PRESETS } from "@/lib/community-schema";
import { LEGAL, NOT_AFFILIATED, SITE, infoPage } from "@/lib/site";

const page = infoPage("guidelines");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "core", label: "The one big rule" },
  { id: "respect", label: "Be good to each other" },
  { id: "spoilers", label: "Spoilers, leaks and theories" },
  { id: "creative", label: "Fan art, edits and credit" },
  { id: "safe", label: "Staying safe" },
  { id: "spam", label: "No spam, scams or fakes" },
  { id: "communities", label: "Communities" },
  { id: "report", label: "Report a problem" },
  { id: "enforce", label: "What happens next" },
  { id: "faq", label: "Questions and answers" },
];

const TONES = ["pink", "cyan", "lime", "gold", "violet", "orange"];

const FAQS = [
  { q: "Can I post about other games or general chat?", a: `${FIXED_RULE.body} If it is not about GTA 6, it does not belong here. Other games can be mentioned when they are being compared with GTA 6.` },
  { q: "Are leaks allowed?", a: "Discussing credible leaks and rumours is fine when they are clearly labelled as leaks, covered as spoilers and honest about where they came from. Posting stolen files, source code or assets, or made-up leaks presented as real, is not allowed." },
  { q: "How do I hide spoilers from my own feed?", a: "Open [Settings](/settings) and choose how spoilers show in your feed: covered until you tap, shown, or hidden. You can also mute words so posts containing them never appear." },
  { q: "Can I share my own fan art?", a: "Yes, please! Fan art, edits, wallpapers and cosplay about GTA 6 are welcome. Post work you made yourself, or credit the artist and link to their original. Keep it suitable for a wide audience." },
  { q: "Someone is bothering me. What can I do right now?", a: "Block them and mute words from [Settings](/settings), and limit who can comment on your posts. Then [report them](/contact?topic=report) with a link to what happened." },
  { q: "My community has its own rules. Which rules win?", a: "Community rules can be stricter than these Guidelines, never looser. Site rules and the [Terms](/terms) always apply in every community." },
  { q: "I think a moderator made the wrong call.", a: "[Send an appeal](/contact?topic=appeal) with your username and what was removed or limited. A person will look at it again." },
  { q: "Does this site speak for Rockstar Games?", a: NOT_AFFILIATED.short },
];

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead="One rule above all: keep it GTA 6. Then be a good neighbour in Leonida. This is how we keep the fanbase fun, safe and on topic."
      chips={[
        { icon: "flag", label: "Keep it GTA 6" },
        { icon: "heart", label: "Be respectful" },
        { icon: "eye", label: "Label spoilers" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="core" title="The one big rule">
        <Callout tone="key" icon="flag" title={FIXED_RULE.title}>
          {FIXED_RULE.body}
        </Callout>
        <P>{`${SITE.name} exists for one thing: Grand Theft Auto VI and its world. These are the kinds of things people talk about here, and the same topics are the ones communities are built around:`}</P>
        <Cards
          min={220}
          items={CATEGORIES.map((c, i) => ({ icon: topicIcon(c.icon), tone: TONES[i % TONES.length], title: c.label, text: c.blurb }))}
        />
      </Sec>

      <Sec id="respect" title="Be good to each other">
        <P>{`Disagree with the take, not the person. Everyone here is a fan, and everybody was new once.`}</P>
        <DoDont
          yes={{
            title: "Welcome here",
            items: [
              "Healthy debate, hot takes and friendly banter.",
              "Constructive criticism of the game, the trailers or a theory.",
              "Helping a new member find their way.",
              "Reporting problems instead of fighting about them.",
            ],
          }}
          no={{
            title: "Not welcome here",
            items: [
              "Harassment, bullying, brigading or threats.",
              "Hate speech or slurs, or attacking people for who they are.",
              "Sharing someone’s private information (doxxing) or personal photos without their consent.",
              "Encouraging self-harm or violence against anyone.",
              "Posting the same thing again and again to annoy people.",
            ],
          }}
        />
      </Sec>

      <Sec id="spoilers" title="Spoilers, leaks and theories">
        <P>{`Plenty of people want to know everything. Plenty want to be surprised. We keep both happy by labelling things honestly.`}</P>
        <Cards
          min={250}
          items={[
            { icon: "eyeoff", tone: "pink", title: "Cover spoilers and leaks", text: "Mark story details and leaks as spoilers so people can choose to look. In communities, use the Leak flair." },
            { icon: "alert", tone: "gold", title: "No stolen files", text: "Do not post stolen game files, source code, assets or anything else you have no right to share. We remove it." },
            { icon: "flag", tone: "orange", title: "No fake leaks", text: "Made-up leaks presented as real get removed. If it is a guess, call it a theory." },
            { icon: "search", tone: "violet", title: "Back up your theory", text: "Theories get a confidence rating and the community can vote whether they are facts or cap. Share your evidence." },
          ]}
        />
        <P>{`These are the post flairs communities use: ${FLAIRS.map((f) => `**${f.label}**`).join(", ")}. Pick the one that matches your post.`}</P>
        <Callout tone="note" icon="info" title="Not official information">
          {`Leaks, rumours, theories and news posted here are by fans and are not confirmed by Rockstar Games. Treat them as unconfirmed unless Rockstar has announced them.`}
        </Callout>
      </Sec>

      <Sec id="creative" title="Fan art, edits and credit">
        <Bullets
          items={[
            "Post your own work, or credit the artist and link back to the original.",
            "Do not claim someone else’s art, edit or screenshot as yours.",
            "Do not remove other people’s watermarks or signatures.",
            "Screenshots and clips from the game’s official trailers are fine to discuss. Do not post material you have no right to share.",
            `Photos in posts get the ${SITE.name} logo on them. See [Copyright and DMCA](/copyright) if you think someone has used your work without permission.`,
          ]}
        />
      </Sec>

      <Sec id="safe" title="Staying safe">
        <Bullets
          items={[
            "**Keep it suitable for a wide audience.** No sexual content and no graphic gore. We remove it. Fan art is included.",
            `**Never anything sexual involving minors.** We remove it immediately, close the account and report it to the authorities. Everyone on the site must be ${LEGAL.minAge}+.`,
            "**No illegal content or activity**, including selling illegal goods or sharing cracked copies of games.",
            "**No threats or glorifying real-world violence.** GTA is fiction; people are real.",
            "**Do not share your own private details** like your address, phone number or passwords in public posts.",
            "**If someone is in danger**, contact your local emergency services. We cannot respond to emergencies.",
          ]}
        />
      </Sec>

      <Sec id="spam" title="No spam, scams or fakes">
        <Bullets
          items={[
            "No mass posting, repeated links or copy-and-paste promotion.",
            "Share your own channel or project sparingly and always be open that it is yours.",
            "No scams, fake giveaways, phishing links or malware. These lead to an immediate ban.",
            "No fake or duplicate accounts used to cheat polls, votes or likes, or to dodge a ban.",
            `**No pretending** to be Rockstar Games, Take-Two or our team. ${NOT_AFFILIATED.short}`,
          ]}
        />
      </Sec>

      <Sec id="communities" title="Communities">
        <P>{`Every community can set its own extra rules, but never looser than these. Community owners and moderators can remove posts and members that break their rules. Examples of rules communities often add:`}</P>
        <Cards min={260} items={RULE_PRESETS.map((r, i) => ({ icon: "flag", tone: TONES[i % TONES.length], title: r.title, text: r.body }))} />
        <P>{`If you run a community, you are responsible for keeping it on topic and following these Guidelines. Staff who abuse their powers can lose them.`}</P>
      </Sec>

      <Sec id="report" title="Report a problem">
        <P>{`There is no report button yet, so reports go through the contact form, and a person reads every one.`}</P>
        <Steps
          items={[
            { title: "Copy the link", text: "Open the post, comment, profile or community and copy its address from your browser." },
            { title: "Tell us what is wrong", text: "[Send a report](/contact?topic=report), paste the link and say which rule you think was broken. Screenshots help, but the link is the important bit." },
            { title: "Protect yourself in the meantime", text: "Block the person, mute words and limit who can comment from [Settings](/settings)." },
          ]}
        />
      </Sec>

      <Sec id="enforce" title="What happens next">
        <P>{`What we do depends on how serious it is and whether it has happened before. We may:`}</P>
        <Steps
          items={[
            { title: "Remove the content", text: "Posts, comments, stories or communities that break the rules can be taken down." },
            { title: "Warn or limit the account", text: "For example, limit what an account can post, or pause it for a while." },
            { title: "Suspend or ban", text: "For repeat or serious breaks, such as harassment, scams or sexual content involving minors, we close the account. Some things get a ban straight away." },
            { title: "Report to the authorities", text: "Where the law needs it or someone may be in danger." },
          ]}
        />
        <P>{`Think we got it wrong? You can [appeal](/contact?topic=appeal). We may update these Guidelines as the community grows (last updated ${LEGAL.updated}). See also the [Terms](/terms).`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
