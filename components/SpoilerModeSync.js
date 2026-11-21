"use client";

import { useEffect } from "react";
import { rememberSpoilerMode } from "@/lib/spoilers";

// Keeps this device's spoiler setting in step with the member's account, so a
// change made on another device (or signing in as someone else) shows up here.
export default function SpoilerModeSync({ mode }) {
  useEffect(() => {
    if (document.documentElement.dataset.spoilers !== mode) rememberSpoilerMode(mode);
  }, [mode]);
  return null;
}
