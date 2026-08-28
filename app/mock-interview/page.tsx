"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";

import { AppLayout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShoppingCart, CalendarDays, MessageSquareText, Loader2,
  Video, Clock, UserCheck, Lightbulb, Users,
  ChevronDown, Cpu, Code2, Layers, Globe, BadgeCheck,
  Award, Terminal
} from "lucide-react";

type Package = {
  id: string;
  name_pt: string;
  name_en: string;
  description_pt: string;
  description_en: string;
  session_count: number;
  price_cents: number;
  discount_label: string | null;
  sort_order: number;
};

type Interviewer = {
  id: string;
  name: string;
  bio_pt: string | null;
  bio_en: string | null;
  specialties: string[];
  avatar_url: string | null;
};

function Inner() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [packages, setPackages] = useState<Package[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (params.get("success")) {
      toast.success(t("mockInterview.paymentSuccess"));
      router.replace(pathname);
    } else if (params.get("canceled")) {
      toast.info(t("mockInterview.paymentCanceled"));
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const [{ data: pkgData }, { data: intData }] = await Promise.all([
        supabase
          .from("mock_interview_packages")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("mock_interview_interviewers")
          .select("id, name, bio_pt, bio_en, specialties, avatar_url")
          .eq("is_active", true),
      ]);
      setPackages((pkgData as Package[]) ?? []);
      setInterviewers((intData as Interviewer[]) ?? []);
    };
    loadData();
  }, []);

  const checkout = async (pkg: Package) => {
    if (!user) {
      openAuthModal("signup");
      return;
    }
    setLoading(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke("mock-interview-checkout", {
        body: { package_id: pkg.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error(data?.error ?? "No checkout URL");
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(0)}`;
  };

  const perSessionPrice = (pkg: Package) => {
    return `R$ ${Math.round(pkg.price_cents / 100 / pkg.session_count)}`;
  };

  const technicalPillars = [
    {
      icon: Cpu,
      title: t("mockInterview.topic1Title"),
      desc: t("mockInterview.topic1Desc"),
      badge: "Arquitetura & Escala",
    },
    {
      icon: Code2,
      title: t("mockInterview.topic2Title"),
      desc: t("mockInterview.topic2Desc"),
      badge: "LeetCode & Coding",
    },
    {
      icon: Layers,
      title: t("mockInterview.topic3Title"),
      desc: t("mockInterview.topic3Desc"),
      badge: "Clean Code & Trade-offs",
    },
    {
      icon: Globe,
      title: t("mockInterview.topic4Title"),
      desc: t("mockInterview.topic4Desc"),
      badge: "English Tech Screen",
    },
  ];

  const reputationHighlights = [
    {
      icon: BadgeCheck,
      title: t("mockInterview.repStat1"),
      desc: "Entrevistadores com experiência comprovada atuando em empresas de tecnologia nos EUA e Europa.",
    },
    {
      icon: Award,
      title: t("mockInterview.repStat2"),
      desc: "Dezenas de avaliações técnicas conduzidas para contratações sênior, plenas e liderança técnica.",
    },
    {
      icon: Terminal,
      title: t("mockInterview.repStat3"),
      desc: "Avaliação criteriosa de estrutura de dados, escolhas de banco, mensageria e comunicação técnica.",
    },
  ];

  const features = [
    { icon: Clock, text: t("mockInterview.feat1") },
    { icon: MessageSquareText, text: t("mockInterview.feat2") },
    { icon: UserCheck, text: t("mockInterview.feat3") },
    { icon: Lightbulb, text: t("mockInterview.feat4") },
    { icon: Users, text: t("mockInterview.feat5") },
  ];

  const faqs = [
    { q: t("mockInterview.faq1q"), a: t("mockInterview.faq1a") },
    { q: t("mockInterview.faq2q"), a: t("mockInterview.faq2a") },
    { q: t("mockInterview.faq3q"), a: t("mockInterview.faq3a") },
    { q: t("mockInterview.faq4q"), a: t("mockInterview.faq4a") },
  ];

  const steps = [
    { icon: ShoppingCart, title: t("mockInterview.step1"), desc: t("mockInterview.step1d") },
    { icon: CalendarDays, title: t("mockInterview.step2"), desc: t("mockInterview.step2d") },
    { icon: MessageSquareText, title: t("mockInterview.step3"), desc: t("mockInterview.step3d") },
  ];

  return (
    <AppLayout>
      <SEO
        title={t("mockInterview.seoTitle")}
        description={t("mockInterview.seoDesc")}
        canonicalPath="/mock-interview"
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative max-w-5xl py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6">
            <Video className="h-3.5 w-3.5" /> Mock Interview Técnica
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            {t("mockInterview.heroTitle")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-3xl mx-auto">
            {t("mockInterview.heroSub")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border bg-card text-xs font-semibold">
              <Cpu className="h-3.5 w-3.5 text-primary" /> System Design & Arquitetura
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border bg-card text-xs font-semibold">
              <Code2 className="h-3.5 w-3.5 text-primary" /> LeetCode & Live Coding
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border bg-card text-xs font-semibold">
              <Globe className="h-3.5 w-3.5 text-primary" /> Tech English Interview
            </span>
          </div>

          <Button
            size="lg"
            className="mt-8 gradient-go text-primary-foreground text-base px-8"
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
          >
            {t("mockInterview.heroCta")}
          </Button>
        </div>
      </section>

      {/* Technical Pillars Section */}
      <section className="container max-w-5xl py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold">{t("mockInterview.topicsTitle")}</h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            {t("mockInterview.topicsSub")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {technicalPillars.map((p, i) => (
            <div key={i} className="p-6 rounded-2xl border bg-card relative hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {p.badge}
                </span>
              </div>
              <h3 className="font-bold text-xl mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interviewer Reputation Section */}
      <section className="bg-muted/30 border-y py-16">
        <div className="container max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
              <Award className="h-3.5 w-3.5" /> Reputação & Experiência
            </div>
            <h2 className="text-3xl font-bold">{t("mockInterview.reputationTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {t("mockInterview.reputationSub")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {reputationHighlights.map((h, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <h.icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{h.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>

          {interviewers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-center mb-6">Nossos Entrevistadores Cadastrados</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {interviewers.map((int) => (
                  <div key={int.id} className="p-6 rounded-2xl border bg-card flex flex-col md:flex-row gap-5 items-start">
                    <div className="h-16 w-16 rounded-full bg-primary/10 border text-primary font-bold text-xl flex items-center justify-center shrink-0">
                      {int.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={int.avatar_url} alt={int.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        int.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{int.name}</h4>
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pickLocaleField(int, "bio", locale) || "Senior Software Engineer & Tech Interviewer"}
                      </p>
                      {int.specialties && int.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {int.specialties.map((s, idx) => (
                            <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="container max-w-5xl py-16">
        <h2 className="text-3xl font-bold text-center mb-12">{t("mockInterview.howTitle")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 mx-auto">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="absolute top-7 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-[2px] bg-border hidden md:block last:hidden" style={{ display: i === 2 ? "none" : undefined }} />
              <span className="block text-xs font-bold text-primary mb-2">{i + 1}</span>
              <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container max-w-5xl py-16 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t("mockInterview.pricingTitle")}</h2>
          <p className="text-muted-foreground mt-2">{t("mockInterview.pricingSub")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg, i) => {
            const isBest = i === packages.length - 1;
            return (
              <div
                key={pkg.id}
                className={`rounded-2xl p-8 flex flex-col relative transition-all hover:shadow-elegant ${
                  isBest
                    ? "border-2 border-primary/50 bg-card shadow-elegant"
                    : "border bg-card"
                }`}
              >
                {pkg.discount_label && (
                  <span className="absolute -top-3 right-6 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {pkg.discount_label}
                  </span>
                )}
                <h3 className="font-bold text-xl">
                  {pickLocaleField(pkg, "name", locale)}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 flex-grow">
                  {pickLocaleField(pkg, "description", locale)}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(pkg.price_cents)}</span>
                </div>
                {pkg.session_count > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {perSessionPrice(pkg)}{t("mockInterview.perSession")}
                  </p>
                )}
                <Button
                  onClick={() => checkout(pkg)}
                  disabled={!!loading}
                  className={`w-full mt-6 ${isBest ? "gradient-go text-primary-foreground" : ""}`}
                  variant={isBest ? "default" : "outline"}
                >
                  {loading === pkg.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t("mockInterview.buyNow")}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Pagamento seguro via Stripe. Aceitamos cartões nacionais e internacionais.
        </p>
      </section>

      {/* Features */}
      <section className="container max-w-5xl py-16">
        <h2 className="text-3xl font-bold text-center mb-10">{t("mockInterview.featuresTitle")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium mt-1">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container max-w-3xl py-16">
        <h2 className="text-3xl font-bold text-center mb-10">{t("mockInterview.faqTitle")}</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border bg-card">
              <button
                className="w-full flex items-center justify-between p-5 text-left font-medium"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground -mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container max-w-5xl pb-16">
        <div className="rounded-2xl gradient-go text-primary-foreground p-10 md:p-14 text-center shadow-elegant">
          <Video className="h-10 w-10 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("mockInterview.ctaTitle")}</h2>
          <p className="opacity-90 mb-6">{t("mockInterview.ctaSub")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("mockInterview.heroCta")}
            </Button>
            {user && (
              <Button
                size="lg"
                className="border border-white/80 bg-white/20 text-white hover:bg-white/35 hover:text-white font-semibold transition-colors shadow-sm"
                asChild
              >
                <Link href="/mock-interview/book">{t("mockInterview.step2")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

export default function MockInterview() {
  return (
    <Suspense fallback={<div className="container max-w-5xl py-16 text-center text-muted-foreground">...</div>}>
      <Inner />
    </Suspense>
  );
}
