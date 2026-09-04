"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProBadge, PaywallCard } from "@/components/ProBadge";
import { Lock } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function Help() {
  const { isPro } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { supabase.from("help_articles").select("*").order("category").then(({ data }) => setItems(data ?? [])); }, []);

  const cats = Array.from(new Set(items.map(i => i.category)));
  const filtered = items.filter(i => !q || pickLocaleField(i, "title", locale).toLowerCase().includes(q.toLowerCase()));

  return (
    <AppLayout>
      <SEO 
        title="Central de Ajuda | RemoteDevs BR" 
        description="Tire suas dúvidas sobre a plataforma RemoteDevs BR, vagas remotas e como acelerar sua carreira internacional."
        canonicalPath="/help"
      />
      <div className="container max-w-4xl py-10">
        <h1 className="text-4xl font-bold">{t("nav.help")}</h1>
        <p className="text-muted-foreground mt-2 mb-6">{t("help.subtitle")}</p>
        <Input placeholder={t("common.search")} value={q} onChange={e=>setQ(e.target.value)} className="mb-6 max-w-md" />

        {cats.map(cat => {
          const list = filtered.filter(i => i.category === cat);
          if (!list.length) return null;
          return (
            <div key={cat} className="mb-8">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">{cat}</h2>
              <Accordion type="single" collapsible className="rounded-xl border bg-card">
                {list.map(a => {
                  const locked = a.is_pro && !isPro;
                  return (
                    <AccordionItem key={a.id} value={a.id} className="px-4">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 text-left">
                          {pickLocaleField(a, "title", locale)} <ProBadge pro={a.is_pro} />
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {locked ? <div className="flex items-center gap-2 text-gold"><Lock className="h-4 w-4" />{t("common.locked")}</div>
                          : <p className="text-sm text-muted-foreground whitespace-pre-line">{pickLocaleField(a, "body", locale)}</p>}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          );
        })}

        {!isPro && <div className="mt-8"><PaywallCard /></div>}
      </div>
    </AppLayout>
  );
}
