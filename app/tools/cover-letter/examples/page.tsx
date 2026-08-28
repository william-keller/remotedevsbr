"use client";

import Link from "next/link";
import { AppLayout } from "@/components/Layout";
import { CoverLetterSubnav } from "@/components/tools/CoverLetterSubnav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { COVER_LETTER_EXAMPLES } from "@/lib/cover-letter-content";
import { ArrowRight } from "lucide-react";

export default function CoverLetterExamplesPage() {
  const { t } = useI18n();

  const itemListStructured = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: COVER_LETTER_EXAMPLES.map((ex, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t(ex.roleKey),
      url: `https://remotedevsbr.com/tools/cover-letter/examples/${ex.slug}`,
    })),
  };

  return (
    <AppLayout>
      <SEO
        title={t("coverLetter.examplesSeoTitle")}
        description={t("coverLetter.examplesSeoDesc")}
        canonicalPath="/tools/cover-letter/examples"
        structuredData={itemListStructured}
      />
      <div className="container max-w-4xl py-10">
        <CoverLetterSubnav />
        <h1 className="text-4xl font-bold">{t("coverLetter.examplesTitle")}</h1>
        <p className="text-muted-foreground mt-2 mb-10">{t("coverLetter.examplesSub")}</p>
        <ul className="space-y-4">
          {COVER_LETTER_EXAMPLES.map((ex) => (
            <li
              key={ex.slug}
              className="rounded-xl border bg-card p-6 hover:border-primary/40 transition"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {t(ex.seniorityKey)}
                </span>
                <span className="text-xs text-muted-foreground">{t(ex.stackKey)}</span>
              </div>
              <h2 className="font-semibold text-lg">{t(ex.roleKey)}</h2>
              <p className="text-sm text-muted-foreground mt-2">{t(ex.excerptKey)}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tools/cover-letter/examples/${ex.slug}`}>
                    {t("coverLetter.viewExample")}
                  </Link>
                </Button>
                <Button asChild size="sm" className="gradient-go text-primary-foreground">
                  <Link href={`/tools/cover-letter?example=${ex.slug}`}>
                    {t("coverLetter.generateSimilar")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
