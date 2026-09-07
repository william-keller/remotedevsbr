"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import type { AuthMode } from "@/components/AuthForm";
import { AuthForm } from "@/components/AuthForm";
import { AppLayout } from "@/components/Layout";
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
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <AuthForm initialMode={initialMode} showBackLink />
        </div>
      </div>
    </AppLayout>
  );
}

export function Auth() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthContent />
    </Suspense>
  );
}