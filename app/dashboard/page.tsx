"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import Link from "next/link";

import { AppLayout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Briefcase, BookOpen, FileText, Sparkles, Gauge, CheckCircle2, Circle, ShieldAlert, Mail,
} from "lucide-react";
import { RequireAuth } from "@/components/Guards";
import { useEngagement } from "@/hooks/useEngagement";
import { XPProgress } from "@/components/XPProgress";
import { StreakCounter } from "@/components/StreakCounter";
import { EngagementCard } from "@/components/EngagementCard";

type LatestAnalysis = {
  id: string;
  partial: any;
  full_report: any;
  created_at: string;
};

function readinessFromProfile(profile: any, analysis: LatestAnalysis | null, t: (key: string) => string) {
  let score = 0;
  const checks: { label: string; done: boolean; href?: string }[] = [];

  // Profile completeness (40 pts)
  const hasJob = !!profile?.current_job_title;
  const hasYears = profile?.years_experience != null;
  const hasStack = (profile?.stack ?? []).length > 0;
  const hasEnglish = !!profile?.english_level;
  const hasSalary = profile?.salary_expectation_usd != null;
  const hasGoals = !!profile?.remote_goals;
  const hasLinks = !!profile?.github_url || !!profile?.linkedin_url;

  const profileChecks = [
    { ok: hasJob, label: t("dashboard.checkJobTitle") },
    { ok: hasYears, label: t("dashboard.checkYears") },
    { ok: hasStack, label: t("dashboard.checkStack") },
    { ok: hasEnglish, label: t("dashboard.checkEnglish") },
    { ok: hasSalary, label: t("dashboard.checkSalary") },
    { ok: hasGoals, label: t("dashboard.checkGoals") },
    { ok: hasLinks, label: t("dashboard.checkLinks") },
  ];
  const filled = profileChecks.filter(c => c.ok).length;
  score += Math.round((filled / profileChecks.length) * 40);

  profileChecks.forEach(c => checks.push({ label: c.label, done: c.ok, href: "/profile" }));

  // Resume analysis (40 pts based on AI overall_score)
  const aiScore = Number(analysis?.partial?.overall_score ?? 0);
  if (analysis) score += Math.round((aiScore / 100) * 40);
  checks.push({
    label: analysis ? t("dashboard.checkResumeDone").replace("{score}", String(aiScore)) : t("dashboard.checkResumeTodo"),
    done: !!analysis,
    href: "/analyze",
  });

  // English signal (20 pts)
  const lvl = profile?.english_level ?? "";
  const englishMap: Record<string, number> = { A1: 4, A2: 8, B1: 12, B2: 16, C1: 19, C2: 20 };
  score += englishMap[lvl] ?? 0;

  return { score: Math.min(score, 100), checks };
}

