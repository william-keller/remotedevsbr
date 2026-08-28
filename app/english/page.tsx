"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ProBadge, PaywallCard } from "@/components/ProBadge";
import { Lock, Volume2 } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function English() {
  const { isPro } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("english_lessons").select("*").order("created_at").then(({ data }) => setItems(data ?? [])); }, []);

  return (
    <AppLayout>
      <SEO 
        title="Aulas de Inglês para Devs | RemoteDevs BR" 
        description="Aprenda inglês técnico voltado para entrevistas e trabalho remoto internacional."
        canonicalPath="/english"
      />
      <div className="container max-w-4xl py-10">
        <h1 className="text-4xl font-bold">English lessons</h1>
        <p className="text-muted-foreground mt-2 mb-8">Inglês prático para o dia a dia tech.</p>
        <div className="space-y-3">
          {items.map(l => {
            const locked = l.is_pro && !isPro;
            return (
              <div key={l.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{l.level}</div>
                  <ProBadge pro={l.is_pro} />
                </div>
                <h3 className="font-semibold">{pickLocaleField(l, "title", locale)}</h3>
                {locked ? <div className="text-gold mt-2 inline-flex items-center gap-1 text-sm"><Lock className="h-3 w-3" />{t("common.locked")}</div>
                  : <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{pickLocaleField(l, "body", locale)}</p>}
                {!locked && l.audio_url && <button className="mt-3 text-sm text-primary inline-flex items-center gap-1"><Volume2 className="h-4 w-4" /> Listen</button>}
              </div>
            );
          })}
        </div>
        {!isPro && <div className="mt-8"><PaywallCard /></div>}
      </div>
    </AppLayout>
  );
}
