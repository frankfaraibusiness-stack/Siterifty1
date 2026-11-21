import Link from "next/link";
import InfoShell, { infoMetadata } from "@/components/info/InfoShell";
import { Bullets, Callout, Cards, DataTable, Faq, Facts, JsonLd, P, Sec, Steps, faqLd } from "@/components/info/blocks";
import { CONTACT, LEGAL, NOT_AFFILIATED, OPERATOR, SITE, infoPage } from "@/lib/site";

const page = infoPage("copyright");
export const metadata = infoMetadata(page);

const TOC = [
  { id: "owns", label: "Who owns what" },
  { id: "fan", label: "Fan content and Rockstar’s work" },
  { id: "notice", label: "Report infringement (DMCA)" },
  { id: "counter", label: "If your content was removed" },
  { id: "repeat", label: "Repeat infringers" },
  { id: "logo", label: "Our logo on photos" },
  { id: "faq", label: "Questions and answers" },
];

const FAQS = [
  { q: "Who owns the photos and videos I post?", a: "You do, if you made them or have permission to share them. You give us a licence to show them on the site. See the [Terms](/terms)." },
  { q: "Who owns Grand Theft Auto?", a: `${NOT_AFFILIATED.trademark}` },
  { q: "How do I report something that copies my work?", a: "Use the steps in the Report infringement section above and send them through the [contact form](/contact?topic=copyright). Include the link to the content and to your original." },
  { q: "How long does it take to remove content?", a: `We aim to look at a complete notice and act on it promptly, and to reply within ${LEGAL.responseDays} days at the latest.` },
  { q: "Will you tell the person whose content I reported?", a: "Usually yes. We may pass on the details of your notice, including your name and the work you say was copied, so they can reply. Do not include anything you want kept private." },
  { q: "I am from Rockstar Games or Take-Two. How do I contact you?", a: "Use the [contact form](/contact?topic=copyright) and tell us who you are. If a rights owner asks us to remove something, we act on it." },
  { q: "Can I use the GTAFanbase logo?", a: "Not without asking us first. The logo belongs to us. See Our logo on photos below." },
];

