"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronUp, ExternalLink, Plus, Trash2, Clock, ChevronLeft, ChevronRight, Loader2, Globe, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { JsonLd } from "@/components/JsonLd";
import { useAuthModal } from "@/lib/auth-modal";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 12;

type SubmitStep = "url" | "form";

export function ProjectsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { openAuthModal } = useAuthModal();
  const [items, setItems] = useState<any[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SubmitStep>("url");
  const [fetchingOg, setFetchingOg] = useState(false);
  const [ogLoaded, setOgLoaded] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [form, setForm] = useState({ title: "", tagline: "", description: "", url: "", image_url: "", stack: "" });

  const resetDialog = () => {
    setStep("url");
    setUrlInput("");
    setOgLoaded(false);
    setFetchingOg(false);
    setForm({ title: "", tagline: "", description: "", url: "", image_url: "", stack: "" });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetDialog();
  };

  const normalizeUrl = (raw: string) =>
    raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`;

  const fetchOgData = async () => {
    if (!urlInput.trim()) {
      toast.error(t("projects.url_required"));
      return;
    }

    setFetchingOg(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-og", {
        body: { url: urlInput.trim() },
      });

      const normalizedUrl = normalizeUrl(urlInput);

      if (error || data?.error) {
        // Even if OG fetch fails, proceed to form with URL pre-filled
        toast.info(t("projects.og_fetch_failed"));
        setForm(prev => ({ ...prev, url: normalizedUrl }));
      } else {
        const hasOgData = Boolean(data.title || data.description || data.image);
        setForm(prev => ({
          ...prev,
          url: normalizedUrl,
          title: data.title || prev.title,
          tagline: data.description ? data.description.slice(0, 120) : prev.tagline,
          description: data.description || prev.description,
          image_url: data.image || prev.image_url,
        }));
        setOgLoaded(hasOgData);
        toast.success(hasOgData ? t("projects.og_loaded") : t("projects.og_fetch_failed"));
      }
    } catch {
      const normalizedUrl = normalizeUrl(urlInput);
      toast.info(t("projects.og_fetch_failed"));
      setForm(prev => ({ ...prev, url: normalizedUrl }));
    } finally {
      setFetchingOg(false);
      setStep("form");
    }
  };

  const skipToForm = () => {
    if (urlInput.trim()) {
      setForm(prev => ({ ...prev, url: normalizeUrl(urlInput) }));
    }
    setStep("form");
  };

  const load = async () => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count } = await supabase
      .from("side_projects")
      .select("*", { count: "exact" })
      .eq("status", "approved")
      .order(sort === "top" ? "upvotes" : "created_at", { ascending: false })
      .range(from, to);

    setItems(data ?? []);
    setTotalCount(count ?? 0);

    if (user) {
      const { data: v } = await supabase.from("project_votes").select("project_id");
      setVotes(new Set((v ?? []).map((x: any) => x.project_id)));

      const { data: pending } = await supabase
        .from("side_projects")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "approved")
        .order("created_at", { ascending: false });
      setUserSubmissions(pending ?? []);
    } else {
      setVotes(new Set());
      setUserSubmissions([]);
    }
  };

  useEffect(() => {
    load();
  }, [user, sort, page]);

  const submit = async () => {
    if (!user) {
      openAuthModal("signup");
      return;
    }
    if (!form.title) {
      toast.error(t("projects.title_required"));
      return;
    }
    const { error } = await supabase.from("side_projects").insert({
      user_id: user.id,
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      url: form.url,
      image_url: form.image_url,
      stack: form.stack.split(",").map(s => s.trim()).filter(Boolean),
      status: "pending",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("projects.submitted_pending_approval"));
      // Notify admin via Telegram asynchronously
      supabase.functions.invoke("send-notification", {
        body: {
          type: "project_submitted",
          user_id: user.id,
          payload: {
            title: form.title,
            tagline: form.tagline,
            url: form.url,
            stack: form.stack.split(",").map(s => s.trim()).filter(Boolean),
            user_email: user.email,
            user_id: user.id,
          },
        },
      }).catch((err) => console.error("Failed to send notification:", err));

      handleOpenChange(false);
      load();
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const { error } = await supabase.from("side_projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Project deleted");
      load();
    }
  };

  const vote = async (id: string) => {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    if (votingId) return;
    setVotingId(id);
    try {
      const alreadyVoted = votes.has(id);
      const { error } = alreadyVoted
        ? await supabase.from("project_votes").delete().eq("project_id", id)
        : await supabase.from("project_votes").insert({ project_id: id });
      if (error && error.code !== "23505") {
        toast.error(t("projects.vote_failed"));
        return;
      }
      await load();
    } finally {
      setVotingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "SoftwareApplication",
        "name": p.title,
        "description": p.tagline || p.description || `Side project da comunidade RemoteDevs BR.`,
        "applicationCategory": "DeveloperApplication",
        ...(p.url ? { "url": p.url } : {})
      }
    }))
  };

  return (
    <AppLayout>
      <JsonLd data={jsonLd} />
      <div className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-4xl font-bold">{t("nav.projects")}</h1>
            <p className="text-muted-foreground mt-1">{t("projects.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <div className="inline-flex border rounded-md text-xs">
              <button onClick={() => { setSort("top"); setPage(1); }} className={`px-3 py-1.5 ${sort === "top" ? "bg-foreground text-background" : ""}`}>Top</button>
              <button onClick={() => { setSort("new"); setPage(1); }} className={`px-3 py-1.5 ${sort === "new" ? "bg-foreground text-background" : ""}`}>New</button>
            </div>
            <Dialog open={open} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button className="gradient-go text-primary-foreground">
                  <Plus className="h-4 w-4 mr-1" />{t("projects.submit_button")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("projects.submit_title")}</DialogTitle>
                </DialogHeader>

                {/* Step 1: URL input */}
                {step === "url" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t("projects.url_step_description")}</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={urlInput}
                          onChange={e => setUrlInput(e.target.value)}
                          placeholder="myproject.com"
                          className="pl-9"
                          onKeyDown={e => { if (e.key === "Enter") fetchOgData(); }}
                          disabled={fetchingOg}
                          autoFocus
                        />
                      </div>
                      <Button onClick={fetchOgData} disabled={fetchingOg || !urlInput.trim()} className="gradient-go text-primary-foreground min-w-[90px]">
                        {fetchingOg ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("projects.load_data")} <ArrowRight className="h-4 w-4 ml-1" /></>}
                      </Button>
                    </div>
                    <div className="text-center">
                      <button onClick={skipToForm} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                        {t("projects.skip_fill_manually")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Editable form */}
                {step === "form" && (
                  <div className="space-y-3">
                    {ogLoaded && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {t("projects.og_prefilled_hint")}
                      </div>
                    )}
                    {form.image_url && (
                      <div className="rounded-lg overflow-hidden border bg-muted aspect-video max-h-40 relative">
                        <img
                          src={form.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                    <div><Label>{t("projects.field_title")}</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                    <div><Label>{t("projects.field_tagline")}</Label><Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} /></div>
                    <div><Label>{t("projects.field_url")}</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
                    <div><Label>{t("projects.field_image_url")}</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
                    <div><Label>{t("projects.field_stack")}</Label><Input value={form.stack} onChange={e => setForm({ ...form, stack: e.target.value })} placeholder="React, Node.js, Supabase" /></div>
                    <div><Label>{t("projects.field_description")}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => setStep("url")} className="gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> {t("projects.back")}
                      </Button>
                      <Button onClick={submit} className="flex-1 gradient-go text-primary-foreground">{t("projects.submit_button")}</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* User's own pending/rejected submissions section */}
        {userSubmissions.length > 0 && (
          <div className="mb-8 p-5 border rounded-xl bg-muted/20">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {t("projects.your_submissions")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSubmissions.map(p => (
                <div key={p.id} className="rounded-xl border bg-card p-4 relative flex flex-col justify-between opacity-90">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <Badge variant={p.status === "rejected" ? "destructive" : "outline"} className="text-[10px]">
                        {p.status === "pending" ? t("projects.pending_approval") : p.status}
                      </Badge>
                    </div>
                    {p.tagline && <p className="text-xs text-muted-foreground line-clamp-2">{p.tagline}</p>}
                  </div>
                  <div className="mt-3 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProject(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Showcase Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(p => (
            <div key={p.id} className="rounded-xl border bg-card overflow-hidden hover:border-primary/40 transition flex flex-col justify-between">
              <div>
                {p.image_url ? (
                  <div className="aspect-video bg-muted overflow-hidden relative">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover relative z-10" loading="lazy" width="400" height="225" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div className="absolute inset-0 gradient-hero z-0"></div>
                  </div>
                ) : <div className="aspect-video gradient-hero" />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <p className="text-sm text-muted-foreground">{p.tagline}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => vote(p.id)}
                      disabled={votingId === p.id}
                      aria-pressed={votes.has(p.id)}
                      aria-label={t("common.upvote")}
                      className={`flex flex-col items-center px-2 py-1 rounded border ${votes.has(p.id) ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      <ChevronUp className="h-4 w-4" /><span className="text-xs font-bold">{p.upvotes}</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(p.stack ?? []).map((s: string) => <span key={s} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                {p.url && (
                  <a href={p.url.includes("?") ? `${p.url}&utm_source=remotedevsbr.com` : `${p.url}?utm_source=remotedevsbr.com`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-16 border rounded-xl bg-card">
            <p className="text-muted-foreground">No projects found.</p>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {t("projects.prev_page")}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                {t("projects.next_page")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
