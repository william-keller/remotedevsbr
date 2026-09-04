"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Eye, Flame, Plus, MapPin, DollarSign, Send, Check, Loader2, Wand2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SEO } from "@/components/SEO";
import { useAuthModal } from "@/lib/auth-modal";

type SortKey = "latest" | "highest_paid" | "most_viewed" | "most_applied" | "hottest" | "most_benefits";

type JobRow = {
  id: string;
  slug: string;
  company_name: string;
  role: string;
  location: string | null;
  location_type: string | null;
  seniority_level: string | null;
  stack: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string;
  apply_url: string;
  source: string;
  views_count: number;
  applications_count: number;
  benefits_count: number;
  is_hot: boolean;
  is_featured: boolean;
  region_scope: string | null;
  description: string | null;
  job_type: string | null;
  country_codes: string[] | null;
  company_id: string | null;
  status?: string | null;
  companies?: { name: string; slug: string | null; logo_url: string | null } | null;
  job_perk_map?: { job_perks: { slug: string; label: string } | null }[];
};

type Perk = { id: string; slug: string; label: string };

function JobsInner() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackedJobIds, setTrackedJobIds] = useState<Set<string>>(new Set());
  const [perks, setPerks] = useState<Perk[]>([]);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("latest");
  const [region, setRegion] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    company_website: "",
    role: "",
    seniority_level: "mid",
    job_type: "full_time",
    location_type: "remote",
    location: "Remote",
    region_scope: "worldwide",
    country_codes: "",
    apply_url: "",
    stack: "",
    salary_min: "",
    salary_max: "",
    salary_currency: "USD",
    salary_period: "year",
    description: "",
    perks: [] as string[],
    source: "",
  });

  // Fill-in-from-link (fetch-og) + "Your Submissions"
  const [fetchingOg, setFetchingOg] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<JobRow[]>([]);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("jobs")
        .select("id,slug,company_name,role,location,location_type,seniority_level,stack,salary_min,salary_max,salary_currency,posted_at,apply_url,source,views_count,applications_count,benefits_count,is_hot,is_featured,region_scope,description,job_type,country_codes,company_id,companies(name,slug,logo_url),job_perk_map(job_perks(slug,label))")
        .eq("is_active", true)
        .eq("status", "published")
        .order("posted_at", { ascending: false });
      setItems((data as unknown as JobRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  const loadPerks = async () => {
    const { data } = await supabase.from("job_perks").select("id,slug,label").order("label");
    setPerks((data as Perk[]) ?? []);
  };

  const loadTrackedJobs = async () => {
    if (!user) {
      setTrackedJobIds(new Set());
      return;
    }
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", user.id)
      .not("job_id", "is", null);
    if (data) {
      setTrackedJobIds(new Set(data.map((x) => x.job_id).filter(Boolean) as string[]));
    }
  };

  useEffect(() => {
    load();
    loadPerks();
  }, []);

  useEffect(() => {
    loadTrackedJobs();
  }, [user]);

  const loadMySubmissions = async () => {
    if (!user) {
      setMySubmissions([]);
      return;
    }
    const { data } = await supabase
      .from("jobs")
      .select("id,slug,company_name,role,location,location_type,seniority_level,stack,salary_min,salary_max,salary_currency,posted_at,apply_url,source,views_count,applications_count,benefits_count,is_hot,is_featured,region_scope,description,job_type,country_codes,company_id,status")
      .eq("submitted_by", user.id)
      .neq("status", "published")
      .order("posted_at", { ascending: false });
    setMySubmissions((data as unknown as JobRow[]) ?? []);
  };

  useEffect(() => {
    loadMySubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fillFromLink = async () => {
    if (!form.apply_url?.trim()) return;
    setFetchingOg(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-og", {
        body: { url: form.apply_url.trim() },
      });
      if (error) throw error;
      const og = data as { title?: string; description?: string; siteName?: string };
      const urlObj = (() => {
        try { return new URL(form.apply_url.trim()); } catch { return null; }
      })();
      const host = urlObj?.hostname?.replace(/^www\./, "") ?? "";
      setForm((prev) => ({
        ...prev,
        role: prev.role || og?.title || prev.role,
        description: prev.description || og?.description || prev.description,
        company_name: prev.company_name || og?.siteName || (host ? host.split(".")[0] : "") || prev.company_name,
        company_website: prev.company_website || (urlObj ? urlObj.origin : "") || prev.company_website,
      }));
    } catch (e) {
      toast.error(t("jobs.post.fillFailed"));
    } finally {
      setFetchingOg(false);
    }
  };

  const deleteMySubmission = async (id: string) => {
    if (!user) return;
    if (!confirm(t("jobs.confirmDelete"))) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id).eq("submitted_by", user.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("jobs.deleted"));
      loadMySubmissions();
    }
  };


  useEffect(() => {
    const qParam = searchParams.get("q") ?? "";
    const sortParam = (searchParams.get("sort") as SortKey | null) ?? "latest";
    const regionParam = searchParams.get("region") ?? "all";
    const typeParam = searchParams.get("type") ?? "all";
    const perkParam = searchParams.get("perks");

    setQ(qParam);
    setSortBy(sortParam);
    setRegion(regionParam);
    setJobType(typeParam);
    setSelectedPerks(perkParam ? perkParam.split(",").filter(Boolean) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sortBy !== "latest") params.set("sort", sortBy);
    if (region !== "all") params.set("region", region);
    if (jobType !== "all") params.set("type", jobType);
    if (selectedPerks.length) params.set("perks", selectedPerks.join(","));

    const query = params.toString();
    router.replace(query ? `/jobs?${query}` : "/jobs", { scroll: false });
  }, [q, sortBy, region, jobType, selectedPerks, router]);

  const filtered = useMemo(() => {
    const list = items.filter((j) => {
      const byText = !q || `${j.role} ${j.company_name} ${(j.stack ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase());
      const byRegion = region === "all" || j.region_scope === region;
      const byJobType = jobType === "all" || (j as any).job_type === jobType;
      const perkSet = new Set((j.job_perk_map ?? []).map((x) => x.job_perks?.slug).filter(Boolean));
      const byPerks = selectedPerks.length === 0 || selectedPerks.every((p) => perkSet.has(p));
      return byText && byRegion && byJobType && byPerks;
    });

    const sorters: Record<SortKey, (a: JobRow, b: JobRow) => number> = {
      latest: (a, b) => {
        const getTier = (j: JobRow) => {
          if (j.is_featured && j.is_hot) return 3;
          if (j.is_featured) return 2;
          if (j.is_hot) return 1;
          return 0;
        };
        const tierA = getTier(a);
        const tierB = getTier(b);
        if (tierA !== tierB) {
          return tierB - tierA;
        }
        return +new Date(b.posted_at) - +new Date(a.posted_at);
      },
      highest_paid: (a, b) => (b.salary_max ?? b.salary_min ?? 0) - (a.salary_max ?? a.salary_min ?? 0),
      most_viewed: (a, b) => (b.views_count ?? 0) - (a.views_count ?? 0),
      most_applied: (a, b) => (b.applications_count ?? 0) - (a.applications_count ?? 0),
      hottest: (a, b) => Number(b.is_hot) - Number(a.is_hot) || (b.views_count ?? 0) - (a.views_count ?? 0),
      most_benefits: (a, b) => (b.benefits_count ?? 0) - (a.benefits_count ?? 0),
    };
    return [...list].sort(sorters[sortBy]);
  }, [items, q, region, jobType, selectedPerks, sortBy]);

  const track = async (j: JobRow) => {
    if (!user) {
      openAuthModal("signup");
      return;
    }
    if (trackedJobIds.has(j.id)) {
      toast.info(t("jobs.track.alreadyTracked"));
      return;
    }
    const { error } = await supabase.from("applications").insert({
      user_id: user.id, job_id: j.id, company_name: j.company_name, role: j.role, status: "saved",
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("jobs.track.added"));
      setTrackedJobIds((prev) => {
        const next = new Set(prev);
        next.add(j.id);
        return next;
      });
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!form.company_name || !form.role || !form.apply_url) {
      toast.error(t("jobs.post.validationRequired"));
      return;
    }
    setSubmitting(true);
    const { data: writeData, error } = await supabase.functions.invoke("jobs-write", {
      body: {
        jobId: editingJobId || undefined,
        companyName: form.company_name,
        companyWebsite: form.company_website || null,
        role: form.role,
        seniorityLevel: form.seniority_level,
        jobType: form.job_type,
        locationType: form.location_type,
        locationLabel: form.location,
        regionScope: form.region_scope,
        countryCodes: form.country_codes
          ? form.country_codes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
          : [],
        applyUrl: form.apply_url,
        stack: form.stack ? form.stack.split(",").map((s) => s.trim()).filter(Boolean) : [],
        salaryMin: form.salary_min ? Number(form.salary_min) : null,
        salaryMax: form.salary_max ? Number(form.salary_max) : null,
        salaryCurrency: form.salary_currency || "USD",
        salaryPeriod: form.salary_period || "year",
        description: form.description || null,
        source: form.source || null,
        perks: form.perks,
      },
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      const resultingStatus = (writeData as { status?: string } | null)?.status;
      const isPending = resultingStatus !== "published";
      toast.success(isPending ? t("jobs.post.pendingSuccess") : t("jobs.post.success"));

      if (isPending && user) {
        // Notify admins via Telegram + in-app notifications
        supabase.functions.invoke("send-notification", {
          body: {
            type: "job_submitted",
            user_id: user.id,
            payload: {
              role: form.role,
              companyName: form.company_name,
              location: form.location,
              workFormat: form.location_type,
              seniority: form.seniority_level,
              jobType: form.job_type,
              salary: form.salary_min || form.salary_max
                ? `${form.salary_min || ""} - ${form.salary_max || ""} ${form.salary_currency} / ${form.salary_period}`.trim()
                : undefined,
              stack: form.stack ? form.stack.split(",").map((s) => s.trim()).filter(Boolean) : [],
              applyUrl: form.apply_url,
              user_email: user.email,
              user_id: user.id,
            },
          },
        }).catch((e) => console.error("Failed to send job notification:", e));
      }

      setOpen(false);
      setEditingJobId(null);
      setForm({
        company_name: "",
        company_website: "",
        role: "",
        seniority_level: "mid",
        job_type: "full_time",
        location_type: "remote",
        location: "Remote",
        region_scope: "worldwide",
        country_codes: "",
        apply_url: "",
        stack: "",
        salary_min: "",
        salary_max: "",
        salary_currency: "USD",
        salary_period: "year",
        description: "",
        source: "",
        perks: [],
      });
      load();
      loadMySubmissions();
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": filtered.slice(0, 15).map((j, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "JobPosting",
        "title": j.role,
        "description": j.description || `Vaga remota para ${j.role} na empresa ${j.company_name}.`,
        "datePosted": j.posted_at || new Date().toISOString(),
        "hiringOrganization": {
          "@type": "Organization",
          "name": j.company_name
        },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": j.location || "Remote"
          }
        }
      }
    }))
  };

  return (
    <AppLayout>
      <SEO 
        title="Vagas Remotas Internacionais para Devs | RemoteDevs BR" 
        description="Encontre as melhores vagas de trabalho remoto internacional em dólar."
        canonicalPath="/jobs"
        structuredData={jsonLd}
      />
      <div className="container py-6 md:py-10">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{t("nav.jobs")}</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">{t("jobs.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button asChild variant="outline" size="sm"><Link href="/applications">{t("jobs.myTracker")}</Link></Button>
              {user ? (
                <Dialog open={open} onOpenChange={(v) => {
                  if (!v) setEditingJobId(null);
                  setOpen(v);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gradient-gold text-gold-foreground"><Send className="h-4 w-4 mr-1" />{t("jobs.post.cta")}</Button>
                  </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{editingJobId ? t("jobs.post.editTitle") : t("jobs.post.title")}</DialogTitle></DialogHeader>
                  <p className="text-xs text-muted-foreground -mt-2">{t("jobs.post.subtitle")}</p>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    <div>
                      <Label>{t("jobs.post.applyUrl")} *</Label>
                      <div className="flex gap-2">
                        <Input value={form.apply_url} onChange={e=>setForm({...form, apply_url: e.target.value})} placeholder="https://..." />
                        <Button type="button" variant="outline" size="sm" onClick={fillFromLink} disabled={fetchingOg || !form.apply_url.trim()} className="shrink-0 gap-1">
                          {fetchingOg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                          {t("jobs.post.fillFromLink")}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>{t("jobs.post.company")} *</Label>
                      <Input value={form.company_name} onChange={e=>setForm({...form, company_name: e.target.value})} />
                    </div>
                    <div>
                      <Label>{t("jobs.post.companyWebsite")}</Label>
                      <Input value={form.company_website} onChange={e=>setForm({...form, company_website: e.target.value})} placeholder="https://..." />
                    </div>
                    <div><Label>{t("jobs.post.role")} *</Label><Input value={form.role} onChange={e=>setForm({...form, role: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("jobs.post.seniority")}</Label>
                        <Select value={form.seniority_level} onValueChange={(v) => setForm({ ...form, seniority_level: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="junior">{t("jobs.seniority.junior")}</SelectItem>
                            <SelectItem value="mid">{t("jobs.seniority.mid")}</SelectItem>
                            <SelectItem value="senior">{t("jobs.seniority.senior")}</SelectItem>
                            <SelectItem value="lead">{t("jobs.seniority.lead")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t("jobs.post.jobType")}</Label>
                        <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">{t("jobs.type.fullTime")}</SelectItem>
                            <SelectItem value="contract">{t("jobs.type.contract")}</SelectItem>
                            <SelectItem value="part_time">{t("jobs.type.partTime")}</SelectItem>
                            <SelectItem value="freelance">{t("jobs.type.freelance")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("jobs.post.locationType")}</Label>
                        <Select value={form.location_type} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remote">{t("jobs.locType.remote")}</SelectItem>
                            <SelectItem value="hybrid">{t("jobs.locType.hybrid")}</SelectItem>
                            <SelectItem value="onsite">{t("jobs.locType.onsite")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("jobs.post.location")}</Label><Input value={form.location} onChange={e=>setForm({...form, location: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{t("jobs.post.region")}</Label>
                        <Select value={form.region_scope} onValueChange={(v) => setForm({ ...form, region_scope: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="worldwide">{t("jobs.region.worldwide")}</SelectItem>
                            <SelectItem value="north_america">{t("jobs.region.na")}</SelectItem>
                            <SelectItem value="latin_america">{t("jobs.region.latam")}</SelectItem>
                            <SelectItem value="europe">{t("jobs.region.europe")}</SelectItem>
                            <SelectItem value="asia">{t("jobs.region.asia")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>{t("jobs.post.countries")}</Label><Input value={form.country_codes} onChange={e=>setForm({...form, country_codes: e.target.value})} placeholder="BR, US, CA" /></div>
                    </div>
                    <div><Label>{t("jobs.post.source")}</Label><Input value={form.source} onChange={e=>setForm({...form, source: e.target.value})} placeholder={t("jobs.post.sourcePlaceholder")} /></div>
                    <div><Label>{t("jobs.post.stack")}</Label><Input value={form.stack} onChange={e=>setForm({...form, stack: e.target.value})} placeholder={t("jobs.post.stackPlaceholder")} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>{t("jobs.post.salaryMin")}</Label><Input type="number" value={form.salary_min} onChange={e=>setForm({...form, salary_min: e.target.value})} /></div>
                      <div><Label>{t("jobs.post.salaryMax")}</Label><Input type="number" value={form.salary_max} onChange={e=>setForm({...form, salary_max: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>{t("jobs.post.currency")}</Label><Input value={form.salary_currency} onChange={e=>setForm({...form, salary_currency: e.target.value})} /></div>
                      <div>
                        <Label>{t("jobs.post.salaryPeriod")}</Label>
                        <Select value={form.salary_period} onValueChange={(v) => setForm({ ...form, salary_period: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="year">{t("jobs.period.year")}</SelectItem>
                            <SelectItem value="month">{t("jobs.period.month")}</SelectItem>
                            <SelectItem value="hour">{t("jobs.period.hour")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>{t("jobs.post.perks")}</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                        {perks.map((perk) => (
                          <label key={perk.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={form.perks.includes(perk.slug)}
                              onCheckedChange={(checked) => {
                                setForm((prev) => ({
                                  ...prev,
                                  perks: checked
                                    ? [...prev.perks, perk.slug]
                                    : prev.perks.filter((slug) => slug !== perk.slug),
                                }));
                              }}
                            />
                            <span>{perk.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div><Label>{t("jobs.post.description")}</Label><Textarea rows={4} value={form.description} onChange={e=>setForm({...form, description: e.target.value})} /></div>
                    <Button onClick={submit} disabled={submitting} className="w-full gradient-go text-primary-foreground">
                      {submitting ? t("jobs.post.publishing") : t("jobs.post.submitForReview")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              ) : null}
            </div>
          </div>
          {mySubmissions.length > 0 && user && (
            <div className="mt-4 rounded-lg border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("jobs.yourSubmissions")}
              </h2>
              <div className="space-y-2">
                {mySubmissions.map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{job.role} <span className="text-muted-foreground">@ {job.company_name}</span></div>
                      {job.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" /> {t("jobs.pendingApproval")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <Check className="h-3 w-3" /> {t("jobs.rejected")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setForm({
                            company_name: job.company_name,
                            company_website: "",
                            role: job.role,
                            seniority_level: (job.seniority_level as string) || "mid",
                            job_type: (job.job_type as string) || "full_time",
                            location_type: (job.location_type as string) || "remote",
                            location: job.location || "Remote",
                            region_scope: (job.region_scope as string) || "worldwide",
                            country_codes: job.country_codes?.join(", ") || "",
                            apply_url: job.apply_url,
                            stack: job.stack?.join(", ") || "",
                            salary_min: job.salary_min ? String(job.salary_min) : "",
                            salary_max: job.salary_max ? String(job.salary_max) : "",
                            salary_currency: job.salary_currency || "USD",
                            salary_period: "year",
                            description: job.description || "",
                            source: job.source || "",
                            perks: [],
                          });
                          setEditingJobId(job.id);
                          setOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />{t("jobs.resubmit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMySubmission(job.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Input placeholder={t("common.search")} value={q} onChange={e=>setQ(e.target.value)} className="flex-1" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t("jobs.sort.label")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">{t("jobs.sort.latest")}</SelectItem>
                <SelectItem value="highest_paid">{t("jobs.sort.highestPaid")}</SelectItem>
                <SelectItem value="most_viewed">{t("jobs.sort.mostViewed")}</SelectItem>
                <SelectItem value="most_applied">{t("jobs.sort.mostApplied")}</SelectItem>
                <SelectItem value="hottest">{t("jobs.sort.hottest")}</SelectItem>
                <SelectItem value="most_benefits">{t("jobs.sort.mostBenefits")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Filter pill rows - RemoteOK style */}
        <div className="mb-4 space-y-1.5">
          {/* Row 1: Region pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {([
              { value: "all", label: t("jobs.filter.all") },
              { value: "worldwide", label: "🌍 " + t("jobs.region.worldwide") },
              { value: "north_america", label: "🇺🇸 " + t("jobs.region.na") },
              { value: "latin_america", label: "🇧🇷 " + t("jobs.region.latam") },
              { value: "europe", label: "🇪🇺 " + t("jobs.region.europe") },
              { value: "asia", label: "🌏 " + t("jobs.region.asia") },
            ] as { value: string; label: string }[]).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRegion(opt.value)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  region === opt.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Row 2: Job type + perk pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {([
              { value: "all", label: t("jobs.filter.all") },
              { value: "full_time", label: "⏱ " + t("jobs.type.fullTime") },
              { value: "contract", label: "📋 " + t("jobs.type.contract") },
              { value: "part_time", label: "🕐 " + t("jobs.type.partTime") },
              { value: "freelance", label: "🎯 " + t("jobs.type.freelance") },
            ] as { value: string; label: string }[]).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setJobType(opt.value)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  jobType === opt.value
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-4 bg-border shrink-0 mx-1" />
            {perks.slice(0, 8).map((perk) => {
              const selected = selectedPerks.includes(perk.slug);
              return (
                <button
                  key={perk.id}
                  type="button"
                  onClick={() =>
                    setSelectedPerks((prev) =>
                      selected ? prev.filter((x) => x !== perk.slug) : [...prev, perk.slug],
                    )
                  }
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {perk.label}
                </button>
              );
            })}
          </div>
        </div>


        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-card animate-pulse"
              >
                {/* Logo avatar skeleton */}
                <div className="shrink-0 hidden md:block w-11 h-11 rounded-lg bg-muted" />

                {/* Title + meta skeleton */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-48 rounded bg-muted" />
                    <div className="h-4 w-12 rounded bg-muted/70" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-4 w-24 rounded bg-muted/60" />
                    <div className="h-4 w-16 rounded bg-muted/40 rounded-full" />
                    <div className="h-4 w-16 rounded bg-muted/40 rounded-full" />
                  </div>
                </div>

                {/* Tags skeleton */}
                <div className="flex flex-wrap gap-1 md:max-w-[220px] md:justify-end">
                  <div className="h-5 w-12 rounded-full bg-muted/50" />
                  <div className="h-5 w-16 rounded-full bg-muted/50" />
                  <div className="h-5 w-14 rounded-full bg-muted/50" />
                </div>

                {/* Actions skeleton */}
                <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 w-full md:w-auto">
                  <div className="h-4 w-16 rounded bg-muted/40 hidden md:block" />
                  <div className="flex gap-1.5 w-full md:w-auto">
                    <div className="h-7 w-20 rounded bg-muted" />
                    <div className="h-7 w-20 rounded bg-muted" />
                    <div className="h-7 w-20 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              {t("jobs.empty")}
            </div>
          ) : (
            filtered.map(j => {
            const companyDisplay = j.companies?.name || j.company_name;
            const initials = companyDisplay.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
            const postedDate = new Date(j.posted_at);
            const daysAgo = Math.floor((Date.now() - postedDate.getTime()) / 86400000);
            const dateLabel = daysAgo === 0 ? t("jobs.today") : daysAgo === 1 ? "1d" : `${daysAgo}d`;
            const allTags = [
              ...(j.stack ?? []),
              ...(j.job_perk_map ?? []).slice(0, 3).map(x => x.job_perks?.label).filter(Boolean) as string[],
            ].slice(0, 5);

            return (
              <div
                key={j.id}
                onClick={() => router.push(`/jobs/${j.slug}`)}
                className={`rounded-xl border p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:border-primary/40 transition group cursor-pointer ${
                  j.is_featured ? "bg-gold/5 border-gold/30" : "bg-card"
                }`}
              >
                {/* Logo avatar - desktop only */}
                <div className="shrink-0 hidden md:flex items-center justify-center w-11 h-11 rounded-lg border bg-muted overflow-hidden text-sm font-bold text-muted-foreground">
                  {j.companies?.logo_url ? (
                    <img src={j.companies.logo_url} alt={companyDisplay} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                {/* Title + meta - grows */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base leading-tight">{j.role}</h3>
                    {j.source === "member" && <span className="text-[10px] uppercase bg-gold/15 text-gold px-1.5 py-0.5 rounded">{t("jobs.memberBadge")}</span>}
                    {j.is_hot && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5"><Flame className="h-3 w-3 mr-0.5" />{t("jobs.hotBadge")}</Badge>}
                    {j.is_featured && <Badge className="text-[10px] px-1.5 py-0.5">{t("jobs.featuredBadge")}</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-sm font-medium text-muted-foreground">{companyDisplay}</span>
                    {j.location && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" />{j.location}
                      </span>
                    )}
                    {j.seniority_level && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{j.seniority_level}</span>
                    )}
                    {(j.salary_min || j.salary_max) && (
                      <span className="text-xs text-primary font-medium inline-flex items-center gap-0.5 bg-primary/8 px-2 py-0.5 rounded-full">
                        <DollarSign className="h-2.5 w-2.5" />
                        {(j.salary_min ?? 0).toLocaleString()} – {(j.salary_max ?? j.salary_min ?? 0).toLocaleString()} {j.salary_currency}
                      </span>
                    )}
                  </div>
                  {j.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1 md:hidden">
                      {j.description.slice(0, 100)}
                    </p>
                  )}
                </div>

                {/* Tags - middle column on desktop */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 md:max-w-[220px] md:justify-end">
                    {allTags.map((tag) => (
                      <span key={tag} className="text-[11px] border border-border rounded-full px-2 py-0.5 text-muted-foreground whitespace-nowrap">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Right: date + actions */}
                <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />{j.views_count ?? 0}
                    <span className="font-medium">{dateLabel}</span>
                  </span>
                  <div className="flex gap-1.5 flex-1 md:flex-none">
                    <Button
                      variant={trackedJobIds.has(j.id) ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => track(j)}
                      disabled={trackedJobIds.has(j.id)}
                      className="flex-1 md:flex-none text-xs h-7 px-2.5"
                    >
                      {trackedJobIds.has(j.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          {t("jobs.action.tracked")}
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          {t("jobs.action.track")}
                        </>
                      )}
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1 md:flex-none text-xs h-7 px-2.5">
                      <Link href={`/jobs/${j.slug}`}>{t("jobs.action.details")}</Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 md:flex-none text-xs h-7 px-3 gradient-go text-primary-foreground">
                      <a href={j.apply_url} target="_blank" rel="noreferrer">{t("jobs.action.apply")} <ExternalLink className="h-3 w-3 ml-1" /></a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          }))}

        </div>
      </div>
    </AppLayout>
  );
}

export default function Jobs() {
  return (
    <Suspense fallback={null}>
      <JobsInner />
    </Suspense>
  );
}
