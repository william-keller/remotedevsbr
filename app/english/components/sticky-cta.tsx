"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ENGLISH_PRICING, type EnglishInterest } from "@/lib/english/config";
import { brl } from "@/lib/english/format";

// Persistent mobile-only CTA bar. Appears after the visitor scrolls past the
// hero and sticks to the bottom, padded for iOS safe areas. Hidden on md+.
export function StickyCta({ onCta }: { onCta: (i: EnglishInterest) => void }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  const c = ENGLISH_PRICING.career;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="container flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{t("english.sticky.price")}</p>
          <p className="truncate text-xs text-muted-foreground">
            {brl(c.firstInstallment)} {t("english.plan.career.firstLabel")}
          </p>
        </div>
        <Button
          className="shrink-0 gradient-gold text-gold-foreground"
          onClick={() => onCta("career")}
        >
          {t("english.sticky.cta")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}