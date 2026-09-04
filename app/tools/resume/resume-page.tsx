"use client";

import { useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, FileText, Trash2, Download } from "lucide-react";

function Inner() {
  const { isPro, user } = useAuth();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ target_role: "", summary: "", experience: "", skills: "", education: "" });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);

  const loadSaved = async () => {
    if (!user) return;
    const { data } = await supabase.from("resumes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setSaved(data ?? []);
  };
  useEffect(() => { loadSaved(); }, [user]);

  const generate = async () => {
    setLoading(true); setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-tools", { body: { kind: "resume", payload: form } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data?.text ?? "");
    } catch (e: any) { toast.error(e.message ?? "AI error"); }
    finally { setLoading(false); }
  };

  const saveGenerated = async () => {
    if (!user || !output) return;
    const { error } = await supabase.from("resumes").insert({
      user_id: user.id, title: form.target_role || "My resume",
      target_role: form.target_role, inputs: form, generated_markdown: output,
    });
    if (error) toast.error(error.message);
    else { toast.success("Currículo salvo"); loadSaved(); }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("resumes").insert({
        user_id: user.id, title: file.name, file_url: path, inputs: {},
      });
      if (error) throw error;
      toast.success("Currículo enviado");
      loadSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const download = async (path: string, title: string) => {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Falha ao baixar"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (id: string, file_url: string | null) => {
    if (file_url) await supabase.storage.from("resumes").remove([file_url]);
    await supabase.from("resumes").delete().eq("id", id);
    loadSaved();
  };

  if (!isPro) return <AppLayout><div className="container max-w-2xl py-16"><PaywallCard title={t("resume.title")} /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="container max-w-6xl py-10">
        <h1 className="text-4xl font-bold flex items-center gap-2">{t("resume.title")} <Sparkles className="h-6 w-6 text-gold" /></h1>
        <p className="text-muted-foreground mt-2 mb-8">Gere com IA ou faça upload do seu PDF.</p>

        <div className="rounded-xl border bg-card p-5 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Upload de PDF/DOCX</p>
              <p className="text-xs text-muted-foreground">Guarde várias versões. Máx 10MB.</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={onUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />} Enviar arquivo
          </Button>
        </div>

        {saved.length > 0 && (
          <div className="rounded-xl border bg-card p-5 mb-6">
            <h3 className="font-semibold mb-3">Seus currículos ({saved.length})</h3>
            <ul className="space-y-2">
              {saved.map(r => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded hover:bg-muted">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{r.title}</span>
                    {r.file_url && <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded">PDF</span>}
                    {r.generated_markdown && <span className="text-[10px] uppercase bg-gold/20 text-gold px-1.5 py-0.5 rounded">AI</span>}
                  </div>
                  <div className="flex gap-1">
                    {r.file_url && (
                      <Button size="sm" variant="ghost" onClick={() => download(r.file_url, r.title)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.file_url)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Gerar com IA</h3>
            <div><Label>{t("resume.target")}</Label><Input value={form.target_role} onChange={e=>setForm({...form, target_role: e.target.value})} placeholder="Senior Frontend Engineer" /></div>
            <div><Label>{t("resume.summary")}</Label><Textarea rows={3} value={form.summary} onChange={e=>setForm({...form, summary: e.target.value})} /></div>
            <div><Label>{t("resume.experience")}</Label><Textarea rows={6} value={form.experience} onChange={e=>setForm({...form, experience: e.target.value})} placeholder="Acme - Sr Eng (2022-now): led migration to React 18..." /></div>
            <div><Label>{t("resume.skills")}</Label><Input value={form.skills} onChange={e=>setForm({...form, skills: e.target.value})} placeholder="React, TypeScript, Node, AWS" /></div>
            <div><Label>{t("resume.education")}</Label><Input value={form.education} onChange={e=>setForm({...form, education: e.target.value})} /></div>
            <Button onClick={generate} disabled={loading} className="w-full gradient-gold text-gold-foreground">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}{t("resume.generate")}
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-6 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{t("resume.output")}</h3>
              {output && <Button size="sm" variant="outline" onClick={saveGenerated}>Salvar</Button>}
            </div>
            <pre className="whitespace-pre-wrap text-sm font-sans flex-1">{output || "-"}</pre>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
export function ResumePage() { return <RequireAuth><Inner /></RequireAuth>; }
