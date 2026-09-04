"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AuthModalProvider } from "@/lib/auth-modal";
import { AuthModal } from "@/components/AuthModal";
import { ReactNode, useState, useEffect, useRef } from "react";
import { FeatureTogglesProvider, useFeatureToggles } from "@/lib/feature-toggles";

/**
 * Syncs the app locale with the signed-in user's Supabase profile. On login it
 * applies the profile's saved locale (overriding cookie/localStorage), and on
 * locale change it writes the preference back to the profile so it persists
 * across devices. Sits inside both I18nProvider and AuthProvider.
 */
function LocaleSync({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { locale, setLocale } = useI18n();
  const appliedProfileId = useRef<string | null>(null);

  // Apply the profile's saved locale once per profile load (login or profile
  // refresh), never again afterwards: re-running this on every locale change
  // would treat the user's own toggle as a divergence and revert it.
  useEffect(() => {
    if (!user) {
      appliedProfileId.current = null;
      return;
    }
    if (!profile) return;
    if (appliedProfileId.current === profile.id) return;
    appliedProfileId.current = profile.id;
    if ((profile.locale === "pt" || profile.locale === "en") && profile.locale !== locale) {
      setLocale(profile.locale);
    }
  }, [user, profile, locale, setLocale]);

  // Write the current locale back to the profile once it has loaded (so the
  // initial read wins), and only when it differs from the persisted value.
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.locale === locale) return;
    supabase
      .from("profiles")
      .upsert({ id: user.id, locale }, { onConflict: "id" })
      .then(() => {});
  }, [locale, user, profile]);

  return <>{children}</>;
}
/**
 * Forces locale to "pt" when the "is_english_lang_enabled" feature flag is
 * disabled. Sits inside both I18nProvider and FeatureTogglesProvider so it
 * can read from both contexts.
 */
function EnglishLangGuard({ children }: { children: ReactNode }) {
  const { isEnabled, loading } = useFeatureToggles();
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    if (!loading && !isEnabled("is_english_lang_enabled") && locale === "en") {
      setLocale("pt");
    }
  }, [loading, isEnabled, locale, setLocale]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <LocaleSync>
          <FeatureTogglesProvider>
            <EnglishLangGuard>
              <AuthModalProvider>
                <TooltipProvider>
                  {children}
                  <AuthModal />
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </AuthModalProvider>
            </EnglishLangGuard>
          </FeatureTogglesProvider>
          </LocaleSync>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
