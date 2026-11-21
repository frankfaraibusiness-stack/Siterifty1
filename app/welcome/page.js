import { redirect } from "next/navigation";
import Onboarding from "@/components/onboarding/Onboarding";
import { getCurrentUser } from "@/lib/current-user";
import "./welcome.css";

// The 3-step welcome tour every new account goes through (see lib/onboarding.js).
// It needs a signed-in member: visitors are sent home.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Welcome · GTAFanbase",
  description: "A quick tour of GTAFanbase: what it is, what you can do and how to make it yours.",
  robots: { index: false, follow: false },
};

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <Onboarding name={user.username || "fan"} />;
}
