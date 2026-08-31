"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n, pickLocaleField } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronUp, ExternalLink, Building2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuthModal } from "@/lib/auth-modal";

function CompanyCard({ c, voted, onVote }: { c: any; voted: boolean; onVote: () => void }) {
  const { locale } = useI18n();
  return (
    <div className="rounded-xl border p-5 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg inline-flex items-center justify-center bg-muted text-muted-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{c.name}</h3>
            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">{c.website} <ExternalLink className="h-3 w-3" /></a>}
          </div>
        </div>
        <button onClick={onVote} className={`flex flex-col items-center px-2 py-1 rounded border ${voted ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
          <ChevronUp className="h-4 w-4" /><span className="text-xs font-bold">{c.upvotes}</span>
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-3">{pickLocaleField(c, "description", locale)}</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {(c.tags ?? []).map((t: string) => <span key={t} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{t}</span>)}
        {c.hiring && <span className="text-[11px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">hiring</span>}
      </div>
    </div>
  );
}

export default function Companies() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { openAuthModal } = useAuthModal();
  const [items, setItems] = useState<any[]>([]);
  const [votes, setVotes] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase.from("companies").select("*").order("upvotes", { ascending: false });
    setItems(data ?? []);
    if (user) {
      const { data: v } = await supabase.from("company_votes").select("company_id").eq("user_id", user.id);
      setVotes(new Set((v ?? []).map((x: any) => x.company_id)));
    }
  };
  useEffect(() => { load(); }, [user]);

  const toggle = async (id: string) => {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    if (votes.has(id)) {
      await supabase.from("company_votes").delete().eq("user_id", user.id).eq("company_id", id);
    } else {
      await supabase.from("company_votes").insert({ user_id: user.id, company_id: id });
    }
    load();
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.slice(0, 20).map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Organization",
        "name": c.name,
        "description": c.description || c.description_pt || `Empresa que contrata devs brasileiros remotamente.`,
        ...(c.website ? { "url": c.website } : {})
      }
    }))
  };

  return (
    <AppLayout>
      <SEO 
        title="Empresas Contratando Devs Remotos | RemoteDevs BR" 
        description="Conheça as empresas gringas que mais contratam brasileiros."
        canonicalPath="/companies"
        structuredData={jsonLd}
      />
      <div className="container py-10">
        <h1 className="text-4xl font-bold">{t("nav.companies")}</h1>
        <p className="text-muted-foreground mt-2 mb-6">{t("companies.subtitle")}</p>

        <div className="grid md:grid-cols-2 gap-4">
          {items.map(c => <CompanyCard key={c.id} c={c} voted={votes.has(c.id)} onVote={() => toggle(c.id)} />)}
        </div>
      </div>
    </AppLayout>
  );
}
