"use client";

import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPolicy() {
  const { t } = useI18n();
  return (
    <AppLayout>
      <SEO
        title={`${t("privacy.title")} | RemoteDevs BR`}
        description={t("privacy.desc")}
        canonicalPath="/privacy-policy"
      />
      <div className="container max-w-4xl py-12 md:py-20">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{t("privacy.title")}</h1>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.introTitle")}</h2>
            <p>{t("privacy.intro")}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.dataTitle")}</h2>
            <p>{t("privacy.dataIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.data1")}</li>
              <li>{t("privacy.data2")}</li>
              <li>{t("privacy.data3")}</li>
            </ul>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.usageTitle")}</h2>
            <p>{t("privacy.usageIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.usage1")}</li>
              <li>{t("privacy.usage2")}</li>
              <li>{t("privacy.usage3")}</li>
              <li>{t("privacy.usage4")}</li>
            </ul>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.shareTitle")}</h2>
            <p>{t("privacy.shareIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.share1")}</li>
              <li>{t("privacy.share2")}</li>
              <li>{t("privacy.share3")}</li>
            </ul>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.rightsTitle")}</h2>
            <p>{t("privacy.rightsIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.rights1")}</li>
              <li>{t("privacy.rights2")}</li>
              <li>{t("privacy.rights3")}</li>
              <li>{t("privacy.rights4")}</li>
            </ul>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="text-2xl font-semibold">{t("privacy.contactTitle")}</h2>
            <p>{t("privacy.contactIntro")}</p>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
