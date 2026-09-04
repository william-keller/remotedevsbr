"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ProBadge, PaywallCard } from "@/components/ProBadge";
import { ExternalLink, FileText, Link as LinkIcon, Sheet, FileType, Video, Lock } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const iconFor: Record<string, any> = { article: FileText, link: LinkIcon, pdf: FileType, sheet: Sheet, video: Video };

export default function Resources() {
  const { isPro } = useAuth();
  const { t, locale } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  useEffect(() => { supabase.from("resources").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);

  const cats = ["all", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];
  const filtered = items.filter(i =>
    (cat === "all" || i.category === cat) &&
    (!q || pickLocaleField(i, "title", locale).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppLayout>
      <SEO 
        title="Recursos para Trabalho Remoto Internacional | RemoteDevs BR" 
        description="Acesse guias, artigos e recursos essenciais para conseguir seu primeiro emprego remoto em empresa dos EUA."
        canonicalPath="/resources"
      />
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold">{t("nav.resources")}</h1>
            <p className="text-muted-foreground mt-1">{t("resources.subtitle")}</p>
          </div>
          <Input placeholder={t("common.search")} value={q} onChange={e=>setQ(e.target.value)} className="max-w-xs" />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {cats.map(c => (
            <button key={c} onClick={()=>setCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${cat === c ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-muted"}`}>{c}</button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(r => {
            const Icon = iconFor[r.kind] || FileText;
            const locked = r.is_pro && !isPro;
            return (
              <div key={r.id} className="rounded-xl border bg-card p-5 flex gap-4 hover:border-primary/40 transition">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                    <span>{r.category}</span><ProBadge pro={r.is_pro} />
                  </div>
                  <h3 className="font-semibold mt-1">{pickLocaleField(r, "title", locale)}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pickLocaleField(r, "summary", locale)}</p>
                  {locked ? (
                    <div className="text-xs text-gold mt-2 inline-flex items-center gap-1"><Lock className="h-3 w-3" />{t("common.locked")}</div>
                  ) : r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-primary mt-2 inline-flex items-center gap-1 hover:underline">
                      {t("resources.open")} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <button onClick={() => toast.info(t("resources.comingSoon"))} className="text-sm text-primary mt-2 hover:underline">{t("resources.read")}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isPro && <div className="mt-12 max-w-xl mx-auto"><PaywallCard /></div>}
      </div>
    </AppLayout>
  );
}
