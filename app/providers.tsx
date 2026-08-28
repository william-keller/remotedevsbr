"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AuthModalProvider } from "@/lib/auth-modal";
import { AuthModal } from "@/components/AuthModal";
import { ReactNode, useState, useEffect } from "react";
import { FeatureTogglesProvider, useFeatureToggles } from "@/lib/feature-toggles";

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
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
