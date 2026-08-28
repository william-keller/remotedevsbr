"use client";

import { useEffect, useState, Suspense } from "react";
import { SEO } from "@/components/SEO";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { AppLayout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { RequireAuth } from "@/components/Guards";

function Inner() {
  const { isPro, refreshProfile } = useAuth();
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("success")) {
      toast.success("Pagamento confirmado! Liberando Pro…");
      checkSub();
      router.replace(pathname);
    } else if (params.get("canceled")) {
      toast.info("Checkout cancelado.");
      router.replace(pathname);
    } else {
      checkSub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSub = async () => {
    try {
      await supabase.functions.invoke("check-subscription");
      await refreshProfile();
    } catch {}
  };

  const checkout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", { body: { plan } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
      else throw new Error(data?.error ?? "No checkout URL");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao iniciar checkout");
    } finally { setLoading(null); }
  };

  const portal = async () => {
    setLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("stripe-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao abrir portal");
    } finally { setLoading(null); }
  };

  const features = [
    "Biblioteca completa de aulas",
    "Construtor de currículo com IA",
    "Tunador de LinkedIn com IA",
    "Lições de inglês completas",
    "Guia completo de negociação",
    "Help center de entrevistas",
    "Submeta vagas na plataforma",
    "Upload e geração ilimitada de currículos",
  ];

  return (
    <AppLayout>
      <SEO
        title="RemoteDevs PRO - Plano Premium | RemoteDevs BR"
        description="Desbloqueie recursos premium para acelerar sua jornada em trabalho remoto internacional."
        canonicalPath="/pro"
      />
      <div className="container max-w-5xl py-16">
        {isPro && (
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-gold">{t("pro.active")} ✨</p>
              <p className="text-sm text-muted-foreground">Gerencie seu plano, método de pagamento ou cancele a qualquer momento.</p>
            </div>
            <Button variant="outline" onClick={portal} disabled={loading === "portal"}>
              {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Gerenciar assinatura
            </Button>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold mb-4">
            <Sparkles className="h-3 w-3" /> PRO
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">{t("pro.title")}</h1>
          <p className="text-muted-foreground mt-3 text-lg">{t("pro.sub")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-8">
            <h3 className="font-bold text-xl">Mensal</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold">R$ 29</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Cancele quando quiser.</p>
            <Button onClick={() => checkout("monthly")} disabled={isPro || !!loading}
              className="w-full mt-6 gradient-go text-primary-foreground">
              {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPro ? "Já é Pro" : "Assinar mensal"}
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-gold/50 bg-card p-8 relative shadow-elegant">
            <span className="absolute -top-3 right-6 px-2 py-0.5 rounded-full bg-gold text-gold-foreground text-xs font-bold">ECONOMIZE 17%</span>
            <h3 className="font-bold text-xl">Anual</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold">R$ 290</span>
              <span className="text-muted-foreground">/ano</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">~R$ 24/mês - economize 2 meses.</p>
            <Button onClick={() => checkout("yearly")} disabled={isPro || !!loading}
              className="w-full mt-6 gradient-gold text-gold-foreground">
              {loading === "yearly" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPro ? "Já é Pro" : "Assinar anual"}
            </Button>
          </div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-3 mt-10 max-w-3xl mx-auto">
          {features.map(f => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Pagamento seguro via Stripe. Aceitamos cartões nacionais e internacionais.
        </p>
      </div>
    </AppLayout>
  );
}
export default function Pro() { 
  return (
    <RequireAuth>
      <Suspense fallback={<div className="container max-w-5xl py-16 text-center text-muted-foreground">Carregando...</div>}>
        <Inner />
      </Suspense>
    </RequireAuth>
  ); 
}
