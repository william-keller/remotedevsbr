"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  GraduationCap,
  Mic2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  ENGLISH_PRICING,
  ENGLISH_SCHEDULE,
  ENGLISH_BRAND,
  englishTotal,
  penaltyPerMonth,
  cancellationPenalty,
  type EnglishInterest,
} from "@/lib/english/config";
import { brl } from "@/lib/english/format";
import { trackEnglishPlanClick } from "@/lib/track";

function SectionHeader({
  kicker,
  title,
  sub,
  center = true,
}: {
  kicker: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
      {sub ? <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function CareerScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-border"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="currentColor"
          fill="none"
          className="text-gold transition-all duration-700"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          /100
        </span>
      </div>
    </div>
  );
}

export function Hero({ onCta }: { onCta: (i: EnglishInterest) => void }) {
  const { t } = useI18n();
  const chips = [
    { icon: CalendarDays, label: t("english.hero.chipLive") },
    { icon: Users, label: t("english.hero.chipGroup") },
    { icon: GlobeIcon, label: t("english.hero.chipOnline") },
  ];
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
      <div className="container relative max-w-6xl py-14 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              {t("english.hero.kicker")}
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] md:text-5xl">{t("english.hero.title")}</h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              {t("english.hero.sub")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              {chips.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <c.icon className="h-4 w-4 text-primary" />
                  {c.label}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                size="lg"
                className="w-full gradient-gold text-gold-foreground text-base px-8 sm:w-auto"
                onClick={() => onCta("career")}
              >
                {t("english.hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full text-base px-8 sm:w-auto">
                <a href="#differentials">{t("english.hero.ctaSecondary")}</a>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md" aria-hidden>
            <div className="relative rounded-2xl border border-border bg-card p-5 shadow-elegant">
              <div className="absolute -inset-3 -z-10 rounded-2xl bg-gold/10 blur-2xl" />
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <div className="text-sm font-semibold">{t("english.hero.visualLive")}</div>
                <div className="ml-auto text-xs text-muted-foreground">{t("english.hero.visualTrack")}</div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted p-3 text-sm text-muted-foreground">
                  &ldquo;Okay team, quick standup. What did you ship yesterday?&rdquo;
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-primary/10 p-3 text-sm">
                  &ldquo;I finished the auth refactor. Tomorrow I will start the rate limit.&rdquo;
                  <div className="mt-1 text-[11px] font-medium text-primary">{t("english.ai.you")}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
                <CareerScoreRing score={62} size={72} />
                <div>
                  <div className="text-sm font-semibold">{t("english.hero.visualScoreLabel")}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("english.hero.visualAi")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PainPoints() {
  const { t } = useI18n();
  const quotes = [
    t("english.pain.q1"),
    t("english.pain.q2"),
    t("english.pain.q3"),
    t("english.pain.q4"),
    t("english.pain.q5"),
  ];
  return (
    <section id="pain" className="border-y bg-muted/30 py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-3xl">
        <SectionHeader kicker={t("english.pain.kicker")} title={t("english.pain.title")} />
        <div className="mt-10 space-y-3">
          {quotes.map((q, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="mt-0.5 text-lg text-muted-foreground">“</span>
              <p className="text-base leading-relaxed text-foreground/90">{q}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-lg font-semibold text-primary">
          {t("english.pain.resolve")}
        </p>
      </div>
    </section>
  );
}

export function Differentials() {
  const { t } = useI18n();
  const items = [
    { icon: Mic2, title: t("english.diff1.title"), desc: t("english.diff1.desc") },
    { icon: Users, title: t("english.diff2.title"), desc: t("english.diff2.desc") },
    { icon: Bot, title: t("english.diff3.title"), desc: t("english.diff3.desc") },
    { icon: Target, title: t("english.diff4.title"), desc: t("english.diff4.desc") },
    { icon: Activity, title: t("english.diff5.title"), desc: t("english.diff5.desc") },
    { icon: GlobeIcon, title: t("english.diff6.title"), desc: t("english.diff6.desc") },
  ];
  return (
    <section id="differentials" className="py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-6xl">
        <SectionHeader kicker={t("english.diff.kicker")} title={t("english.diff.title")} sub={t("english.diff.sub")} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-elegant"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CareerScore() {
  const { t } = useI18n();
  const subscores = [
    { key: "english.score.s1", value: 58 },
    { key: "english.score.s2", value: 66 },
    { key: "english.score.s3", value: 72 },
    { key: "english.score.s4", value: 55 },
    { key: "english.score.s5", value: 49 },
    { key: "english.score.s6", value: 63 },
    { key: "english.score.s7", value: 61 },
  ];
  const steps = [62, 71, 79, 86];
  return (
    <section id="score" className="border-y bg-muted/30 py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-6xl">
        <SectionHeader kicker={t("english.score.kicker")} title={t("english.score.title")} sub={t("english.score.sub")} />
        <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t("english.score.current")}</p>
            <div className="mt-4 flex justify-center text-gold">
              <CareerScoreRing score={62} size={160} />
            </div>
            <div className="mt-8 space-y-3 text-left">
              {subscores.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t(s.key)}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-gradient-gold"
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("english.score.progress")}</p>
            <div className="mt-6 space-y-3">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
                >
                  <span className="text-2xl font-bold text-gold">{step}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-gradient-go"
                        style={{ width: `${step}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {i === 0 ? "→" : i < steps.length - 1 ? `+${steps[i + 1] - step}` : "★"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-gold/25 bg-gold/10 p-4 text-sm leading-relaxed text-muted-foreground">
              {t("english.score.progressNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AiPractice() {
  const { t } = useI18n();
  const prompts = [
    { role: "you" as const, text: t("english.ai.p1") },
    { role: "ai" as const, text: t("english.ai.p2") },
    { role: "you" as const, text: t("english.ai.p3") },
    { role: "ai" as const, text: t("english.ai.p4") },
    { role: "you" as const, text: t("english.ai.p5") },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-4xl">
        <SectionHeader kicker={t("english.ai.kicker")} title={t("english.ai.title")} sub={t("english.ai.sub")} />
        <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("english.ai.examples")}
        </p>
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-border bg-card p-5 shadow-elegant">
          {prompts.map((p, i) => (
            <div
              key={i}
              className={`mb-3 flex gap-3 ${p.role === "you" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  p.role === "you" ? "bg-primary/15 text-primary" : "bg-gold/15 text-gold"
                }`}
              >
                {p.role === "you" ? t("english.ai.you").slice(0, 1) : t("english.ai.ia").slice(0, 1)}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  p.role === "you"
                    ? "rounded-tr-md bg-primary/10"
                    : "rounded-tl-md bg-muted text-muted-foreground"
                }`}
              >
                {p.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Missions() {
  const { t } = useI18n();
  const missions = [
    t("english.missions.1"),
    t("english.missions.2"),
    t("english.missions.3"),
    t("english.missions.4"),
    t("english.missions.5"),
  ];
  return (
    <section className="border-y bg-muted/30 py-16 md:py-24">
      <div className="container max-w-6xl">
        <SectionHeader kicker={t("english.missions.kicker")} title={t("english.missions.title")} />
        <p className="mt-6 text-center text-lg text-primary">{t("english.missions.tagline")}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {missions.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-sm font-bold text-gold">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Career Mission
                </span>
              </div>
              <p className="mt-3 text-base leading-relaxed text-foreground/90">{m}</p>
            </div>
          ))}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 p-5 text-center">
            <p className="text-sm font-medium text-gold">{ENGLISH_BRAND.programName}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Plans({ onCta }: { onCta: (i: EnglishInterest) => void }) {
  const { t } = useI18n();
  const c = ENGLISH_PRICING;

  const handleCta = (plan: string, interest: EnglishInterest) => {
    trackEnglishPlanClick(plan);
    onCta(interest);
  };

  const startFeatures = [
    t("english.plan.start.f1"),
    t("english.plan.start.f2"),
    t("english.plan.start.f3"),
    t("english.plan.start.f4"),
    t("english.plan.start.f5"),
    t("english.plan.start.f6"),
    t("english.plan.start.f7"),
    t("english.plan.start.f8"),
  ];
  const careerExtra = [
    t("english.plan.career.f1"),
    t("english.plan.career.f2"),
    t("english.plan.career.f3"),
    t("english.plan.career.f4"),
    t("english.plan.career.f5"),
    t("english.plan.career.f6"),
    t("english.plan.career.f7"),
    t("english.plan.career.f8"),
  ];
  const globalExtra = [
    t("english.plan.global.f1"),
    t("english.plan.global.f2"),
    t("english.plan.global.f3"),
    t("english.plan.global.f4"),
    t("english.plan.global.f5"),
    t("english.plan.global.f6"),
  ];

  const startCard = (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("english.plan.start.name")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("english.plan.start.tagline")}</p>
      <div className="mt-5">
        <span className="text-4xl font-bold tracking-tight text-foreground">{brl(c.start.monthly)}</span>
        <span className="text-sm text-muted-foreground">{t("english.plan.monthlySuffix")}</span>
      </div>
      <ul className="mt-6 space-y-2.5 text-sm">
        {startFeatures.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Button variant="outline" className="w-full" onClick={() => handleCta("start", "start")}>
          {t("english.plan.cta.start")}
        </Button>
      </div>
    </div>
  );

  const careerCard = (
    <div className="relative flex h-full flex-col rounded-2xl border-2 border-gold/60 bg-card p-7 shadow-elegant">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-gold px-4 py-1 text-xs font-bold text-gold-foreground">
        {t("english.plan.career.badge")}
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
        {t("english.plan.career.name")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("english.plan.career.tagline")}</p>
      <div className="mt-5">
        <span className="text-5xl font-bold tracking-tight text-gold">{brl(c.career.firstInstallment)}</span>
        <div className="text-sm text-muted-foreground">{t("english.plan.career.firstLabel")}</div>
        <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm font-medium">
          + 11x {brl(c.career.monthlyInstallment)}
          <span className="text-muted-foreground">{t("english.plan.monthlySuffix")}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {t("english.plan.career.totalLabel")}:{" "}
          <span className="font-semibold text-foreground">{brl(englishTotal())}</span>
        </div>
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("english.plan.career.everything")}
      </p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {careerExtra.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Button
          size="lg"
          className="w-full gradient-gold text-gold-foreground"
          onClick={() => handleCta("career", "career")}
        >
          {t("english.plan.cta.career")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const globalCard = (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("english.plan.global.name")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("english.plan.global.tagline")}</p>
      <div className="mt-5">
        <span className="text-4xl font-bold tracking-tight text-foreground">{brl(c.global.monthly)}</span>
        <span className="text-sm text-muted-foreground">{t("english.plan.monthlySuffix")}</span>
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("english.plan.global.everything")}
      </p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {globalExtra.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Button variant="outline" className="w-full" onClick={() => handleCta("global", "global")}>
          {t("english.plan.cta.global")}
        </Button>
      </div>
    </div>
  );

  return (
    <section id="plans" className="py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-6xl">
        <SectionHeader kicker={t("english.plans.kicker")} title={t("english.plans.title")} sub={t("english.plans.sub")} />

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
          <div className="lg:order-1">{startCard}</div>
          <div className="lg:order-2 lg:-translate-y-2">{careerCard}</div>
          <div className="lg:order-3">{globalCard}</div>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center md:p-10">
          <GraduationCap className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-3 text-xl font-bold md:text-2xl">{t("english.plan.team.title")}</h3>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t("english.plan.team.sub")}</p>
          <Button size="lg" className="mt-6" onClick={() => handleCta("team", "team")}>
            {t("english.plan.team.cta")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function TrackCard({ label }: { label: string }) {
  const { t } = useI18n();
  const groups = [
    { period: t("english.schedule.morning"), slots: ENGLISH_SCHEDULE.slots.morning },
    { period: t("english.schedule.afternoon"), slots: ENGLISH_SCHEDULE.slots.afternoon },
    { period: t("english.schedule.evening"), slots: ENGLISH_SCHEDULE.slots.evening },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{label}</h3>
      </div>
      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <div key={g.period}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.period}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.slots.map((slot) => (
                <span
                  key={slot}
                  className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Schedule() {
  const { t } = useI18n();
  return (
    <section id="schedule" className="border-y bg-muted/30 py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-5xl">
        <SectionHeader kicker={t("english.schedule.kicker")} title={t("english.schedule.title")} sub={t("english.schedule.sub")} />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <TrackCard label={t("english.schedule.trackA")} />
          <TrackCard label={t("english.schedule.trackB")} />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{t("english.schedule.trackNote")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {t("english.schedule.duration")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            {t("english.schedule.frequency")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {t("english.schedule.maxGroup")}
          </span>
        </div>
      </div>
    </section>
  );
}

export function Squad({ onCta }: { onCta: (i: EnglishInterest) => void }) {
  const { t } = useI18n();
  const items = [
    t("english.squad.i1"),
    t("english.squad.i2"),
    t("english.squad.i3"),
    t("english.squad.i4"),
    t("english.squad.i5"),
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-5xl">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              {t("english.squad.kicker")}
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{t("english.squad.title")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t("english.squad.sub")}</p>
            <Button size="lg" className="mt-8 gradient-gold text-gold-foreground" onClick={() => onCta("squad")}>
              {t("english.squad.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-4 w-4" />
                </span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Flexibility() {
  const { t } = useI18n();
  const c = ENGLISH_PRICING.career;
  return (
    <section className="border-y bg-muted/30 py-16 md:py-24">
      <div className="container max-w-5xl">
        <SectionHeader kicker={t("english.flex.kicker")} title={t("english.flex.title")} sub={t("english.flex.sub")} />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">{t("english.flex.pauseTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("english.flex.pauseCopy")}</p>
            <p className="mt-4 rounded-lg border border-gold/25 bg-gold/10 p-3 text-xs leading-relaxed text-muted-foreground">
              {t("english.flex.pauseProposal")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-7">
            <h3 className="text-xl font-semibold">{t("english.flex.cancelTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("english.flex.cancelIntro")}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{t("english.flex.cancelPromoLabel")}</p>
                <p className="mt-1 text-xl font-bold text-gold">{brl(c.firstInstallment)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{t("english.flex.cancelRefLabel")}</p>
                <p className="mt-1 text-xl font-bold">{brl(c.monthlyInstallment)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-sm">
              <p className="text-muted-foreground">{t("english.flex.cancelRef")}</p>
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{t("english.flex.cancelPerMonth")}</span>
                <span className="font-semibold">{brl(penaltyPerMonth())}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">{t("english.flex.cancelEx1")}</p>
                <p className="mt-1 text-muted-foreground">{t("english.flex.cancelEx1Detail")}</p>
                <p className="mt-2 font-semibold text-gold">
                  {brl(penaltyPerMonth())} x 8 = {brl(cancellationPenalty(8))}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold">{t("english.flex.cancelEx2")}</p>
                <p className="mt-1 text-muted-foreground">{t("english.flex.cancelEx2Detail")}</p>
                <p className="mt-2 font-semibold text-primary">{brl(cancellationPenalty(0))}</p>
              </div>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="h-4 w-4" />
              {t("english.flex.noSurprise")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Comparison() {
  const { t } = useI18n();
  const rows = [
    { left: t("english.compare.r1"), right: t("english.compare.r1p") },
    { left: t("english.compare.r2"), right: t("english.compare.r2p") },
    { left: t("english.compare.r3"), right: t("english.compare.r3p") },
    { left: t("english.compare.r4"), right: t("english.compare.r4p") },
    { left: t("english.compare.r5"), right: t("english.compare.r5p") },
    { left: t("english.compare.r6"), right: t("english.compare.r6p") },
  ];
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-4xl">
        <SectionHeader kicker={t("english.compare.kicker")} title={t("english.compare.title")} sub={t("english.compare.sub")} />
        <div className="mt-12 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-2 bg-muted/60 text-sm font-semibold">
            <div className="p-4">{t("english.compare.school")}</div>
            <div className="p-4 text-gold">{t("english.compare.program")}</div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={`grid grid-cols-2 text-sm ${i % 2 === 1 ? "bg-muted/30" : "bg-card"}`}>
              <div className="p-4 text-muted-foreground">{r.left}</div>
              <div className="flex items-center gap-2 p-4 font-medium">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {r.right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = Array.from({ length: 12 }, (_, i) => ({
    q: t(`english.faq${i + 1}q`),
    a: t(`english.faq${i + 1}a`),
  }));
  return (
    <section id="faq" className="border-y bg-muted/30 py-16 md:py-24 scroll-mt-16">
      <div className="container max-w-3xl">
        <SectionHeader kicker="FAQ" title={t("english.faq.title")} />
        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border bg-card">
              <button
                className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="-mt-1 px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ onCta }: { onCta: (i: EnglishInterest) => void }) {
  const { t } = useI18n();
  const c = ENGLISH_PRICING.career;
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-10 text-center shadow-elegant md:p-14">
          <Brain className="mx-auto mb-4 h-10 w-10 text-primary-foreground opacity-90" />
          <h2 className="mx-auto max-w-2xl text-2xl font-bold leading-tight text-primary-foreground md:text-4xl">
            {t("english.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground opacity-90">
            {t("english.cta.sub")}
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 text-base"
            onClick={() => onCta("career")}
          >
            {t("english.cta.btn")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-4 text-sm font-semibold text-primary-foreground/90">
            {brl(c.firstInstallment)} + 11x {brl(c.monthlyInstallment)}
            <span className="text-primary-foreground/70">{t("english.plan.monthlySuffix")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Testimonials ship empty on purpose: we never invent social proof. Until real
// happy students exist, the section renders nothing.
export const Testimonials = () => null;