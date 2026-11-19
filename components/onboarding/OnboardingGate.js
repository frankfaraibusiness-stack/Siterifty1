"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gateRedirect } from "@/lib/onboarding";

// Mounted once in the root layout. While a new member still has the welcome
// tour to do (`pending`, read from a cookie on the server), every page except
// the tour and the plain info pages sends them to /welcome. This is the "no
// skip" rule: there is no close button on the tour, and wandering off just
// brings them back.
export default function OnboardingGate({ pending }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const to = gateRedirect(pending, pathname);

  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);

  return null;
}
