"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setFast, startSync } from "@/lib/message-sync";

// Renders nothing. Keeps delivery receipts, the unread badge and the online
// dot working on every page, not just /messages.
export default function MessageSync({ signedIn = true }) {
  const pathname = usePathname() || "/";
  useEffect(() => {
    if (signedIn) startSync(); // signed-out visitors never poll
  }, [signedIn]);
  useEffect(() => {
    setFast(pathname.startsWith("/messages"));
  }, [pathname]);
  return null;
}
