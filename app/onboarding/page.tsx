"use client";

import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/SEO";
import { useRouter } from "next/navigation";

import { AppLayout } from "@/components/Layout";
import { RequireAuth } from "@/components/Guards";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecurityBadges } from "@/components/SecurityBadges";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Loader2, Sparkles, User, Briefcase, Upload, CheckCircle2,
} from "lucide-react";

type FormState = {
  current_job_title: string;
  years_experience: string;
  english_level: string;
  stack: string;
  salary_expectation_usd: string;
  remote_goals: string;
  github_url: string;
  linkedin_url: string;
};

const BLOCKS = [
  { key: "identity", title: "Identidade", subtitle: "Quem você é e onde te encontrar.", icon: User },
  { key: "career", title: "Carreira", subtitle: "Sua trajetória e objetivos remotos.", icon: Briefcase },
  { key: "ai", title: "IA: análise do seu currículo", subtitle: "Opcional - destrava seu Readiness Score completo.", icon: Sparkles },
] as const;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function Inner() {
  const { t } = useI18n();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [form, setForm] = useState<FormState>({
    current_job_title: "",
    years_experience: "",
    english_level: "",
    stack: "",
    salary_expectation_usd: "",
    remote_goals: "",
    github_url: "",
    linkedin_url: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm(f => ({
      ...f,
      english_level: profile.english_level ?? "",
      stack: (profile.stack ?? []).join(", "),
    }));
  }, [profile]);

  const set = (k: keyof FormState) => (v: string) => setForm(s => ({ ...s, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.current_job_title.trim().length > 0;
    if (step === 1) return form.english_level && form.stack.trim() && form.years_experience !== "";
    return true;
  };

  const analyzeFile = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
    setAnalyzing(true);
    try {
      const file_base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { action: "analyze", user_id: user.id, file_base64, file_name: file.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.partial);
      // pre-fill detected stack if user empty
      if (!form.stack && Array.isArray(data?.partial?.detected_stack) && data.partial.detected_stack.length) {
        setForm(f => ({ ...f, stack: data.partial.detected_stack.join(", ") }));
      }
      toast.success("Análise pronta!");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao analisar");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      current_job_title: form.current_job_title.trim() || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      english_level: form.english_level || null,
      stack: form.stack.split(",").map(s => s.trim()).filter(Boolean),
      salary_expectation_usd: form.salary_expectation_usd ? Number(form.salary_expectation_usd) : null,
      remote_goals: form.remote_goals.trim() || null,
      github_url: form.github_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      onboarded_at: new Date().toISOString(),
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tudo certo! Bem-vindo(a) 🚀");
    await refreshProfile();
    router.replace("/dashboard");
  };

  const progress = ((step + 1) / BLOCKS.length) * 100;
  const current = BLOCKS[step];
  const Icon = current.icon;

  return (
    <AppLayout>
      <SEO
        title="Configuração Inicial | RemoteDevs BR"
        description="Complete seu perfil para começar sua jornada no RemoteDevs BR."
        canonicalPath="/onboarding"
      />
      <div className="container max-w-2xl py-10 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Bloco {step + 1} de {BLOCKS.length}
          </div>
          <Progress value={progress} />
        </div>

        <div className="space-y-5 rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{current.title}</h1>
              <p className="text-sm text-muted-foreground">{current.subtitle}</p>
            </div>
          </div>

          {/* BLOCO 1 - Identidade */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Cargo atual</Label>
                <Input placeholder="ex. Full-stack Developer" value={form.current_job_title} onChange={e => set("current_job_title")(e.target.value)} />
              </div>
              <div>
                <Label>GitHub</Label>
                <Input placeholder="https://github.com/seu-usuario" value={form.github_url} onChange={e => set("github_url")(e.target.value)} />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/seu-perfil" value={form.linkedin_url} onChange={e => set("linkedin_url")(e.target.value)} />
              </div>
            </div>
          )}

          {/* BLOCO 2 - Carreira */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Anos de experiência</Label>
                  <Input type="number" min={0} max={50} placeholder="3" value={form.years_experience} onChange={e => set("years_experience")(e.target.value)} />
                </div>
                <div>
                  <Label>Nível de inglês</Label>
                  <Select value={form.english_level} onValueChange={set("english_level")}>
                    <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 - Iniciante</SelectItem>
                      <SelectItem value="A2">A2 - Básico</SelectItem>
                      <SelectItem value="B1">B1 - Intermediário</SelectItem>
                      <SelectItem value="B2">B2 - Intermediário avançado</SelectItem>
                      <SelectItem value="C1">C1 - Avançado</SelectItem>
                      <SelectItem value="C2">C2 - Fluente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Stack (separe por vírgulas)</Label>
                <Input placeholder="React, Node, Postgres, AWS" value={form.stack} onChange={e => set("stack")(e.target.value)} />
              </div>
              <div>
                <Label>Expectativa salarial (USD / ano)</Label>
                <Input type="number" min={0} placeholder="90000" value={form.salary_expectation_usd} onChange={e => set("salary_expectation_usd")(e.target.value)} />
              </div>
              <div>
                <Label>Objetivos remotos</Label>
                <Textarea rows={3} placeholder="Empresa US, contrato PJ, full-remote, async…" value={form.remote_goals} onChange={e => set("remote_goals")(e.target.value)} />
              </div>
            </div>
          )}

          {/* BLOCO 3 - IA enrichment */}
          {step === 2 && (
            <div className="space-y-4">
              {!analysis ? (
                <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center">
                  <Sparkles className="h-7 w-7 mx-auto text-primary mb-2" />
                  <p className="font-medium">Suba seu currículo em PDF</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nossa IA gera seu Readiness Score em segundos. Você pode pular e fazer depois.
                  </p>
                  <input ref={fileRef} hidden type="file" accept="application/pdf,.pdf" onChange={e => {
                    const f = e.target.files?.[0]; if (f) analyzeFile(f);
                  }} />
                  <Button onClick={() => fileRef.current?.click()} disabled={analyzing} className="mt-4 gradient-go text-primary-foreground">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Subir PDF</>}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Análise concluída</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{analysis.overall_score ?? "-"}</span>
                    <span className="text-sm text-muted-foreground">/ 100 readiness</span>
                  </div>
                  {analysis.suggested_roles?.length ? (
                    <div className="text-sm">
                      <div className="text-muted-foreground">Roles sugeridas:</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {analysis.suggested_roles.map((r: string, i: number) => (
                          <span key={i} className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1">{r}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Você verá o relatório completo no seu dashboard.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {step < BLOCKS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gradient-go text-primary-foreground">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="gradient-go text-primary-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Concluir <ArrowRight className="h-4 w-4" /></>}
              </Button>
            )}
          </div>

          <SecurityBadges
            className="mt-2 pt-3"
            complianceLabel={t("security.lgpdCompliant")}
            encryptedLabel={t("security.encryptedData")}
          />
        </div>

        {step < BLOCKS.length - 1 && (
          <p className="text-center text-xs text-muted-foreground">Você pode editar tudo depois no seu perfil.</p>
        )}
      </div>
    </AppLayout>
  );
}

export default function Onboarding() {
  return <RequireAuth><Inner /></RequireAuth>;
}