export default function Page() {
  return (
    <InfoShell
      page={page}
      toc={TOC}
      updated
      lead="Who owns what on GTAFanbase, how to send a takedown notice, and what to do if your own content is removed."
      chips={[
        { icon: "copyright", label: "DMCA notices" },
        { icon: "scale", label: "Fan project" },
        { icon: "mail", label: "Use the contact form" },
      ]}
    >
      <JsonLd data={faqLd(FAQS)} />

      <Sec id="owns" title="Who owns what">
        <Facts
          items={[
            { icon: "heart", big: "You", label: "own what you create and post" },
            { icon: "star", big: "Take-Two", label: "and Rockstar own Grand Theft Auto" },
            { icon: "tag", big: "Us", label: `own the ${SITE.name} name, logo and site design` },
          ]}
        />
        <DataTable
          caption="Who owns what"
          head={["What", "Who owns it", "What you may do"]}
          rows={[
            ["Your posts, photos, videos, art and words", "You (or whoever made them)", "Share them here. You give us a licence to show them on the site, nothing more."],
            ["Grand Theft Auto, GTA VI and Rockstar Games names, logos, characters, music and artwork", "Take-Two Interactive and its subsidiaries, including Rockstar Games", "Discuss, review and make fan art. Do not claim them as yours or say they are made by us."],
            [`${SITE.name} name, logo, design and software`, "The site", "Do not copy or reuse them in a way that suggests we made or approve of your work."],
            ["Other people’s art, edits, clips and photos", "Their creators", "Share only with permission, or credit and link the original where the law and the creator allow it."],
          ]}
        />
      </Sec>

      <Sec id="fan" title="Fan content and Rockstar’s work">
        <Callout tone="warn" icon="alert" title="We are not Rockstar">
          {NOT_AFFILIATED.long}
        </Callout>
        <P>{`${SITE.name} is a fan community. Fan art, screenshots from official trailers, edits and discussion about GTA 6 are part of what makes it fun. We ask that nobody posts stolen or leaked game files, source code or assets, or copies of the game. If Rockstar Games, Take-Two or any other rights owner asks us to remove content, we will act on it.`}</P>
      </Sec>

      <Sec id="notice" title="Report infringement (DMCA)">
        <P>{`We respect copyright. If you are the owner of a work (or are allowed to act for the owner) and you believe something on ${SITE.name} infringes it, you can send us a notice under the US Digital Millennium Copyright Act (DMCA), or the equivalent law where you live. We remove or disable access to material that is reported properly.`}</P>
        <h3>Your notice needs these things</h3>
        <Steps
          items={[
            { title: "Your signature", text: "A physical or electronic signature of the copyright owner or the person allowed to act for them. Typing your full name is enough." },
            { title: "The work that was copied", text: "Say which copyrighted work you believe was infringed. If there are several, a list is fine. A link to the original helps." },
            { title: "Where we can find the copy", text: `The web address (URL) of each post, comment, story or profile on ${SITE.domain} you want removed, so we can find the exact material.` },
            { title: "How to reach you", text: "Your name, postal address, phone number and email address." },
            { title: "A statement of good faith", text: "Say that you have a good-faith belief the use is not authorised by the copyright owner, its agent or the law." },
            { title: "A statement of accuracy", text: "Say that the information in your notice is accurate and, under penalty of perjury, that you are the owner or authorised to act for the owner." },
          ]}
        />
        <Callout tone="note" icon="mail" title="Where to send it">
          {LEGAL.dmcaAgent
            ? `Send your notice to our designated agent: ${LEGAL.dmcaAgent}. You can also use the contact form.`
            : "Send your notice through the contact form and choose “Copyright or DMCA notice”."}
          {CONTACT.email ? ` Email: ${CONTACT.email}.` : ""}
        </Callout>
        <div className="ip-cta-row">
          <Link href="/contact?topic=copyright" className="ip-btn" prefetch={false}>
            Send a copyright notice
          </Link>
        </div>
        <Callout tone="warn" icon="alert" title="Please be accurate">
          Under US law (17 U.S.C. § 512(f)), a person who knowingly makes a false claim that material is infringing can be responsible for damages. If you are unsure whether something infringes your copyright, think about speaking to a lawyer first.
        </Callout>
        <P>{`When we receive a complete notice we may remove the material, tell the person who posted it, and give them a copy of your notice, including your name and contact details. Incomplete notices may not be acted on, so please use the list above.`}</P>
      </Sec>

      <Sec id="counter" title="If your content was removed">
        <P>{`If we removed something you posted because of a copyright notice, and you believe that was a mistake or that you have permission to post it, you can send us a counter-notice through the [contact form](/contact?topic=appeal). It needs:`}</P>
        <Bullets
          items={[
            "Your signature (typing your full name is enough).",
            "What was removed and where it appeared before it was removed.",
            "A statement, under penalty of perjury, that you have a good-faith belief it was removed by mistake or misidentification.",
            "Your name, address and phone number, and a statement that you agree to the jurisdiction of the federal court for your address (or, if you are outside the United States, any court where we can be found) and will accept legal papers from the person who sent the notice.",
          ]}
        />
        <P>{`We pass your counter-notice to the person who made the original claim. If they do not tell us they have started a court case within 10 to 14 business days, we may restore the material. Only send a counter-notice if it is true.`}</P>
      </Sec>

      <Sec id="repeat" title="Repeat infringers">
        <P>{`Accounts that are repeatedly found to be posting infringing material can be limited or closed. We apply this fairly and look at each case on its own. If you think you have been treated unfairly, [appeal here](/contact?topic=appeal).`}</P>
      </Sec>

      <Sec id="logo" title="Our logo on photos">
        <Cards
          min={260}
          items={[
            { icon: "image", tone: "pink", title: "Branded copies", text: `Photos added to posts show the ${SITE.name} logo, so downloaded or screenshotted copies show where they came from.` },
            { icon: "heart", tone: "cyan", title: "Your photo is still yours", text: "The logo only shows where the image was shared. It does not change who owns the photo or what you can do with your original." },
            { icon: "x", tone: "orange", title: "Please do not remove it", text: "Do not crop out, cover or edit out the logo from copies of other people’s posts to pass them off as your own." },
          ]}
        />
        <P>{`${OPERATOR} is not the owner of Grand Theft Auto and is not working with Rockstar Games or Take-Two Interactive. Read the [disclaimer](/disclaimer) and [Terms](/terms).`}</P>
      </Sec>

      <Faq items={FAQS} />
    </InfoShell>
  );
}
