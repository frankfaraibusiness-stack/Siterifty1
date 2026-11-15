import "./globals.css";

export const metadata = {
  title: "GTA6FanBase",
  description: "A fan social feed for the world of GTA6 / Leonida.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
