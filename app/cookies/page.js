import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { Callout, Cards, DataTable, Faq, Facts, JsonLd, P, Sec, Steps, faqLd } from "@/components/info/blocks";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/session";
import { LEGAL, PROVIDERS, SITE, STORAGE_ITEMS, infoPage } from "@/lib/site";

const page = infoPage("cookies");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "short", label: "The short version" },
  { id: "what", label: "What cookies are" },
  { id: "list", label: "What we use" },
  { id: "third", label: "Other companies" },
  { id: "control", label: "How to control it" },
  { id: "changes", label: "Changes" },
  { id: "faq", label: "Questions and answers" },
];

const DAYS = Math.round(SESSION_MAX_AGE_MS / 86_400_000);

// The login cookie's length comes from lib/session.js, so it can never drift.
const ITEMS = STORAGE_ITEMS.map((i) => (i.name === SESSION_COOKIE_NAME ? { ...i, lasts: `${DAYS} days` } : i));
const essential = ITEMS.filter((i) => i.group === "essential");
const preference = ITEMS.filter((i) => i.group === "preference");

const FAQS = [
  { q: "Do you use advertising or tracking cookies?", a: `No. ${SITE.name} only uses the cookies and browser storage listed in the table above. They keep you logged in and remember your choices. We do not use them for advertising or to follow you around the web.` },
  { q: "Why is there no cookie banner?", a: "Because we only use storage that the site needs to work or that remembers a choice you made, and nothing for advertising or tracking, there is nothing for you to switch on or off here. If that ever changes, we will update this page and ask you first where the law requires it." },
  { q: "What happens if I block cookies?", a: "You can still read public pages. You will not be able to stay logged in, so you will not be able to post, comment or change settings, and your site colours will not be remembered." },
  { q: "How do I log out and clear the login cookie?", a: "Use the log out button in the side menu. That ends your session on this browser." },
  { q: "How do I reset my site colours?", a: "Open [Settings](/settings) and use the City Look panel to change or reset them. You can also delete the look cookie in your browser." },
  { q: "Does YouTube set cookies?", a: "Videos posted as YouTube links play in a privacy-enhanced player from youtube-nocookie.com, which is designed not to store cookies until you play a video. Playing one may set cookies from YouTube. Their own policy covers that." },
];

function rows(list) {
  return list.map((i) => [`\`${i.name}\``, i.kind, i.purpose, i.lasts]);
}

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead="The few cookies and browser storage items we use, what each one does and how long it lasts."
      chips={[
        { icon: "lock", label: "No ad cookies" },
        { icon: "eyeoff", label: "No tracking" },
        { icon: "gear", label: `${ITEMS.length} items in total` },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="short" title="The short version">
        <Facts
          items={[
            { icon: "cookie", big: String(ITEMS.length), label: "items stored in your browser" },
            { icon: "lock", big: "0", label: "advertising or tracking cookies" },
            { icon: "clock", big: `${DAYS} days`, label: "longest login session" },
            { icon: "trash", big: "Clear", label: "any of it, any time, in your browser" },
          ]}
        />
        <Callout tone="ok" icon="check" title="Only what the site needs">
          We keep you logged in and remember the choices you make (like your site colours and unfinished posts). That is all. There is no advertising and no tracking of you across other sites.
        </Callout>
      </Sec>

      <Sec id="what" title="What cookies are">
        <Cards
          min={250}
          items={[
            { icon: "cookie", tone: "orange", title: "Cookies", text: "Tiny text files a website asks your browser to keep. The site sends them back so it knows it is you." },
            { icon: "doc", tone: "cyan", title: "Local storage", text: "Space in your browser where a site can keep information on your device. It stays until you clear it." },
            { icon: "clock", tone: "violet", title: "Session storage", text: "Like local storage, but it disappears when you close the tab." },
          ]}
        />
        <P>{`In this policy we call all three “cookies and storage”. Only a cookie is sent to our servers with each page request; local and session storage stay on your device.`}</P>
      </Sec>

      <Sec id="list" title="What we use">
        <h3>Essential</h3>
        <P>The site cannot work without these. They are set only when you log in.</P>
        <DataTable caption="Essential cookies and storage" head={["Name", "Type", "What it does", "How long"]} rows={rows(essential)} />
        <h3>Remembering your choices</h3>
        <P>These remember something you set, so you do not have to do it again.</P>
        <DataTable caption="Preference cookies and storage" head={["Name", "Type", "What it does", "How long"]} rows={rows(preference)} />
        <Callout tone="note" icon="info" title="Nothing here follows you">
          Every item above is set by {SITE.domain} itself, and none of them are used for advertising, profiling or sold to anyone.
        </Callout>
      </Sec>

      <Sec id="third" title="Other companies">
        <P>{`A few features load something from another company. Their own cookie rules apply to what they set:`}</P>
        <DataTable caption="Services that may set their own cookies" head={["Service", "Where it appears"]} rows={PROVIDERS.map((p) => [p.name, p.what])} />
        <P>{`See our [Privacy Policy](/privacy) for how your personal data is handled.`}</P>
      </Sec>

      <Sec id="control" title="How to control it">
        <Steps
          items={[
            { title: "Use the site’s own controls", text: "Log out from the side menu to end your session. Use the City Look panel in [Settings](/settings) to change or reset your colours. Turn off draft autosave in Settings if you do not want drafts kept on your device." },
            { title: "Use your browser’s settings", text: "Every browser lets you see, block and delete cookies and site data. Look for Privacy or Site data in its settings. You can clear just this site." },
            { title: "Know what you will lose", text: "If you block the login cookie you will not be able to stay logged in. If you clear your data, your colour choices and unsaved drafts will go." },
          ]}
        />
      </Sec>

      <Sec id="changes" title="Changes">
        <P>{`If we add or remove a cookie, we will update the table above and the date at the top of this page (now ${LEGAL.updated}). See also the [Privacy Policy](/privacy) and [Terms](/terms), or [ask us a question](/contact?topic=privacy).`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
