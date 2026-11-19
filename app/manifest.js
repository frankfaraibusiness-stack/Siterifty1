// Lets phones "Add to Home Screen" / install GTAFanbase as an app: its own icon, no browser bar,
// and long-press shortcuts for the places people jump to most.
export default function manifest() {
  return {
    name: "GTAFanbase",
    short_name: "GTAFanbase",
    description: "A fan social feed for the world of GTA6 / Leonida.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1b1925",
    theme_color: "#1b1925",
    categories: ["social", "entertainment", "games"],
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Create a post", short_name: "Create", url: "/create" },
      { name: "Messages", short_name: "Messages", url: "/messages" },
      { name: "Events", short_name: "Events", url: "/events" },
      { name: "Videos", short_name: "Videos", url: "/videos" },
    ],
  };
}
