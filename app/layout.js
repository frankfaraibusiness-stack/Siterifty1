import { cookies } from "next/headers";
import { Bowlby_One, Chakra_Petch } from "next/font/google";
import "./globals.css";
import "./communities.css";
import "./community-page.css";
import "./post-page.css";
import "./events.css";
import "./social.css";
import "./profile.css";
import "./messages/messages.css";
import "./compact.css";
import "./stories.css";
import "./story-maker.css";
import "./sidemenu.css";
import "./info.css";
import "./perks.css";
import "./ads.css";
import "./recommend.css";
import "./auth.css";
import "./currency.css";
import "./aibubble.css";
import "./vibe.css";
import "./enhance.css";
import "./cards.css";
import "./gifts.css";
import "./referrals.css";
import "./desktop.css";
import "./fullscreen.css";
import "./search-overlay.css";
import "./toast.css";
import "./spoilers.css";
import "./touches.css";
import "./discover.css";
import "./access.css";
import "./desktop-pages.css";
import "./select.css";
import { AI_BUBBLE_COOKIE, LOOK_COOKIE, lookToVars, readLookCookie } from "@/lib/look";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { SPOILER_COOKIE, readSpoilerMode } from "@/lib/spoilers";
import { ACCESS_COOKIE, accessAttrs, readAccessCookie } from "@/lib/access";
import { ONBOARD_COOKIE } from "@/lib/onboarding";
import BootScreen from "@/components/BootScreen";
import AiBubble from "@/components/AiBubble";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
import MessageSync from "@/components/messages/MessageSync";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import SkipLink from "@/components/SkipLink";
import PageTouches from "@/components/touches/PageTouches";
import ScrollReset from "@/components/ScrollReset";
import CurrencyProvider from "@/components/CurrencyProvider";
import { getFx } from "@/lib/fx";
import { siteUrl } from "@/lib/site";
import { shareMeta } from "@/lib/seo";

// Chunky headline face for the settings panels (the site's body text stays on
// the system font). Exposed as --font-display.
const display = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Squared, HUD-style face for labels, numbers and small print in the Story Maker
// (exposed as --font-hud). Sits next to the chunky display face above.
const hud = Chakra_Petch({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-hud",
  display: "swap",
});

export const metadata = {
  // Makes the social-preview image links on every page absolute.
  metadataBase: new URL(siteUrl()),
  applicationName: "GTAFanbase",
  // What shows when a link to the site is pasted into Discord, iMessage, X and friends. Pages that have no
  // picture of their own (and pages that don't set their own card) get the default share image.
  ...shareMeta({ title: "GTAFanbase", description: "A fan social feed for the world of GTA6 / Leonida." }),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Tints the phone's browser bar and status bar to match the page.
  themeColor: "#1b1925",
  // Stops Android Chrome from auto-zooming the page out to fit a too-wide
  // element (that is what left the feed in a narrow column with an empty strip
  // on the right). Pinch-to-zoom IN still works.
  minimumScale: 1,
  interactiveWidget: "resizes-content",
};

// The member's "City Look" (Settings > City Look) is kept in a cookie, so every
// page is rendered in their colours from the first paint.
export default async function RootLayout({ children }) {
  const jar = await cookies();
  const look = readLookCookie(jar.get(LOOK_COOKIE)?.value);
  // The visitor's currency and live USD rate (cached for an hour), so every
  // price on the site can be shown in their own money from the first paint.
  const fx = await getFx();
  // "Never show the AI bubble" is a cookie, so the page is already right at first paint.
  const aiBubble = jar.get(AI_BUBBLE_COOKIE)?.value === "hide" ? "hide" : "show";
  const signedIn = !!jar.get(SESSION_COOKIE_NAME)?.value;
  // A brand-new member who has not finished the 3-step welcome tour yet (/welcome).
  const onboardingPending = signedIn && !!jar.get(ONBOARD_COOKIE)?.value;
  // How this member wants spoiler covers to behave (cover / show / hide), known at first paint.
  const spoilers = readSpoilerMode(jar.get(SPOILER_COOKIE)?.value);
  // Settings > Access (contrast, underlined links, bigger buttons), also known at first paint.
  const access = accessAttrs(readAccessCookie(jar.get(ACCESS_COOKIE)?.value));

  return (
    <html
      lang="en"
      className={`${display.variable} ${hud.variable}`}
      style={lookToVars(look)}
      data-motion={look.motion}
      data-scroll-behavior="smooth"
      data-ai-bubble={aiBubble}
      data-spoilers={spoilers}
      {...access}
    >
      <body>
        <SkipLink />
        <BootScreen />
        <CurrencyProvider fx={fx}>{children}</CurrencyProvider>
        <OnboardingGate pending={onboardingPending} />
        <MessageSync signedIn={signedIn} />
        <KeyboardShortcuts />
        <PageTouches />
        <ScrollReset />
        <AiBubble signedIn={signedIn} />
      </body>
    </html>
  );
}
