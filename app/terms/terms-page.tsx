"use client";

import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";

export function TermsPage() {
  const { t } = useI18n();
  return (
    <AppLayout>
      <div className="container max-w-4xl py-12 md:py-20">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{t("terms.title")}</h1>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.acceptTitle")}</h2>
            <p>{t("terms.acceptIntro")}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.useTitle")}</h2>
            <p>{t("terms.useIntro")}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.accountTitle")}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.account1")}</li>
              <li>{t("terms.account2")}</li>
              <li>{t("terms.account3")}</li>
            </ul>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.contentTitle")}</h2>
            <p>{t("terms.contentIntro")}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.liabilityTitle")}</h2>
            <p>{t("terms.liabilityIntro")}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("terms.modTitle")}</h2>
            <p>{t("terms.modIntro")}</p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}