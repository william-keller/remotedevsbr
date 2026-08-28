"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AppLayout } from "@/components/Layout";
import { CoverLetterSubnav } from "@/components/tools/CoverLetterSubnav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getExampleBySlug } from "@/lib/cover-letter-content";
import { ArrowRight } from "lucide-react";

export default function CoverLetterExampleDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { t } = useI18n();
  const ex = getExampleBySlug(slug);

  const articleStructured = useMemo(() => {
    if (!ex) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: t(ex.roleKey),
      description: t(ex.excerptKey),
      url: `https://remotedevsbr.com/tools/cover-letter/examples/${ex.slug}`,
    };
  }, [ex, t]);

  if (!ex) {
    return (
      <AppLayout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Not found</p>
          <Button asChild className="mt-4">
            <Link href="/tools/cover-letter/examples">{t("coverLetter.backToExamples")}</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={`${t(ex.roleKey)} | ${t("coverLetter.examplesSeoTitle")}`}
        description={t(ex.excerptKey)}
        canonicalPath={`/tools/cover-letter/examples/${ex.slug}`}
        structuredData={articleStructured}
      />
      <div className="container max-w-3xl py-10">
        <CoverLetterSubnav />
        <Link
          href="/tools/cover-letter/examples"
          className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
        >
          ← {t("coverLetter.backToExamples")}
        </Link>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
            {t(ex.seniorityKey)}
          </span>
          <span className="text-xs text-muted-foreground">{t(ex.stackKey)}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">{t(ex.roleKey)}</h1>
        <p className="text-muted-foreground mt-3">{t(ex.excerptKey)}</p>

        <section className="mt-8 rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {t("coverLetter.targetRole")}
          </h2>
          <p className="text-sm">{ex.targetRole}</p>
        </section>

        <section className="mt-4 rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {t("coverLetter.jobDescription")}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ex.sampleJobDescription}</p>
        </section>

        <section className="mt-4 rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {t("coverLetter.resume")}
          </h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ex.sampleResume}</p>
        </section>

        <Button asChild size="lg" className="mt-8 w-full sm:w-auto gradient-go text-primary-foreground">
          <Link href={`/tools/cover-letter?example=${ex.slug}`}>
            {t("coverLetter.generateSimilar")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </AppLayout>
  );
}
