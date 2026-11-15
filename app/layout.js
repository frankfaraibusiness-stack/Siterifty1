import { cookies } from "next/headers";
import { Bowlby_One } from "next/font/google";
import "./globals.css";
import "./communities.css";
import { LOOK_COOKIE, lookToVars, readLookCookie } from "@/lib/look";

// Chunky headline face for the settings panels (the site's body text stays on
// the system font). Exposed as --font-display.
const display = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
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

  return (
    <html
      lang="en"
      className={display.variable}
      style={lookToVars(look)}
      data-motion={look.motion}
    >
      <body>{children}</body>
    </html>
  );
}
