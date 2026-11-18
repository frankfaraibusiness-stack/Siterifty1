import NavLoader from "@/components/NavLoader";

// Shown instantly while the Videos page loads: the site logo on a black reel, not feed cards.
export default function Loading() {
  return <NavLoader reel />;
}
