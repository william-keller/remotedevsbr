"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";


export function CookieBanner() {
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
        Utilizamos cookies essenciais e tecnologias semelhantes para melhorar a sua experiência na nossa plataforma, além de ferramentas de análise para entender como você utiliza o nosso site. 
        Ao clicar em "Aceitar", você concorda com o uso de cookies para esses fins, conforme nossa{" "}
        <Link href="/privacy-policy" className="underline hover:text-foreground">Política de Privacidade</Link>.
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleReject}>
          Recusar Não Essenciais
        </Button>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAccept}>
          Aceitar Cookies
        </Button>
      </div>
    </div>
  );
}
