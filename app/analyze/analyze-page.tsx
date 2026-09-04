"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { AppLayout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { JsonLd } from "@/components/JsonLd";
import {
  Upload, Sparkles, Loader2, Lock, CheckCircle2, AlertTriangle, ArrowRight, FileText,
  Target, Search, Layout, TrendingUp, Languages, Calendar, Zap, Check, Mail,
} from "lucide-react";

const ANALYZE_PREFILL_KEY = "rdbr_analyze_prefill";

type CategoryScore = { id: string; score: number; tip?: string };

type Partial = {
  overall_score?: number;
  english_signal?: "low" | "medium" | "high";
  seniority_guess?: string;
  top_strengths?: string[];
  top_gaps?: string[];
  suggested_roles?: string[];
  detected_stack?: string[];
  category_scores?: CategoryScore[];
  quick_win?: string;
  target_role?: string;
};

type Full = {
  ats_score?: number;
  readiness_summary?: string;
  bullet_rewrites?: { original: string; improved: string }[];
  missing_keywords?: string[];
  english_recommendations?: string[];
  ["30_day_plan"]?: string[];
  risk_flags?: string[];
  formatting_issues?: string[];
  role_fit_summary?: string;
  category_scores?: CategoryScore[];
};

const FAQ_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
const FEATURE_ICONS = [Target, Search, Layout, TrendingUp, Languages, Calendar] as const;
const FEATURE_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
const STEP_KEYS = ["1", "2", "3"] as const;
const CAT_IDS = ["ats", "keywords", "formatting", "impact", "english", "role_fit"] as const;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function CategoryScoresGrid({
  scores,
  labelKey,
}: {
  scores: CategoryScore[];
  labelKey: (id: string) => string;
}) {
  const ordered = CAT_IDS.map((id) => scores.find((c) => c.id === id)).filter(Boolean) as CategoryScore[];
  const list = ordered.length ? ordered : scores;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {list.map((c) => (
        <div key={c.id} className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium">{labelKey(c.id)}</span>
            <span className="text-lg font-bold tabular-nums">{c.score}</span>
          </div>
          <Progress value={c.score} className="h-1.5" />
          {c.tip ? <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.tip}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function AnalyzeResume() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetRole, setTargetRole] = useState("");
  const [pasted, setPasted] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [partial, setPartial] = useState<Partial | null>(null);
  const [email, setEmail] = useState("");
  const [full, setFull] = useState<Full | null>(null);

  const catLabel = useCallback(
    (id: string) => t(`analyze.cat.${id}` as "analyze.cat.ats"),
    [t],
  );

  const faqStructured = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_KEYS.map((n) => ({
        "@type": "Question",
        name: t(`analyze.faq${n}q`),
        acceptedAnswer: { "@type": "Answer", text: t(`analyze.faq${n}a`) },
      })),
    }),
    [t],
  );

  const webAppStructured = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "RemoteDevs BR ATS Resume Checker",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: t("analyze.seoDesc"),
      url: "https://remotedevsbr.com/analyze",
    }),
    [t],
  );

  const analyze = async (file?: File) => {
    setAnalyzing(true);
    setFull(null);
    setPartial(null);
    setId(null);
    try {
      const body: Record<string, unknown> = {
        action: "analyze",
        user_id: user?.id ?? null,
        target_role: targetRole.trim() || null,
        locale,
      };
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Max 10MB");
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && ext !== "pdf") {
          throw new Error(t("analyze.faq3a"));
        }
        body.file_base64 = await fileToBase64(file);
        body.file_name = file.name;
      } else {
        if (pasted.trim().length < 80) throw new Error(t("analyze.pastePlaceholder"));
        body.resume_text = pasted.trim();
      }
      const { data, error } = await supabase.functions.invoke("analyze-resume", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setId(data.id);
      setPartial(data.partial);
      try {
        const prefill: { target_role?: string; resume_text?: string } = {};
        const role = targetRole.trim() || data.partial?.target_role;
        if (role) prefill.target_role = role;
        if (pasted.trim().length >= 80) prefill.resume_text = pasted.trim();
        if (prefill.target_role || prefill.resume_text) {
          sessionStorage.setItem(ANALYZE_PREFILL_KEY, JSON.stringify(prefill));
        }
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
      setDragOver(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) analyze(f);
  };

  const unlock = async () => {
    if (!id) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(t("auth.email"));
      return;
    }
    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { action: "unlock", id, email, locale },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFull(data.full);
      toast.success(t("analyze.unlockCta"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setUnlocking(false);
    }
  };

  const score = partial?.overall_score ?? 0;
  const englishColor =
    partial?.english_signal === "high"
      ? "text-emerald-500"
      : partial?.english_signal === "medium"
        ? "text-amber-500"
        : "text-red-500";

  const displayCategories = full?.category_scores?.length
    ? full.category_scores
    : partial?.category_scores;

  const uploadZone = (
    <div
      className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) analyze(f);
        }}
      />
      <div className="flex flex-col items-center text-center gap-3">
        <Upload className="h-8 w-8 text-primary" />
        <p className="font-medium">{t("analyze.dropHint")}</p>
        <p className="text-xs text-muted-foreground max-w-sm">{t("analyze.uploadHint")}</p>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          className="gradient-go text-primary-foreground"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> {t("analyze.uploadCta")}</>}
        </Button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <JsonLd data={[webAppStructured, faqStructured]} />

      <article className="container max-w-4xl py-12">
        <header>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold mb-4">
            <Sparkles className="h-3.5 w-3.5" /> {t("analyze.badge")}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("analyze.heroTitle")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("analyze.heroSub")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("analyze.noLogin")}</p>
        </header>

        {!partial && (
          <>
            <div className="mt-8 space-y-4">
              <div>
                <Label htmlFor="target-role">{t("analyze.targetRole")}</Label>
                <Input
                  id="target-role"
                  className="mt-1.5"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder={t("analyze.targetRolePlaceholder")}
                />
              </div>
              {uploadZone}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">{t("analyze.pasteTitle")}</h2>
                </div>
                <Textarea
                  rows={5}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder={t("analyze.pastePlaceholder")}
                />
                <Button onClick={() => analyze()} disabled={analyzing} variant="outline" className="mt-4 w-full sm:w-auto">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> {t("analyze.pasteCta")}</>}
                </Button>
              </div>
            </div>

            <section className="mt-16" aria-labelledby="how-it-works">
              <h2 id="how-it-works" className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t("analyze.howTitle")}
              </h2>
              <ol className="grid md:grid-cols-3 gap-6">
                {STEP_KEYS.map((n) => (
                  <li key={n} className="rounded-xl border bg-card p-6 relative">
                    <span className="text-4xl font-bold text-primary/20 absolute top-4 right-4">{`0${n}`}</span>
                    <h3 className="font-semibold text-lg pr-12">{t(`analyze.step${n}Title`)}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{t(`analyze.step${n}Desc`)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-16" aria-labelledby="features">
              <h2 id="features" className="text-2xl md:text-3xl font-bold text-center mb-3">
                {t("analyze.featuresTitle")}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <div key={key} className="rounded-xl border bg-card p-5">
                      <Icon className="h-5 w-5 text-primary mb-3" />
                      <h3 className="font-semibold">{t(`analyze.${key}Title`)}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t(`analyze.${key}Desc`)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-16 rounded-xl border bg-primary/5 p-6 md:p-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-gold" /> {t("analyze.diffTitle")}
              </h2>
              <ul className="mt-4 space-y-2">
                {[t("analyze.diff1"), t("analyze.diff2"), t("analyze.diff3")].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-16 mb-8" aria-labelledby="faq">
              <h2 id="faq" className="text-2xl md:text-3xl font-bold">{t("analyze.faqTitle")}</h2>
              <p className="text-muted-foreground mt-2 mb-6">{t("analyze.faqSub")}</p>
              <Accordion type="single" collapsible className="rounded-xl border bg-card px-2">
                {FAQ_KEYS.map((n) => (
                  <AccordionItem key={n} value={n}>
                    <AccordionTrigger className="px-4 text-left">{t(`analyze.faq${n}q`)}</AccordionTrigger>
                    <AccordionContent className="px-4 text-muted-foreground">{t(`analyze.faq${n}a`)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </>
        )}

        {partial && (
          <div className="mt-10 space-y-6">
            <div className="rounded-2xl border bg-card p-8">
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("analyze.readinessScore")}</div>
                  <div className="text-6xl font-bold mt-1">
                    {score}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">{t("analyze.english")}</div>
                    <div className={`font-semibold capitalize ${englishColor}`}>{partial.english_signal ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("analyze.seniority")}</div>
                    <div className="font-semibold capitalize">{partial.seniority_guess ?? "-"}</div>
                  </div>
                </div>
              </div>
              <Progress value={score} className="mt-5" />
              {partial.quick_win ? (
                <p className="mt-4 text-sm rounded-lg bg-gold/10 border border-gold/20 px-3 py-2">
                  <span className="font-semibold text-gold">{t("analyze.quickWin")}: </span>
                  {partial.quick_win}
                </p>
              ) : null}
            </div>

            {displayCategories?.length ? (
              <div className="rounded-xl border bg-card p-5">
                <h2 className="font-semibold mb-4">{t("analyze.categoryScores")}</h2>
                <CategoryScoresGrid scores={displayCategories} labelKey={catLabel} />
              </div>
            ) : null}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-5">
                <h2 className="font-semibold flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {t("analyze.strengths")}
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm list-disc pl-5">
                  {(partial.top_strengths ?? []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="font-semibold flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" /> {t("analyze.gaps")}
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm list-disc pl-5">
                  {(partial.top_gaps ?? []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  {t("analyze.ctaCoverLetter")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{t("analyze.ctaCoverLetterSub")}</p>
              </div>
              <Button asChild className="shrink-0 gradient-go text-primary-foreground">
                <Link href="/tools/cover-letter">{t("analyze.ctaCoverLetter")} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            {(partial.suggested_roles?.length || partial.detected_stack?.length) && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                {partial.suggested_roles?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("analyze.suggestedRoles")}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {partial.suggested_roles.map((r, i) => (
                        <span key={i} className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-1">{r}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {partial.detected_stack?.length ? (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("analyze.detectedStack")}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {partial.detected_stack.map((r, i) => (
                        <span key={i} className="text-xs rounded-full bg-secondary text-secondary-foreground px-2.5 py-1">{r}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!full ? (
              <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 text-center">
                <Lock className="h-8 w-8 mx-auto text-primary mb-3" />
                <h2 className="text-xl font-bold">{t("analyze.unlockTitle")}</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{t("analyze.unlockSub")}</p>
                <div className="mt-5 flex gap-2 max-w-md mx-auto">
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button onClick={unlock} disabled={unlocking} className="gradient-gold text-gold-foreground shrink-0">
                    {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("analyze.unlockCta")} <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">{t("analyze.noSpam")}</p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="rounded-2xl border bg-card p-8">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("analyze.atsScore")}</div>
                      <div className="text-4xl font-bold">
                        {full.ats_score ?? "-"}
                        <span className="text-xl text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <p className="text-sm max-w-md text-muted-foreground">{full.readiness_summary}</p>
                  </div>
                  {full.role_fit_summary ? (
                    <p className="mt-4 text-sm border-t pt-4">
                      <span className="font-semibold">{t("analyze.roleFit")}: </span>
                      {full.role_fit_summary}
                    </p>
                  ) : null}
                </div>

                {full.bullet_rewrites?.length ? (
                  <div className="rounded-xl border bg-card p-5">
                    <h2 className="font-semibold mb-3">{t("analyze.rewrites")}</h2>
                    <div className="space-y-3">
                      {full.bullet_rewrites.map((b, i) => (
                        <div key={i} className="grid md:grid-cols-2 gap-2 text-sm">
                          <div className="rounded-md bg-muted p-3 line-through opacity-70">{b.original}</div>
                          <div className="rounded-md bg-primary/10 border border-primary/30 p-3">{b.improved}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-4">
                  {full.missing_keywords?.length ? (
                    <div className="rounded-xl border bg-card p-5">
                      <h2 className="font-semibold mb-2">{t("analyze.missingKeywords")}</h2>
                      <div className="flex flex-wrap gap-1.5">
                        {full.missing_keywords.map((k, i) => (
                          <span key={i} className="text-xs rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-1">{k}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {full.english_recommendations?.length ? (
                    <div className="rounded-xl border bg-card p-5">
                      <h2 className="font-semibold mb-2">{t("analyze.englishTips")}</h2>
                      <ul className="text-sm space-y-1.5 list-disc pl-5">
                        {full.english_recommendations.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {full.formatting_issues?.length ? (
                  <div className="rounded-xl border bg-card p-5">
                    <h2 className="font-semibold mb-2">{t("analyze.formatting")}</h2>
                    <ul className="text-sm space-y-1.5 list-disc pl-5">
                      {full.formatting_issues.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {full.risk_flags?.length ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                    <h2 className="font-semibold mb-2 text-destructive">{t("analyze.riskFlags")}</h2>
                    <ul className="text-sm space-y-1.5 list-disc pl-5">
                      {full.risk_flags.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {full["30_day_plan"]?.length ? (
                  <div className="rounded-xl border bg-card p-5">
                    <h2 className="font-semibold mb-3">{t("analyze.plan30")}</h2>
                    <ol className="text-sm space-y-2 list-decimal pl-5">
                      {full["30_day_plan"].map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {!user && (
                  <div className="rounded-2xl gradient-go text-primary-foreground p-8 text-center">
                    <h2 className="text-2xl font-bold">{t("analyze.ctaDashboardTitle")}</h2>
                    <p className="opacity-90 mt-1">{t("analyze.ctaDashboardSub")}</p>
                    <Button asChild size="lg" variant="secondary" className="mt-4">
                      <Link href="/auth?mode=signup">{t("analyze.ctaSignup")} <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setPartial(null);
                  setFull(null);
                  setId(null);
                  setPasted("");
                }}
              >
                {t("analyze.analyzeAnother")}
              </Button>
            </div>
          </div>
        )}
      </article>
    </AppLayout>
  );
}
