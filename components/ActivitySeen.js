"use client";

import { useEffect } from "react";
import { pollNow } from "@/lib/message-sync";

// Renders nothing. Mounted on your own profile: opening it clears the
// "new likes / comments" part of the header badge.
export default function ActivitySeen() {
  useEffect(() => {
    let live = true;
    fetch("/api/notifications/seen", { method: "POST" })
      .then(() => {
        if (live) pollNow();
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return null;
}
