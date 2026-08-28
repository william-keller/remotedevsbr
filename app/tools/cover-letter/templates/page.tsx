"use client";

import Link from "next/link";
import { AppLayout } from "@/components/Layout";
import { CoverLetterSubnav } from "@/components/tools/CoverLetterSubnav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { COVER_LETTER_TEMPLATES } from "@/lib/cover-letter-content";
import { FileText, ArrowRight } from "lucide-react";

export default function CoverLetterTemplatesPage() {
  const { t } = useI18n();

  return (
    <AppLayout>
      <SEO
        title={t("coverLetter.templatesSeoTitle")}
        description={t("coverLetter.templatesSeoDesc")}
        canonicalPath="/tools/cover-letter/templates"
      />
      <div className="container max-w-4xl py-10">
        <CoverLetterSubnav />
        <h1 className="text-4xl font-bold">{t("coverLetter.templatesTitle")}</h1>
        <p className="text-muted-foreground mt-2 mb-10">{t("coverLetter.templatesSub")}</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {COVER_LETTER_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border bg-card p-6 hover:border-primary/40 transition group"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-lg">{t(tpl.nameKey)}</h2>
              <p className="text-sm text-muted-foreground mt-2">{t(tpl.descKey)}</p>
              <Button asChild variant="outline" className="mt-4 w-full group-hover:border-primary">
                <Link href={`/tools/cover-letter?template=${tpl.id}`}>
                  {t("coverLetter.useTemplate")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
