"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Check, Lock } from "lucide-react";
import { ProBadge, PaywallCard } from "@/components/ProBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEngagement } from "@/hooks/useEngagement";
import { XPProgress } from "@/components/XPProgress";
import { useAuthModal } from "@/lib/auth-modal";

export default function Journey() {
  const { user, isPro } = useAuth();
  const { t, locale } = useI18n();
  const { xp, trackActivity } = useEngagement();
  const { openAuthModal } = useAuthModal();
  const [stages, setStages] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: st }, { data: sp }] = await Promise.all([
      supabase.from("journey_stages").select("*").order("position"),
      supabase.from("journey_steps").select("*").order("position"),
    ]);
    setStages(st ?? []);
    setSteps(sp ?? []);
    if (user) {
      const { data: prog } = await supabase.from("journey_progress").select("step_id").eq("user_id", user.id);
      setDone(new Set((prog ?? []).map((p: any) => p.step_id)));
    }
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (stepId: string, locked: boolean) => {
    if (locked) { toast.error(t("common.locked")); return; }
    if (!user) {
      openAuthModal("signup");
      return;
    }
    if (done.has(stepId)) {
      await supabase.from("journey_progress").delete().eq("user_id", user.id).eq("step_id", stepId);
      const n = new Set(done); n.delete(stepId); setDone(n);
    } else {
      await supabase.from("journey_progress").insert({ user_id: user.id, step_id: stepId });
      setDone(new Set([...done, stepId]));
      // Track activity for potential achievements
      trackActivity("journey_step_completed", { step_id: stepId });
    }
  };

  const totalDone = done.size;
  const total = steps.length;

  return (
    <AppLayout>
      <SEO
        title="Jornada de Carreira | RemoteDevs BR"
        description="Siga o checklist gamificado para acelerar sua carreira em trabalho remoto internacional."
        canonicalPath="/journey"
      />
      <div className="container py-10">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold">{t("nav.journey")}</h1>
          <p className="text-muted-foreground mt-2">{t("journey.subtitle")}</p>
          <div className="mt-4 text-sm text-muted-foreground">{totalDone}/{total} {t("common.completed").toLowerCase()}</div>
          {user && (
            <div className="mt-6 p-4 rounded-xl border bg-card">
              <XPProgress xp={xp} showDetails />
            </div>
          )}
        </div>

        <div className="mt-10 space-y-12">
          {stages.map((stage, idx) => {
            const stageSteps = steps.filter(s => s.stage_id === stage.id);
            return (
              <div key={stage.id} className="relative">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-10 w-10 rounded-full gradient-go text-primary-foreground inline-flex items-center justify-center font-bold shadow-glow">{idx + 1}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{pickLocaleField(stage, "title", locale)}</h2>
                    <p className="text-sm text-muted-foreground">{pickLocaleField(stage, "description", locale)}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 ml-0 md:ml-14">
                  {stageSteps.map(s => {
                    const locked = s.is_pro && !isPro;
                    const isDone = done.has(s.id);
                    return (
                      <div key={s.id} className={`rounded-xl border p-5 transition ${isDone ? "border-primary/50 bg-primary/5" : "bg-card hover:border-primary/40"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{pickLocaleField(s, "title", locale)}</h3>
                          <ProBadge pro={s.is_pro} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{pickLocaleField(s, "body", locale)}</p>
                        <Button
                          size="sm"
                          variant={isDone ? "default" : "outline"}
                          className={`mt-4 ${isDone ? "gradient-go text-primary-foreground" : ""}`}
                          onClick={() => toggle(s.id, locked)}
                        >
                          {locked ? <><Lock className="h-3 w-3 mr-1" />{t("common.locked")}</> : isDone ? <><Check className="h-3 w-3 mr-1" />{t("common.completed")}</> : t("common.complete")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!isPro && (
          <div className="mt-16 max-w-2xl mx-auto"><PaywallCard /></div>
        )}
      </div>
    </AppLayout>
  );
}
