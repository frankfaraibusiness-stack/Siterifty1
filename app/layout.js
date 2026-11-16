import { cookies } from "next/headers";
import { Bowlby_One } from "next/font/google";
import "./globals.css";
import "./communities.css";
import "./events.css";
import "./compact.css";
import "./sidemenu.css";
import "./info.css";
import "./perks.css";
import "./auth.css";
import "./currency.css";
import "./aibubble.css";
import { AI_BUBBLE_COOKIE, LOOK_COOKIE, lookToVars, readLookCookie } from "@/lib/look";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import BootScreen from "@/components/BootScreen";
import AiBubble from "@/components/AiBubble";
import CurrencyProvider from "@/components/CurrencyProvider";
import { getFx } from "@/lib/fx";
import { siteUrl } from "@/lib/site";

// Chunky headline face for the settings panels (the site's body text stays on
// the system font). Exposed as --font-display.
const display = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  // Makes the social-preview image links on every page absolute.
  metadataBase: new URL(siteUrl()),
  title: "GTA6FanBase",
  description: "A fan social feed for the world of GTA6 / Leonida.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
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

  return (
    <html
      lang="en"
      className={display.variable}
      style={lookToVars(look)}
      data-motion={look.motion}
      data-ai-bubble={aiBubble}
    >
      <body>
        <BootScreen />
        <CurrencyProvider fx={fx}>{children}</CurrencyProvider>
        <AiBubble signedIn={signedIn} />
      </body>
    </html>
  );
}
