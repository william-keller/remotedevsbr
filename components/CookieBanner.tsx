"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";


export function CookieBanner() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setIsVisible(true);
    } else if (consent === "accepted") {
      loadGTM();
    }
  }, []);

  const loadGTM = () => {
    // Avoid loading multiple times
    if ((window as any).dataLayer && (window as any).dataLayer.find((item: any) => item['gtm.start'])) {
      return;
    }
    
    (function(w: any,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j: any=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;if(f.parentNode)f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-57FGCZQK');
  };

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setIsVisible(false);
    loadGTM();
  };

  const handleReject = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground max-w-3xl">
        {t("cookie.textA")}{" "}
        <Link href="/privacy-policy" className="underline hover:text-foreground">{t("auth.privacyLink")}</Link>.
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleReject}>
          {t("cookie.reject")}
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAccept}>
          {t("cookie.accept")}
        </Button>
      </div>
    </div>
  );
}
