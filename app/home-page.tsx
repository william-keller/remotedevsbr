"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Compass, Languages, FileText, Briefcase, Building2, Calculator, ThumbsUp } from "lucide-react";
import { AppLayout } from "@/components/Layout";
import { HomeBannerCarousel } from "@/components/HomeBannerCarousel";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import { useFeatureToggles } from "@/lib/feature-toggles";

export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isEnabled } = useFeatureToggles();

  const features = [
    { icon: Compass, title: t("home.f1"), desc: t("home.f1d"), to: "/journey", toggleKey: "navbar-show-journey" },
    { icon: Languages, title: t("home.f2"), desc: t("home.f2d"), to: "/classes", toggleKey: "navbar-show-classes" },
    { icon: FileText, title: t("home.f3"), desc: t("home.f3d"), to: "/tools/resume", toggleKey: "navbar-show-tools" },
    { icon: Briefcase, title: t("home.f4"), desc: t("home.f4d"), to: "/jobs", toggleKey: "navbar-show-jobs" },
    { icon: Building2, title: t("home.f5"), desc: t("home.f5d"), to: "/companies", toggleKey: "navbar-show-companies" },
    { icon: Calculator, title: t("home.f6"), desc: t("home.f6d"), to: "/tools/salary", toggleKey: "navbar-show-tools" },
  ];

  const visibleFeatures = features.filter(f => !f.toggleKey || isEnabled(f.toggleKey));

  return (
    <AppLayout>
      <HomeBannerCarousel />

      {/* Features */}
      <section className="container py-20">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">{t("home.featuresTitle")}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleFeatures.map((f, i) => (
            <Link
              key={i}
              href={f.to}
              className="group rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-elegant transition-all"
              onClick={(e) => {
                if (!user && f.to === "/tools/resume") {
                  e.preventDefault();
                  openAuthModal("signup");
                }
              }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recruiter CTA */}
      <section className="container py-12">
        <div className="rounded-2xl border bg-card p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 flex items-center gap-2">
                    <Building2 className="text-emerald-500" />
                    {t("home.recruiter.title")}
                </h2>
                <p className="text-muted-foreground text-lg">
                    {t("home.recruiter.desc")}
                </p>
            </div>
            <div className="shrink-0">
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/recruiter/auth">{t("home.recruiter.cta")}</Link>
                </Button>
            </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="container pb-12">
        <div className="rounded-2xl gradient-go text-primary-foreground p-10 md:p-14 text-center shadow-elegant">
          <ThumbsUp className="h-10 w-10 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("home.ctaFinal.title")}</h2>
          <p className="opacity-90 mb-6">{t("home.ctaFinal.sub")}</p>
          <Button size="lg" variant="secondary" onClick={() => openAuthModal("signup")}>
            {t("home.ctaJoin")}
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}