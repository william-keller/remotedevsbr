"use client";

import { useEffect } from "react";
import { trackEnglishScroll } from "../track";

// Fires english_scroll events once per threshold (25/50/75/100%) as the user
// reads the landing page. Throttled to scroll events to avoid spam.
export function useScrollDepth() {
  useEffect(() => {
    const fired = new Set<number>();
    const handler = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const ratio = Math.floor((window.scrollY / max) * 100);
      const thresholds = [25, 50, 75, 100];
      for (const t of thresholds) {
        if (ratio >= t && !fired.has(t)) {
          fired.add(t);
          trackEnglishScroll(t);
        }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);
}