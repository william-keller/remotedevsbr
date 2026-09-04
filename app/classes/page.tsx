"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ProBadge, PaywallCard } from "@/components/ProBadge";
import { Lock, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SEO } from "@/components/SEO";

export default function Classes() {
  const { isPro } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => { supabase.from("classes").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);

  const filtered = items.filter(c =>
    !q ||
    pickLocaleField(c, "title", locale).toLowerCase().includes(q.toLowerCase()) ||
    (c.category ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": filtered.slice(0, 15).map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Course",
        "name": pickLocaleField(c, "title", locale),
        "description": pickLocaleField(c, "description", locale),
        "provider": {
          "@type": "Organization",
          "name": "RemoteDevs BR",
          "sameAs": "https://remotedevsbr.com"
        }
      }
    }))
  };

  return (
    <AppLayout>
      <SEO 
        title="Aulas de Inglês para Devs | RemoteDevs BR" 
        description="Aprenda inglês voltado para entrevistas e trabalho remoto no exterior."
        canonicalPath="/classes"
        structuredData={jsonLd}
      />
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold">{t("nav.classes")}</h1>
            <p className="text-muted-foreground mt-1">{t("classes.subtitle")}</p>
          </div>
          <Input placeholder={t("common.search")} value={q} onChange={e=>setQ(e.target.value)} className="max-w-xs" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => {
            const locked = c.is_pro && !isPro;
            return (
              <button key={c.id} onClick={() => !locked && setActive(c)}
                className="text-left rounded-xl border bg-card overflow-hidden hover:border-primary/50 transition group">
                <div className="aspect-video gradient-hero relative flex items-center justify-center">
                  {locked ? <Lock className="h-8 w-8 text-gold" /> : <Play className="h-10 w-10 text-white/80 group-hover:scale-110 transition" />}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="uppercase text-muted-foreground tracking-wider">{c.category}</span>
                    <ProBadge pro={c.is_pro} />
                  </div>
                  <h3 className="font-semibold mt-1">{pickLocaleField(c, "title", locale)}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{pickLocaleField(c, "description", locale)}</p>
                  <div className="text-xs text-muted-foreground mt-3">{c.duration_min} min</div>
                </div>
              </button>
            );
          })}
        </div>

        {!isPro && <div className="mt-12 max-w-xl mx-auto"><PaywallCard /></div>}

        <Dialog open={!!active} onOpenChange={() => setActive(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{active && pickLocaleField(active, "title", locale)}</DialogTitle></DialogHeader>
            {active && (
              <div className="aspect-video">
                <iframe src={active.video_url} title="class" allowFullScreen className="w-full h-full rounded-md" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
