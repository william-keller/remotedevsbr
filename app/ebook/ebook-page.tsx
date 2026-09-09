"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Lock,
  Network,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

const EBOOK_URLS = {
  pt: "/ebook/download/pt",
  en: "/ebook/download/en",
  previewPt:
    process.env.NEXT_PUBLIC_EBOOK_PREVIEW_URL_PT ||
    "/ebook/LinkedIn_Performance_Playbook_pt-BR_Preview.pdf",
  previewEn:
    process.env.NEXT_PUBLIC_EBOOK_PREVIEW_URL_EN ||
    "/ebook/LinkedIn_Performance_Playbook_Preview.pdf",
};

type Currency = "brl" | "usd";

type SalesSummary = {
  total_copies: number;
  today_copies: number;
  total_brl_cents: number;
  total_usd_cents: number;
  today_brl_cents: number;
  today_usd_cents: number;
};

function formatSalesMoney(brlCents: number, usdCents: number): string {
  const parts: string[] = [];
  if (brlCents > 0) {
    parts.push(`R$ ${(brlCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  if (usdCents > 0) {
    parts.push(`US$ ${Math.round(usdCents / 100).toLocaleString("en-US")}`);
  }
  return parts.length > 0 ? parts.join(" + ") : "R$ 0,00";
}

function SalesCounter({
  sales,
  t,
  locale,
}: {
  sales: SalesSummary | null;
  t: (key: string) => string;
  locale: string;
}) {
  if (!sales) return null;
  const fmt = (n: number) => n.toLocaleString(locale === "pt" ? "pt-BR" : "en-US");
  return (
    <p className="text-xs text-muted-foreground">
      {fmt(sales.total_copies)} {t("ebook.copiesSold")} ({formatSalesMoney(sales.total_brl_cents, sales.total_usd_cents)}).{" "}
      {fmt(sales.today_copies)} {t("ebook.soldToday")} ({formatSalesMoney(sales.today_brl_cents, sales.today_usd_cents)}).
    </p>
  );
}

function Inner() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [currency, setCurrency] = useState<Currency>(locale === "pt" ? "brl" : "usd");
  const [loading, setLoading] = useState(false);
  const [openChapter, setOpenChapter] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [paid, setPaid] = useState(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("ebook_paid")) return true;
    return params.get("success") === "1";
  });
  const [sales, setSales] = useState<SalesSummary | null>(null);

  useEffect(() => {
    if (params.get("success")) {
      window.sessionStorage.setItem("ebook_paid", "1");
      toast.success(t("ebook.paymentSuccess"));
      router.replace(pathname);
    } else if (params.get("canceled")) {
      toast.info(t("ebook.paymentCanceled"));
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_ebook_sales_summary" as never);
      if (!cancelled && !error && data) setSales(data as unknown as SalesSummary);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatPrice = (c: Currency) => (c === "brl" ? "R$ 67,90" : "US$ 19");

  const checkout = async (c: Currency) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebook-checkout", {
        body: { currency: c },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error ?? "No checkout URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("ebook.checkoutError"));
      setLoading(false);
    }
  };

  const dismissDownload = () => {
    window.sessionStorage.removeItem("ebook_paid");
    setPaid(false);
  };

  const previewUrl = locale === "pt" ? EBOOK_URLS.previewPt : EBOOK_URLS.previewEn;

  const chapters = [
    { title: t("ebook.ch1Title"), preview: t("ebook.ch1Preview"), bonus: false },
    { title: t("ebook.ch2Title"), preview: t("ebook.ch2Preview"), bonus: false },
    { title: t("ebook.ch3Title"), preview: t("ebook.ch3Preview"), bonus: false },
    { title: t("ebook.ch4Title"), preview: t("ebook.ch4Preview"), bonus: false },
    { title: t("ebook.ch5Title"), preview: t("ebook.ch5Preview"), bonus: false },
    { title: t("ebook.ch6Title"), preview: t("ebook.ch6Preview"), bonus: false },
    { title: t("ebook.ch7Title"), preview: t("ebook.ch7Preview"), bonus: false },
    { title: t("ebook.ch8Title"), preview: t("ebook.ch8Preview"), bonus: true },
  ];

  const learn = [
    { icon: Search, title: t("ebook.learn1T"), desc: t("ebook.learn1D") },
    { icon: Zap, title: t("ebook.learn2T"), desc: t("ebook.learn2D") },
    { icon: TrendingUp, title: t("ebook.learn3T"), desc: t("ebook.learn3D") },
    { icon: Network, title: t("ebook.learn4T"), desc: t("ebook.learn4D") },
  ];

  const faqs = [
    { q: t("ebook.faq1q"), a: t("ebook.faq1a") },
    { q: t("ebook.faq2q"), a: t("ebook.faq2a") },
    { q: t("ebook.faq3q"), a: t("ebook.faq3a") },
    { q: t("ebook.faq4q"), a: t("ebook.faq4a") },
  ];

  const currencyTabs: { value: Currency; label: string }[] = [
    { value: "brl", label: "R$ BRL" },
    { value: "usd", label: "US$ USD" },
  ];

  return (
    <AppLayout>
      {/* Download panel shown after payment */}
      {paid && (
        <section className="border-b bg-gold/5">
          <div className="container max-w-5xl py-10">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t("ebook.successTitle")}</h2>
                  <p className="text-muted-foreground mt-1">{t("ebook.successSub")}</p>
                </div>
              </div>
              <button
                onClick={dismissDownload}
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                OK
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button asChild size="lg" className="gradient-go text-primary-foreground">
                <a href={EBOOK_URLS.pt}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("ebook.successPt")}
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={EBOOK_URLS.en}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("ebook.successEn")}
                </a>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        <div className="container relative max-w-6xl py-16 md:py-24">
          <div className="grid md:grid-cols-[auto_1fr] items-center gap-14 lg:gap-20">
            {/* Book cover */}
            <div className="flex justify-center md:justify-start">
              <div
                aria-hidden
                className="absolute h-72 w-72 rounded-full bg-gold/10 blur-3xl md:hidden"
              />
              <div className="relative w-[230px] sm:w-[270px] lg:w-[310px] shrink-0 [transform:perspective(1200px)_rotateY(-7deg)] motion-reduce:[transform:none] transition-transform duration-300 hover:[transform:perspective(1200px)_rotateY(-2deg)]">
                <div
                  aria-hidden
                  className="absolute -inset-5 rounded-2xl bg-gold/10 blur-2xl"
                />
                <div className="relative flex aspect-[1241/1754] flex-col justify-between overflow-hidden rounded-r-xl rounded-l-sm border border-gold/30 bg-[#0b1220] p-6 pt-10 shadow-elegant">
                  <div
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-2 bg-black/40"
                  />
                  <div
                    aria-hidden
                    className="absolute top-0 inset-x-0 h-1 bg-gradient-gold"
                  />
                  <div className="relative">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-white/70">
                      {t("ebook.author")}
                    </p>
                    <div className="mt-12">
                      <p className="text-xs font-bold tracking-[0.3em] text-gold">
                        LinkedIn
                      </p>
                      <h2 className="mt-1 text-3xl font-bold leading-[1.05] text-white">
                        Performance
                        <br />
                        Playbook
                      </h2>
                    </div>
                  </div>
                  <div className="relative">
                    <p className="text-sm leading-snug text-white/85">
                      {t("ebook.coverTagline")}
                    </p>
                    <p className="mt-6 text-[11px] leading-relaxed text-white/55">
                      {t("ebook.coverFor")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold leading-[1.05]">
                {t("ebook.heroTitle")}
              </h1>
              <p className="mx-auto md:mx-0 mt-5 max-w-xl text-lg md:text-xl leading-relaxed text-muted-foreground">
                {t("ebook.heroSub")}
              </p>

              <div className="mt-4 text-sm text-muted-foreground">
                {t("ebook.author")}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-3">
                <Button
                  size="lg"
                  onClick={() => checkout(currency)}
                  disabled={loading}
                  className="w-full sm:w-auto gradient-gold text-gold-foreground text-base px-8"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BookOpen className="h-4 w-4 mr-2" />
                  )}
                  {t("ebook.buyCta")} {formatPrice(currency)}
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                  <a href={previewUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    {t("ebook.previewCta")}
                  </a>
                </Button>
              </div>

              <p className="mt-5 flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {t("ebook.bothVersions")}
              </p>
              <div className="mt-3 flex justify-center md:justify-start">
                <SalesCounter sales={sales} t={t} locale={locale} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="container max-w-3xl py-16 md:py-20">
        <h2 className="text-3xl font-bold">{t("ebook.chaptersTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("ebook.chaptersSub")}</p>
        <div className="mt-8 space-y-3">
          {chapters.map((c, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card">
              <button
                onClick={() => setOpenChapter(openChapter === i ? null : i)}
                aria-expanded={openChapter === i}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <span
                  className={`w-14 shrink-0 text-xs font-bold ${
                    c.bonus ? "text-gold" : "text-muted-foreground"
                  }`}
                >
                  {c.bonus ? t("ebook.bonus") : `${t("ebook.chapter")} ${i + 1}`}
                </span>
                <span className="flex-1 text-base font-semibold">{c.title}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    openChapter === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openChapter === i && (
                <div className="px-5 pb-5 pl-[4.5rem] text-sm leading-relaxed text-muted-foreground">
                  {c.preview}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* What you'll learn */}
      <section className="border-y bg-muted/30 py-16 md:py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center">{t("ebook.learnTitle")}</h2>
          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {learn.map((l, i) => (
              <div key={i} className="flex items-start gap-4 text-center sm:text-left">
                <div className="mx-auto sm:mx-0 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <l.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold leading-snug">{l.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {l.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container max-w-3xl py-16 md:py-20 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{t("ebook.priceTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("ebook.priceSub")}</p>
        </div>

        <div className="mx-auto max-w-md rounded-2xl border-2 border-gold/40 bg-card p-8 md:p-10 text-center shadow-elegant">
          <p className="text-sm font-semibold text-muted-foreground">
            {t("ebook.chooseCurrency")}
          </p>

          <div className="mt-4 inline-flex gap-1 rounded-full border bg-muted p-1">
            {currencyTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={currency === tab.value}
                onClick={() => setCurrency(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  currency === tab.value
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-7">
            <span className="text-5xl md:text-6xl font-bold tracking-tight text-gold">
              {formatPrice(currency)}
            </span>
          </div>

          <ul className="mx-auto mt-7 max-w-xs space-y-2 text-left">
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {t("ebook.priceInclude1")}
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {t("ebook.priceInclude2")}
            </li>
          </ul>

          <Button
            size="lg"
            onClick={() => checkout(currency)}
            disabled={loading}
            className="mt-7 w-full gradient-gold text-gold-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {t("ebook.priceBtn")}
          </Button>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("ebook.stripeNote")}
          </p>
          <div className="mt-3 flex justify-center">
            <SalesCounter sales={sales} t={t} locale={locale} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container max-w-3xl pb-16">
        <h2 className="mb-10 text-3xl font-bold text-center">{t("ebook.faqTitle")}</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border bg-card">
              <button
                className="flex w-full items-center justify-between p-5 text-left font-medium"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="-mt-1 px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container max-w-3xl pb-20">
        <div className="rounded-2xl gradient-go p-10 text-center shadow-elegant md:p-14">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-primary-foreground opacity-90" />
          <h2 className="mb-3 text-2xl font-bold text-primary-foreground md:text-3xl">
            {t("ebook.ctaTitle")}
          </h2>
          <p className="mx-auto mb-6 max-w-md text-primary-foreground opacity-90">
            {t("ebook.ctaSub")}
          </p>
          <Button size="lg" variant="secondary" onClick={() => checkout(currency)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("ebook.ctaBtn")}
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}

function LoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="container max-w-5xl py-16 text-center text-muted-foreground">
      {t("common.loading")}
    </div>
  );
}

export function EbookPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Inner />
    </Suspense>
  );
}