"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import type { AuthMode } from "@/components/AuthForm";
import { AuthForm } from "@/components/AuthForm";
import { AppLayout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/i18n";

function LoadingFallback() {
  const { t } = useI18n();
  return <div className="container max-w-md py-16 text-center text-muted-foreground">{t("common.loading")}</div>;
}

function AuthContent() {
  const params = useSearchParams();
  const initialMode: AuthMode = params.get("mode") === "signup" ? "signup" : "signin";

  return (
    <AppLayout>
      <SEO 
        title="Entrar ou Criar Conta | RemoteDevs BR" 
        description="Faça login ou crie sua conta gratuita para acessar vagas remotas internacionais e ferramentas de carreira."
        canonicalPath="/auth"
      />
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <AuthForm initialMode={initialMode} showBackLink />
        </div>
      </div>
    </AppLayout>
  );
}

export default function Auth() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthContent />
    </Suspense>
  );
}