function Inner() {
  const { profile, user, isPro } = useAuth();
  const { t, locale } = useI18n();
  const { xp, streak, longestStreak, achievements } = useEngagement();
  const [stats, setStats] = useState({ done: 0, total: 0, apps: 0, coverLetters: 0 });
  const [recommended, setRecommended] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<LatestAnalysis | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: total }, { count: done }, { count: apps }, { count: cls }, { data: classes }, { data: latest }] = await Promise.all([
        supabase.from("journey_steps").select("*", { count: "exact", head: true }),
        supabase.from("journey_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("cover_letters" as any).select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("classes").select("id, title_pt, title_en, category, is_pro").limit(3),
        supabase.from("resume_analyses").select("id, partial, full_report, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setStats({ done: done ?? 0, total: total ?? 0, apps: apps ?? 0, coverLetters: cls ?? 0 });
      setRecommended(classes ?? []);
      setAnalysis((latest as any) ?? null);
    })();
  }, [user]);

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const { score, checks } = readinessFromProfile(profile, analysis, t);
  const tier = score >= 80 ? t("dashboard.tierReady") : score >= 50 ? t("dashboard.tierProgress") : t("dashboard.tierStarting");
  const tierColor = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <AppLayout>
      <SEO
        title="Meu Painel | RemoteDevs BR"
        description="Acompanhe seu progresso, streak e análise de currículo no painel do RemoteDevs BR."
        canonicalPath="/dashboard"
      />
      <div className="container py-10 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-muted-foreground text-sm">{t("dashboard.welcome")}</p>
            <h1 className="text-3xl font-bold">{profile?.full_name ?? user?.email}</h1>
          </div>
          <div className="flex items-center gap-4">
            <StreakCounter streak={streak} longestStreak={longestStreak} />
            {!isPro && (
              <Button asChild className="gradient-gold text-gold-foreground"><Link href="/pro"><Sparkles className="h-4 w-4 mr-1" />{t("nav.upgrade")}</Link></Button>
            )}
          </div>
        </div>

        {/* Engagement Nudge */}
        {score < 100 ? (
          <EngagementCard
            id="complete-profile"
            title={t("dashboard.nudgeIncompleteTitle")}
            description={t("dashboard.nudgeIncompleteDesc")}
            actionText={t("dashboard.nudgeIncompleteAction")}
            actionUrl="/profile"
            variant="primary"
          />
        ) : (
          <EngagementCard
            id="apply-jobs"
            title={t("dashboard.nudgeReadyTitle")}
            description={t("dashboard.nudgeReadyDesc")}
            actionText={t("dashboard.nudgeReadyAction")}
            actionUrl="/jobs"
            variant="success"
          />
        )}

        {/* XP Progress Bar */}
        <div className="rounded-xl border bg-card p-6">
          <XPProgress xp={xp} showDetails={true} />
        </div>

        {/* Remote Readiness Dashboard */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" /> {t("dashboard.readiness")}
          </div>
          <div className="mt-2 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-5xl md:text-6xl font-bold">{score}<span className="text-2xl text-muted-foreground">/100</span></div>
              <div className={`text-sm font-semibold mt-1 ${tierColor}`}>{tier}</div>
            </div>
            {!analysis && (
              <Button asChild className="gradient-go text-primary-foreground">
                <Link href="/analyze"><Sparkles className="h-4 w-4" /> {t("dashboard.analyzeResume")}</Link>
              </Button>
            )}
          </div>
          <Progress value={score} className="mt-5" />

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mt-6">
            {checks.map((c, i) => (
              <Link key={i} href={c.href ?? "#"} className="flex items-center gap-2 text-sm py-1 rounded hover:bg-muted px-2 -mx-2 transition">
                {c.done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={c.done ? "" : "text-muted-foreground"}>{c.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest analysis snapshot */}
        {analysis && (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">{t("dashboard.lastAnalysis")}</h3>
                <p className="text-xs text-muted-foreground">{new Date(analysis.created_at).toLocaleDateString()}</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link href="/analyze">{t("dashboard.newAnalysis")} <ArrowRight className="h-3 w-3" /></Link></Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">{t("dashboard.topStrengths")}</div>
                <ul className="mt-1 space-y-1 list-disc pl-4">
                  {(analysis.partial?.top_strengths ?? []).slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-muted-foreground text-xs flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> {t("dashboard.topGaps")}</div>
                <ul className="mt-1 space-y-1 list-disc pl-4">
                  {(analysis.partial?.top_gaps ?? []).slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">{t("dashboard.suggestedRoles")}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(analysis.partial?.suggested_roles ?? []).map((r: string, i: number) =>
                    <span key={i} className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{r}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /> {t("dashboard.progress")}</div>
            <div className="mt-2 text-3xl font-bold">{pct}%</div>
            <Progress value={pct} className="mt-3" />
            <Button asChild variant="link" size="sm" className="px-0 mt-2"><Link href="/journey">{t("common.viewAll")} <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="h-4 w-4" /> {t("dashboard.applications")}</div>
            <div className="mt-2 text-3xl font-bold">{stats.apps}</div>
            <Button asChild variant="link" size="sm" className="px-0 mt-2"><Link href="/applications">{t("common.viewAll")} <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /> {t("dashboard.resumeCard")}</div>
            <div className="mt-2 text-3xl font-bold">AI</div>
            <Button asChild variant="link" size="sm" className="px-0 mt-2"><Link href="/tools/resume">{t("resume.title")} <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> {t("coverLetter.title")}</div>
            <div className="mt-2 text-3xl font-bold">{stats.coverLetters}</div>
            <Button asChild variant="link" size="sm" className="px-0 mt-2"><Link href="/tools/cover-letter">{t("common.viewAll")} <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3">{t("dashboard.recommended")}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {recommended.map(c => (
              <Link key={c.id} href="/classes" className="rounded-xl border bg-card p-5 hover:border-primary/50 transition">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.category}</div>
                <div className="font-semibold mt-1">{pickLocaleField(c, "title", locale)}</div>
                {c.is_pro && <span className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 gradient-gold text-gold-foreground mt-2 inline-block">PRO</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function Dashboard() {
  return <RequireAuth><Inner /></RequireAuth>;
}
