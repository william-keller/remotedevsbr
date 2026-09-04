"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { dicts, type Locale } from "./i18n-dicts";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "pt";
  const nav = navigator.language || navigator.languages?.[0] || "";
  return nav.toLowerCase().startsWith("en") ? "en" : "pt";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  const cookieLocale = getCookie("locale") as Locale | null;
  if (cookieLocale && (cookieLocale === "pt" || cookieLocale === "en")) return cookieLocale;
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored && (stored === "pt" || stored === "en")) return stored;
  return detectBrowserLocale();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window === "undefined") return;
    localStorage.setItem("locale", l);
    setCookie("locale", l);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("locale", locale);
    setCookie("locale", locale);
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const t = (key: string) => dicts[locale][key] ?? key;
  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function pickLocaleField<T extends Record<string, any>>(row: T, base: string, locale: Locale): string {
  const key = `${base}_${locale}`;
  return (row?.[key] as string) || (row?.[`${base}_en`] as string) || (row?.[`${base}_pt`] as string) || "";
}