"use client";

import { useState } from "react";
import { SEO } from "@/components/SEO";
import { useRouter } from "next/navigation";

import { AppLayout } from "@/components/Layout";
import { RequireAuth } from "@/components/Guards";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useEngagement } from "@/hooks/useEngagement";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SecurityBadges } from "@/components/SecurityBadges";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Sparkles,
} from "lucide-react";

interface QuestionOption {
  value: string;
  key: string;
  customField?: string;
}

interface Question {
  field: string;
  titleKey: string;
  hintKey?: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    field: "area",
    titleKey: "onboarding.question1",
    options: [
      { value: "dev", key: "onboarding.q1.dev" },
      { value: "tech_lead", key: "onboarding.q1.tech_lead" },
      { value: "designer_qa", key: "onboarding.q1.designer_qa" },
      { value: "data", key: "onboarding.q1.data" },
      { value: "product", key: "onboarding.q1.product" },
      { value: "other_it", key: "onboarding.q1.other_it", customField: "area_custom" },
      { value: "not_it", key: "onboarding.q1.not_it", customField: "area_custom" },
    ],
  },
  {
    field: "experience_bucket",
    titleKey: "onboarding.question2",
    hintKey: "onboarding.q2.hint",
    options: [
      { value: "lt_1_5", key: "onboarding.q2.lt_1_5" },
      { value: "r1_5_2", key: "onboarding.q2.r1_5_2" },
      { value: "r2_3", key: "onboarding.q2.r2_3" },
      { value: "r3_5", key: "onboarding.q2.r3_5" },
      { value: "r5_10", key: "onboarding.q2.r5_10" },
      { value: "r10_20", key: "onboarding.q2.r10_20" },
      { value: "gt_20", key: "onboarding.q2.gt_20" },
    ],
  },
  {
    field: "monthly_income_bucket",
    titleKey: "onboarding.question3",
    options: [
      { value: "lt_5k", key: "onboarding.q3.lt_5k" },
      { value: "r5_6_5k", key: "onboarding.q3.r5_6_5k" },
      { value: "r6_5_8k", key: "onboarding.q3.r6_5_8k" },
      { value: "r8_10k", key: "onboarding.q3.r8_10k" },
      { value: "r10_15k", key: "onboarding.q3.r10_15k" },
      { value: "r15_20k", key: "onboarding.q3.r15_20k" },
      { value: "gt_20k", key: "onboarding.q3.gt_20k" },
    ],
  },
  {
    field: "pain_point",
    titleKey: "onboarding.question4",
    options: [
      { value: "english", key: "onboarding.q4.english" },
      { value: "recruiter_contacts", key: "onboarding.q4.recruiter_contacts" },
      { value: "find_international_jobs", key: "onboarding.q4.find_international_jobs" },
      { value: "technical_interviews", key: "onboarding.q4.technical_interviews" },
      { value: "other", key: "onboarding.q4.other", customField: "pain_point_custom" },
    ],
  },
  {
    field: "intl_search_stage",
    titleKey: "onboarding.question5",
    options: [
      { value: "not_started_preparing", key: "onboarding.q5.not_started_preparing" },
      { value: "searching_need_help", key: "onboarding.q5.searching_need_help" },
      { value: "in_market_seeking_better", key: "onboarding.q5.in_market_seeking_better" },
      { value: "researching_not_priority", key: "onboarding.q5.researching_not_priority" },
    ],
  },
];

interface Answers {
  [field: string]: string;
}

interface CustomAnswers {
  [field: string]: string;
}

