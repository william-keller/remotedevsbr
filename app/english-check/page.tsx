"use client";

// TODO (item 5): English Readiness Checker
// Avaliação de inglês: texto agora, voz depois.
// Próximo ciclo: prompt de writing + transcrição/análise de pronúncia.
import { AppLayout } from "@/components/Layout";
import { RequireAuth } from "@/components/Guards";
import { Construction } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/i18n";

function Inner() {
  const { t } = useI18n();
  return (
    <AppLayout>
      <div className="container max-w-3xl py-20 text-center">
        <Construction className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold">{t("englishcheck.title")}</h1>
        <p className="text-muted-foreground mt-3">
          {t("englishcheck.description")}
        </p>
      </div>
    </AppLayout>
  );
}

export default function EnglishCheck() {
  return <RequireAuth>
      <SEO 
        title="English Check - Avalie seu Inglês | RemoteDevs BR" 
        description="Teste seu nível de inglês técnico e descubra se está preparado para entrevistas em empresas internacionais."
        canonicalPath="/english-check"
      /><Inner /></RequireAuth>;
}
