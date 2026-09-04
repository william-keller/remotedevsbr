"use client";

import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

import { FileText, User, Calculator, Scale, ReceiptText, Mail, Video } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Tools() {
  const { t } = useI18n();
  const items = [
    { to: "/mock-interview", icon: Video, title: t("mockInterview.toolTitle"), desc: t("mockInterview.toolDesc"), pro: false },
    { to: "/tools/cover-letter", icon: Mail, title: t("coverLetter.title"), desc: t("tools.coverLetterDesc"), pro: false },
    { to: "/tools/resume", icon: FileText, title: t("resume.title"), desc: t("tools.resumeDesc"), pro: true },
    { to: "/tools/linkedin", icon: User, title: t("linkedin.title"), desc: t("tools.linkedinDesc"), pro: true },
    { to: "/tools/salary", icon: Calculator, title: t("salary.title"), desc: t("tools.salaryDesc"), pro: false },
    { to: "/tools/invoice-generator", icon: ReceiptText, title: t("invoice.toolTitle"), desc: t("invoice.toolSubtitle"), pro: false },
    { to: "/english", icon: Scale, title: t("english.title"), desc: t("english.subtitle"), pro: true },
  ];
  return (
    <AppLayout>
      <SEO 
        title="Ferramentas Grátis para Devs | RemoteDevs BR" 
        description="Ferramentas gratuitas: carta de apresentação com IA, verificador ATS, calculadora salarial e otimizador de LinkedIn."
        canonicalPath="/tools"
      />
      <div className="container py-10">
        <h1 className="text-4xl font-bold">{t("nav.tools")}</h1>
        <p className="text-muted-foreground mt-2 mb-8">{t("tools.subtitle")}</p>
        <div className="grid md:grid-cols-2 gap-5">
          {items.map(i => (
            <Link key={i.to} href={i.to} className="rounded-xl border bg-card p-6 hover:border-primary/40 hover:shadow-elegant transition group">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <i.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{i.title}</h3>
                {i.pro && <span className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 gradient-gold text-gold-foreground">PRO</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
