"use client";

// Analytics helper for the English for Tech landing page.
// Pushes GTM events into dataLayer (loaded post-consent by CookieBanner).
// Kept tiny on purpose: only fire-and-forget tracking, no side effects.

type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
  } catch {
    // tracking must never break the page
  }
}

export function trackEnglishCta(interest: string) {
  trackEvent("english_cta_click", { interest });
}

export function trackEnglishPlanClick(plan: string) {
  trackEvent("english_plan_click", { plan });
}

export function trackEnglishFormStart(plan: string) {
  trackEvent("english_form_start", { plan });
}

export function trackEnglishFormSubmit(plan: string) {
  trackEvent("english_form_submit", { plan });
}

export function trackEnglishScroll(depth: number) {
  trackEvent("english_scroll", { depth });
}