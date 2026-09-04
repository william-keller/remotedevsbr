"use client";

import { useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaywallCard } from "@/components/ProBadge";
import { RequireAuth } from "@/components/Guards";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { SEO } from "@/components/SEO";

function Inner() {
  const { isPro } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState({ target_role: "", headline: "", about: "" });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true); setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-tools", {
        body: { kind: "linkedin", payload: form },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data?.text ?? "");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  if (!isPro) return <AppLayout><div className="container max-w-2xl py-16"><PaywallCard title={t("linkedin.title")} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container max-w-5xl py-10">
        <h1 className="text-4xl font-bold flex items-center gap-2">{t("linkedin.title")} <Sparkles className="h-6 w-6 text-gold" /></h1>
        <p className="text-muted-foreground mt-2 mb-8">Cole sua headline e about para receber sugestões.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-xl border bg-card p-6">
            <div><Label>{t("linkedin.role")}</Label><Input value={form.target_role} onChange={e=>setForm({...form, target_role: e.target.value})} /></div>
            <div><Label>{t("linkedin.headline")}</Label><Input value={form.headline} onChange={e=>setForm({...form, headline: e.target.value})} /></div>
            <div><Label>{t("linkedin.about")}</Label><Textarea rows={8} value={form.about} onChange={e=>setForm({...form, about: e.target.value})} /></div>
            <Button onClick={run} disabled={loading} className="w-full gradient-gold text-gold-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}{t("linkedin.analyze")}
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-6 min-h-[400px]">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">{t("linkedin.suggestions")}</h3>
            {output ? <Markdown className="text-sm">{output}</Markdown> : <span className="text-muted-foreground">-</span>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export default function LinkedinTuner() { return <RequireAuth>
      <SEO 
        title="Otimizador de LinkedIn para Devs | RemoteDevs BR" 
        description="Otimize seu perfil do LinkedIn para atrair recrutadores internacionais de empresas que contratam remotamente."
        canonicalPath="/tools/linkedin"
      /><Inner /></RequireAuth>; }
