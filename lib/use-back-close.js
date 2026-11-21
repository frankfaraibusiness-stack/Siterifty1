"use client";

import { useCallback, useEffect, useRef } from "react";
import { startBackClose } from "@/lib/back-close";

// For a full-screen overlay: the phone's Back button closes it instead of
// leaving the page. Returns the function to call for every other way of
// closing (the close button, Escape, tapping outside).
export function useBackClose(onClose) {
  const latest = useRef(onClose);
  latest.current = onClose;
  const api = useRef(null);

  useEffect(() => {
    api.current = startBackClose(window, () => latest.current());
    return () => {
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  return useCallback(() => (api.current ? api.current.close() : latest.current()), []);
}