function Inner() {
  const { t } = useI18n();
  const { user, refreshProfile } = useAuth();
  const { trackActivity } = useEngagement();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [custom, setCustom] = useState<CustomAnswers>({});
  const [saving, setSaving] = useState(false);

  const question = QUESTIONS[step];
  const selected = answers[question.field];
  const selectedOption = question.options.find(o => o.value === selected);
  const needsCustom = selectedOption?.customField != null;
  const canFinish = selected != null && (!needsCustom || (custom[selectedOption?.customField ?? ""]?.trim().length ?? 0) > 0);
  const progress = (step / QUESTIONS.length) * 100;

  const choose = (option: QuestionOption) => {
    const next = { ...answers, [question.field]: option.value };
    setAnswers(next);
    if (option.customField) {
      setCustom(c => ({ ...c, [option.customField!]: c[option.customField!] ?? "" }));
    }
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 220);
    }
  };

  const customFor = (field: string): string | undefined => {
    const q = QUESTIONS.find(x => x.field === field);
    if (!q) return undefined;
    const opt = q.options.find(o => o.value === answers[field] && o.customField);
    return opt?.customField ? (custom[opt.customField]?.trim() || undefined) : undefined;
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const payload: { [k: string]: any } = {
      area: answers.area || null,
      area_custom: customFor("area") || null,
      experience_bucket: answers.experience_bucket || null,
      monthly_income_bucket: answers.monthly_income_bucket || null,
      pain_point: answers.pain_point || null,
      pain_point_custom: customFor("pain_point") || null,
      intl_search_stage: answers.intl_search_stage || null,
      onboarded_at: new Date().toISOString(),
    };
    const answeredCount = ["area", "experience_bucket", "monthly_income_bucket", "pain_point", "intl_search_stage"]
      .filter(k => answers[k]).length;
    payload.profile_completeness = Math.round((answeredCount / 5) * 100);

    const { error } = await supabase.from("profiles").update(payload as any).eq("id", user.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    await trackActivity("onboarding_completed", { answers });
    toast.success(t("onboarding.welcome"));
    await refreshProfile();
    router.replace("/dashboard");
  };

  return (
    <AppLayout>
      <SEO
        title={t("onboarding.title")}
        description={t("onboarding.subtitle")}
        canonicalPath="/onboarding"
      />
      <div className="container max-w-2xl py-10 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" /> {t("onboarding.step")} {step + 1} {t("onboarding.of")} {QUESTIONS.length}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-5 rounded-xl border bg-card p-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">{t(question.titleKey)}</h1>
            {question.hintKey && (
              <p className="text-sm text-muted-foreground">{t(question.hintKey)}</p>
            )}
          </div>

          <div className="space-y-2">
            {question.options.map(option => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(option)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span>{t(option.key)}</span>
                  {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {needsCustom && selectedOption?.customField && (() => {
            const field = selectedOption.customField!;
            return (
              <div>
                <Input
                  placeholder={t("onboarding.otherPlaceholder")}
                  value={custom[field] ?? ""}
                  onChange={e => setCustom(c => ({ ...c, [field]: e.target.value }))}
                  autoFocus
                />
                {step < QUESTIONS.length - 1 && (
                  <p className="text-xs text-muted-foreground mt-2">{t("onboarding.completeHint")}</p>
                )}
              </div>
            );
          })()}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="h-4 w-4" /> {t("onboarding.back")}
            </Button>
            {step < QUESTIONS.length - 1 ? (
              <Button
                onClick={() => setStep(s => Math.min(QUESTIONS.length - 1, s + 1))}
                disabled={!selected || saving}
                className="gradient-go text-primary-foreground"
              >
                {t("onboarding.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={finish}
                disabled={!canFinish || saving}
                className="gradient-go text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("onboarding.finish")} <ArrowRight className="h-4 w-4" /></>}
              </Button>
            )}
          </div>

          {step === QUESTIONS.length - 1 && (
            <p className="text-xs text-muted-foreground">{t("onboarding.shareHint")}</p>
          )}

          <SecurityBadges
            className="mt-2 pt-3"
            complianceLabel={t("security.lgpdCompliant")}
            encryptedLabel={t("security.encryptedData")}
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default function Onboarding() {
  return <RequireAuth><Inner /></RequireAuth>;
}
