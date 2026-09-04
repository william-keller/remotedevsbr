"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/Guards";

const COLS: { key: any; label: string; tone: string }[] = [
  { key: "saved", label: "applications.statusSaved", tone: "bg-muted" },
  { key: "applied", label: "applications.statusApplied", tone: "bg-blue-500/10" },
  { key: "interviewing", label: "applications.statusInterviewing", tone: "bg-gold/15" },
  { key: "offer", label: "applications.statusOffer", tone: "bg-primary/15" },
  { key: "rejected", label: "applications.statusRejected", tone: "bg-destructive/10" },
];

function Inner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", role: "", notes: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user || !form.company_name || !form.role) return;
    const { error } = await supabase.from("applications").insert({ user_id: user.id, ...form, status: "saved" });
    if (error) toast.error(error.message); else { toast.success(t("applications.created")); setOpen(false); setForm({ company_name:"", role:"", notes:"" }); load(); }
  };

  const move = async (id: string, status: any) => {
    await supabase.from("applications").update({ status, applied_at: status === "applied" ? new Date().toISOString() : null }).eq("id", id);
    load();
  };
  const del = async (id: string) => { await supabase.from("applications").delete().eq("id", id); load(); };

  return (
    <AppLayout>
      <SEO
        title="Minhas Candidaturas | RemoteDevs BR"
        description="Acompanhe o status das suas candidaturas a vagas remotas internacionais."
        canonicalPath="/applications"
      />
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">{t("dashboard.applications")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-go text-primary-foreground"><Plus className="h-4 w-4 mr-1" />{t("applications.newButton")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("applications.newTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("applications.company")}</Label><Input value={form.company_name} onChange={e=>setForm({...form, company_name: e.target.value})} /></div>
                <div><Label>{t("applications.role")}</Label><Input value={form.role} onChange={e=>setForm({...form, role: e.target.value})} /></div>
                <div><Label>{t("applications.notes")}</Label><Textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} /></div>
                <Button onClick={create} className="w-full gradient-go text-primary-foreground">{t("common.create")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!items.length && <p className="text-muted-foreground">{t("dashboard.noApps")}</p>}

        <div className="grid lg:grid-cols-5 gap-4">
          {COLS.map(col => (
            <div key={col.key} className={`rounded-xl border p-3 ${col.tone}`}>
              <div className="text-xs uppercase tracking-wider font-bold mb-3 px-1">{t(col.label)} ({items.filter(i=>i.status===col.key).length})</div>
              <div className="space-y-2">
                {items.filter(i => i.status === col.key).map(a => (
                  <div key={a.id} className="rounded-lg bg-card border p-3 text-sm">
                    <div className="font-semibold">{a.role}</div>
                    <div className="text-xs text-muted-foreground">{a.company_name}</div>
                    {a.notes && <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{a.notes}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {COLS.filter(c=>c.key!==col.key).map(c => (
                        <button key={c.key} onClick={() => move(a.id, c.key)} className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted hover:bg-foreground hover:text-background transition">→{t(c.label)}</button>
                      ))}
                      <button onClick={() => del(a.id)} className="text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
export default function Applications() { return <RequireAuth><Inner /></RequireAuth>; }
