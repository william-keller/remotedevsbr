"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, ShieldCheck, Pencil, CalendarDays, Clock, Users, Video, CreditCard, Search, UserCheck, X, Check, Loader2, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/Guards";

type Section = "jobs" | "companies" | "resources" | "classes" | "help_articles" | "english_lessons";

function CrudList({ section }: { section: Section }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [perks, setPerks] = useState<any[]>([]);

  const load = async () => {
    if (section === "jobs") {
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*, job_perk_map(job_perks(slug)), companies(website)")
        .order("created_at", { ascending: false })
        .limit(200);
      setItems(jobsData ?? []);

      const { data: perksData } = await supabase
        .from("job_perks")
        .select("id,slug,label")
        .order("label");
      setPerks(perksData ?? []);
    } else {
      const { data } = await supabase.from(section).select("*").order("created_at", { ascending: false }).limit(200);
      setItems(data ?? []);
    }
  };

  useEffect(() => {
    load();
    setForm(section === "jobs" ? { perks: [] } : {});
    setEditingId(null);
  }, [section]);

  const create = async () => {
    const payload = { ...form };
    if (section === "jobs" || section === "companies") {
      delete payload.is_pro;
    }
    if (section === "companies") {
      if (!payload.slug && payload.name) {
        payload.slug = payload.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 80);
      }
    }
    if (section === "jobs") {
      let companyId = null;
      if (payload.company_name?.trim()) {
        const compName = payload.company_name.trim();
        const compSlug = compName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
        
        const { data: company, error: compErr } = await (supabase
          .from("companies") as any)
          .upsert(
            {
              name: compName,
              slug: compSlug,
              website: payload.company_website || null,
              hiring: true,
            },
            { onConflict: "slug" }
          )
          .select("id")
          .single();
        if (compErr) {
          toast.error("Error upserting company: " + compErr.message);
          return;
        }
        companyId = company.id;
      }

      const jobRecord: any = {
        company_id: companyId,
        company_name: payload.company_name?.trim() || "",
        role: payload.role?.trim() || "",
        title: payload.role?.trim() || "",
        seniority_level: payload.seniority_level || null,
        seniority: payload.seniority_level || null,
        job_type: payload.job_type || "full_time",
        location_type: payload.location_type || "remote",
        location: payload.location || "Remote",
        region_scope: payload.region_scope || null,
        apply_url: payload.apply_url?.trim() || "",
        description: payload.description || null,
        salary_min: payload.salary_min ? Number(payload.salary_min) : null,
        salary_max: payload.salary_max ? Number(payload.salary_max) : null,
        comp_min: payload.salary_min ? Number(payload.salary_min) : null,
        comp_max: payload.salary_max ? Number(payload.salary_max) : null,
        salary_currency: payload.salary_currency || "USD",
        comp_currency: payload.salary_currency || "USD",
        salary_period: payload.salary_period || "year",
        is_active: payload.is_active !== undefined ? !!payload.is_active : true,
        is_hot: !!payload.is_hot,
        is_featured: !!payload.is_featured,
        status: "published",
        published_at: new Date().toISOString(),
        posted_at: new Date().toISOString(),
      };

      if (payload.stack) {
        jobRecord.stack = typeof payload.stack === "string"
          ? payload.stack.split(",").map((s: string) => s.trim()).filter(Boolean)
          : payload.stack;
      } else {
        jobRecord.stack = [];
      }

      if (payload.country_codes) {
        jobRecord.country_codes = typeof payload.country_codes === "string"
          ? payload.country_codes.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean)
          : payload.country_codes;
      } else {
        jobRecord.country_codes = [];
      }

      const slugBase = `${jobRecord.title}-${jobRecord.company_name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);
      jobRecord.slug = `${slugBase}-${Math.random().toString(36).substring(2, 8)}`;

      const { data: newJob, error: jobErr } = await supabase
        .from("jobs")
        .insert(jobRecord)
        .select("id")
        .single();

      if (jobErr) {
        toast.error(jobErr.message);
        return;
      }

      const perkSlugs = (payload.perks ?? []).map((p: string) => p.trim()).filter(Boolean);
      if (perkSlugs.length > 0) {
        const { data: perkRows } = await supabase
          .from("job_perks")
          .select("id, slug")
          .in("slug", perkSlugs);

        if (perkRows?.length) {
          await supabase.from("job_perk_map").insert(
            perkRows.map((perk) => ({
              job_id: newJob.id,
              perk_id: perk.id,
            }))
          );
        }
      }

      toast.success("Created");
      setForm({ perks: [] });
      load();
      return;
    }

    if (section === "resources" && !payload.kind) payload.kind = "article";
    const { error } = await supabase.from(section).insert(payload);
    if (error) toast.error(error.message); else { toast.success("Created"); setForm({}); load(); }
  };

  const update = async () => {
    if (!editingId) return;
    const payload = { ...form };
    if (section === "jobs" || section === "companies") {
      delete payload.is_pro;
    }
    if (section === "companies") {
      if (!payload.slug && payload.name) {
        payload.slug = payload.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 80);
      }
    }
    if (section === "jobs") {
      let companyId = null;
      if (payload.company_name?.trim()) {
        const compName = payload.company_name.trim();
        const compSlug = compName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
        
        const { data: company, error: compErr } = await (supabase
          .from("companies") as any)
          .upsert(
            {
              name: compName,
              slug: compSlug,
              website: payload.company_website || null,
              hiring: true,
            },
            { onConflict: "slug" }
          )
          .select("id")
          .single();
        if (compErr) {
          toast.error("Error upserting company: " + compErr.message);
          return;
        }
        companyId = company.id;
      }

      const jobRecord: any = {
        company_id: companyId,
        company_name: payload.company_name?.trim() || "",
        role: payload.role?.trim() || "",
        title: payload.role?.trim() || "",
        seniority_level: payload.seniority_level || null,
        seniority: payload.seniority_level || null,
        job_type: payload.job_type || "full_time",
        location_type: payload.location_type || "remote",
        location: payload.location || "Remote",
        region_scope: payload.region_scope || null,
        apply_url: payload.apply_url?.trim() || "",
        description: payload.description || null,
        salary_min: payload.salary_min ? Number(payload.salary_min) : null,
        salary_max: payload.salary_max ? Number(payload.salary_max) : null,
        comp_min: payload.salary_min ? Number(payload.salary_min) : null,
        comp_max: payload.salary_max ? Number(payload.salary_max) : null,
        salary_currency: payload.salary_currency || "USD",
        comp_currency: payload.salary_currency || "USD",
        salary_period: payload.salary_period || "year",
        is_active: !!payload.is_active,
        is_hot: !!payload.is_hot,
        is_featured: !!payload.is_featured,
      };

      if (payload.stack) {
        jobRecord.stack = typeof payload.stack === "string"
          ? payload.stack.split(",").map((s: string) => s.trim()).filter(Boolean)
          : payload.stack;
      } else {
        jobRecord.stack = [];
      }

      if (payload.country_codes) {
        jobRecord.country_codes = typeof payload.country_codes === "string"
          ? payload.country_codes.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean)
          : payload.country_codes;
      } else {
        jobRecord.country_codes = [];
      }

      const { error: jobErr } = await supabase
        .from("jobs")
        .update(jobRecord)
        .eq("id", editingId);

      if (jobErr) {
        toast.error(jobErr.message);
        return;
      }

      await supabase.from("job_perk_map").delete().eq("job_id", editingId);

      const perkSlugs = (payload.perks ?? []).map((p: string) => p.trim()).filter(Boolean);
      if (perkSlugs.length > 0) {
        const { data: perkRows } = await supabase
          .from("job_perks")
          .select("id, slug")
          .in("slug", perkSlugs);

        if (perkRows?.length) {
          await supabase.from("job_perk_map").insert(
            perkRows.map((perk) => ({
              job_id: editingId,
              perk_id: perk.id,
            }))
          );
        }
      }

      toast.success("Updated");
      setForm({ perks: [] });
      setEditingId(null);
      load();
      return;
    }

    if (section === "resources" && !payload.kind) payload.kind = "article";
    const { error } = await supabase.from(section).update(payload).eq("id", editingId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Updated");
      setForm({});
      setEditingId(null);
      load();
    }
  };

  const del = async (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      setForm(section === "jobs" ? { perks: [] } : {});
    }
    await supabase.from(section).delete().eq("id", id);
    load();
  };

  const fields: Record<Section, { name: string; label: string; type?: string; opts?: string[] }[]> = {
    jobs: [
      { name: "company_name", label: "Company" },
      { name: "company_website", label: "Company Website" },
      { name: "role", label: "Role" },
      { name: "seniority_level", label: "Seniority", opts: ["intern", "junior", "mid", "senior", "staff", "principal", "lead"] },
      { name: "job_type", label: "Job Type", opts: ["full_time", "part_time", "contract", "freelance", "internship"] },
      { name: "location_type", label: "Location Type", opts: ["remote", "hybrid", "onsite"] },
      { name: "location", label: "Location" },
      { name: "region_scope", label: "Region Scope", opts: ["worldwide", "north_america", "latin_america", "europe", "asia"] },
      { name: "country_codes", label: "Country Codes (comma separated)" },
      { name: "apply_url", label: "Apply URL" },
      { name: "stack", label: "Stack (comma separated)" },
      { name: "salary_min", label: "Salary Min", type: "number" },
      { name: "salary_max", label: "Salary Max", type: "number" },
      { name: "salary_currency", label: "Salary Currency" },
      { name: "salary_period", label: "Salary Period", opts: ["year", "month", "week", "day", "hour"] },
      { name: "description", label: "Description" },
    ],
    companies: [
      { name: "name", label: "Name" },
      { name: "website", label: "Website" }, { name: "description_pt", label: "Desc PT" }, { name: "description_en", label: "Desc EN" },
    ],
    resources: [
      { name: "title_pt", label: "Title PT" }, { name: "title_en", label: "Title EN" },
      { name: "category", label: "Category", opts: ["resume", "tools", "interview", "english", "negotiation"] }, { name: "kind", label: "Kind", opts: ["article","link","pdf","sheet","video"] },
      { name: "url", label: "URL" },
    ],
    classes: [
      { name: "title_pt", label: "Title PT" }, { name: "title_en", label: "Title EN" },
      { name: "category", label: "Category" }, { name: "video_url", label: "Video URL (embed)" },
      { name: "duration_min", label: "Duration (min)", type: "number" },
    ],
    help_articles: [
      { name: "title_pt", label: "Title PT" }, { name: "title_en", label: "Title EN" },
      { name: "category", label: "Category" }, { name: "body_pt", label: "Body PT" }, { name: "body_en", label: "Body EN" },
    ],
    english_lessons: [
      { name: "title_pt", label: "Title PT" }, { name: "title_en", label: "Title EN" },
      { name: "level", label: "Level" }, { name: "body_pt", label: "Body PT" }, { name: "body_en", label: "Body EN" },
    ],
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold">{editingId ? `Edit ${section}` : `New ${section}`}</h3>
        {fields[section].map(f => (
          <div key={f.name}>
            <Label>{f.label}</Label>
            {f.opts ? (
              <Select value={form[f.name] ?? ""} onValueChange={v => setForm({ ...form, [f.name]: v })}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ) : f.label.includes("Body") || f.label.includes("Desc") || f.name === "description" ? (
              <Textarea value={form[f.name] ?? ""} onChange={e=>setForm({...form, [f.name]: e.target.value})} />
            ) : (
              <Input type={f.type ?? "text"} value={form[f.name] ?? ""} onChange={e=>setForm({...form, [f.name]: f.type==="number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value})} />
            )}
          </div>
        ))}
        {section === "jobs" && (
          <div className="space-y-1">
            <Label>Perks</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
              {perks.map((perk) => (
                <label key={perk.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.perks?.includes(perk.slug) ?? false}
                    onCheckedChange={(checked) => {
                      setForm((prev: any) => ({
                        ...prev,
                        perks: checked
                          ? [...(prev.perks ?? []), perk.slug]
                          : (prev.perks ?? []).filter((slug: string) => slug !== perk.slug),
                      }));
                    }}
                  />
                  <span>{perk.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {section !== "jobs" && section !== "companies" && (
          <div className="flex items-center gap-2">
            <Switch checked={!!form.is_pro} onCheckedChange={v => setForm({ ...form, is_pro: v })} />
            <Label>Pro only</Label>
          </div>
        )}
        {section === "jobs" && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active (visible in listing)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_hot} onCheckedChange={v => setForm({ ...form, is_hot: v })} />
              <Label>Hot (highlighted)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
          </div>
        )}
        {editingId ? (
          <div className="flex gap-2">
            <Button onClick={update} className="flex-1 gradient-go text-primary-foreground">Update</Button>
            <Button variant="outline" onClick={() => { setEditingId(null); setForm(section === "jobs" ? { perks: [] } : {}); }}>Cancel</Button>
          </div>
        ) : (
          <Button onClick={create} className="w-full gradient-go text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Create</Button>
        )}
      </div>
      <div className="rounded-xl border bg-card p-5 max-h-[600px] overflow-auto">
        <h3 className="font-semibold mb-3">Existing ({items.length})</h3>
        <ul className="space-y-2">
          {items.map(i => (
            <li key={i.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded hover:bg-muted">
              <span className="truncate">{i.title_en ?? i.name ?? i.title ?? i.role ?? i.id}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(i.id);
                    const newForm: any = {};
                    fields[section].forEach(f => {
                      newForm[f.name] = i[f.name] ?? "";
                    });
                    newForm.is_pro = !!i.is_pro;
                    if (section === "jobs") {
                      newForm.is_active = !!i.is_active;
                      newForm.is_hot = !!i.is_hot;
                      newForm.is_featured = !!i.is_featured;
                      if (Array.isArray(i.stack)) {
                        newForm.stack = i.stack.join(", ");
                      }
                      if (Array.isArray(i.country_codes)) {
                        newForm.country_codes = i.country_codes.join(", ");
                      }
                      newForm.perks = i.job_perk_map
                        ? i.job_perk_map.map((pm: any) => pm.job_perks?.slug).filter(Boolean)
                        : [];
                      newForm.company_website = i.companies?.website ?? "";
                      newForm.salary_min = i.salary_min ?? i.comp_min ?? "";
                      newForm.salary_max = i.salary_max ?? i.comp_max ?? "";
                      newForm.salary_currency = i.salary_currency ?? i.comp_currency ?? "USD";
                      newForm.seniority_level = i.seniority_level ?? i.seniority ?? "mid";
                    }
                    setForm(newForm);
                  }}
                  className="text-primary p-1 hover:text-primary/80 transition"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => del(i.id)}
                  className="text-destructive p-1 hover:text-destructive/80 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeatureTogglesList() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ key: "", label: "", description: "", is_enabled: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_toggles")
        .select("*")
        .order("key", { ascending: true });
      if (error) {
        toast.error(error.message);
      } else {
        setItems(data ?? []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load feature toggles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setForm({ key: "", label: "", description: "", is_enabled: false });
    setEditingId(null);
  }, []);

  const handleSubmit = async () => {
    if (!form.key || !form.label) {
      toast.error("Key and Label are required");
      return;
    }
    const cleanKey = form.key
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const payload = {
      key: cleanKey,
      label: form.label,
      description: form.description || null,
      is_enabled: !!form.is_enabled,
    };

    if (editingId) {
      const { error } = await supabase.from("feature_toggles").update(payload).eq("id", editingId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Feature toggle updated");
        setEditingId(null);
        setForm({ key: "", label: "", description: "", is_enabled: false });
        load();
      }
    } else {
      const { error } = await supabase.from("feature_toggles").insert(payload);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Feature toggle created");
        setForm({ key: "", label: "", description: "", is_enabled: false });
        load();
      }
    }
  };

  const handleToggleInstant = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("feature_toggles")
      .update({ is_enabled: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Feature ${!currentStatus ? "enabled" : "disabled"}`);
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, is_enabled: !currentStatus } : item))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature toggle?")) return;
    const { error } = await supabase.from("feature_toggles").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feature toggle deleted");
      if (editingId === id) {
        setEditingId(null);
        setForm({ key: "", label: "", description: "", is_enabled: false });
      }
      load();
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-lg">
          {editingId ? "Edit Feature Toggle" : "New Feature Toggle"}
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="toggle-key">Key (slug format)</Label>
            <Input
              id="toggle-key"
              value={form.key}
              onChange={e => setForm({ ...form, key: e.target.value })}
              placeholder="e.g. show-new-dashboard"
              disabled={!!editingId}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Unique identifier used in code checks. Case-insensitive, hyphen-separated.
            </p>
          </div>
          <div>
            <Label htmlFor="toggle-label">Label</Label>
            <Input
              id="toggle-label"
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Show New Dashboard"
            />
          </div>
          <div>
            <Label htmlFor="toggle-desc">Description</Label>
            <Textarea
              id="toggle-desc"
              value={form.description || ""}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Explain what this toggle controls..."
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch
              id="toggle-enabled"
              checked={!!form.is_enabled}
              onCheckedChange={v => setForm({ ...form, is_enabled: v })}
            />
            <Label htmlFor="toggle-enabled">Enabled by default</Label>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          {editingId ? (
            <>
              <Button onClick={handleSubmit} className="flex-1 gradient-go text-primary-foreground">Update</Button>
              <Button variant="outline" onClick={() => { setEditingId(null); setForm({ key: "", label: "", description: "", is_enabled: false }); }}>Cancel</Button>
            </>
          ) : (
            <Button onClick={handleSubmit} className="w-full gradient-go text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Create Toggle
            </Button>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-xl border bg-card p-5 max-h-[600px] overflow-auto flex flex-col">
        <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
          <span>Active Toggles ({items.length})</span>
          {loading && <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>}
        </h3>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No feature toggles found. Create one on the left.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(i => (
              <div key={i.id} className="flex flex-col justify-between p-4 rounded-lg border bg-card hover:border-primary/50 transition duration-200 min-h-[140px]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{i.label}</span>
                    </div>
                    <code className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground mt-1">{i.key}</code>
                    {i.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2" title={i.description}>{i.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={!!i.is_enabled}
                      onCheckedChange={() => handleToggleInstant(i.id, i.is_enabled)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                  <span className="text-muted-foreground">
                    Updated {new Date(i.updated_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(i.id);
                        setForm({
                          key: i.key,
                          label: i.label,
                          description: i.description ?? "",
                          is_enabled: !!i.is_enabled,
                        });
                      }}
                      className="text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="text-destructive hover:text-destructive/80 flex items-center gap-1 font-medium transition"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

function UserSearchAutocomplete({
  value,
  onChange,
  placeholder = "Search candidate by name or email...",
  disabled = false,
}: {
  value: string;
  onChange: (userId: string, userObj?: UserProfile) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (value && (!selectedUser || selectedUser.id !== value)) {
      (supabase.from("profiles") as any)
        .select("id, full_name, email, avatar_url")
        .eq("id", value)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) setSelectedUser(data as UserProfile);
        });
    } else if (!value) {
      setSelectedUser(null);
    }
  }, [value]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.trim();
      const { data } = await (supabase.from("profiles") as any)
        .select("id, full_name, email, avatar_url")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .order("full_name", { ascending: true })
        .limit(10);
      setResults((data as UserProfile[]) ?? []);
      setLoading(false);
      setIsOpen(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (user: UserProfile) => {
    setSelectedUser(user);
    setQuery("");
    setIsOpen(false);
    onChange(user.id, user);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setQuery("");
    setResults([]);
    onChange("");
  };

  if (selectedUser) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/40 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {selectedUser.full_name?.substring(0, 2).toUpperCase() || "U"}
          </div>
          <div className="truncate">
            <p className="font-medium text-foreground truncate">{selectedUser.full_name || "Unnamed User"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{selectedUser.email || selectedUser.id}</p>
          </div>
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted" onClick={handleClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 h-9 text-xs"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 absolute right-2.5 top-2.5 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none max-h-60 overflow-auto text-xs"
        >
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full text-left p-2.5 hover:bg-muted/80 flex items-center justify-between gap-2 border-b last:border-b-0"
              onClick={() => handleSelect(u)}
            >
              <div className="truncate">
                <p className="font-semibold text-foreground truncate">{u.full_name || "Unnamed User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{u.email || u.id}</p>
              </div>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded shrink-0">Select</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && query.trim() !== "" && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md p-3 text-center text-xs text-muted-foreground">
          No candidates found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function WeeklyAvailabilityScheduler({
  interviewers,
  slots,
  onAddSlot,
  onToggleSlot,
  onDeleteSlot,
  onBulkAdd,
}: {
  interviewers: any[];
  slots: any[];
  onAddSlot: (interviewerId: string, date: string, start: string, end: string) => Promise<void>;
  onToggleSlot: (id: string, current: boolean) => void;
  onDeleteSlot: (id: string) => void;
  onBulkAdd: (interviewerId: string, dates: string[], start: string, end: string) => Promise<void>;
}) {
  const [selectedInterviewer, setSelectedInterviewer] = useState(interviewers.find((i) => i.is_active)?.id || "");
  const [weekOffset, setWeekOffset] = useState(0);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");
  const [showBulk, setShowBulk] = useState(false);
  const [bulkDays, setBulkDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const today = new Date();
  const base = new Date(today);
  base.setDate(today.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(base);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const filteredSlots = slots.filter(
    (s: any) =>
      s.interviewer_id === selectedInterviewer &&
      s.date >= fmtDate(weekStart) &&
      s.date <= fmtDate(weekEnd)
  );

  const handleQuickAdd = async (dateStr: string) => {
    const endH = Number(newStart.split(":")[0]) + 1;
    const autoEnd = newEnd || `${String(endH).padStart(2, "0")}:${newStart.split(":")[1]}`;
    await onAddSlot(selectedInterviewer, dateStr, newStart, autoEnd);
    setAddingDay(null);
  };

  const handleBulkAdd = async () => {
    const dates = bulkDays.map((d) => fmtDate(weekDates[d]));
    const startH = Number(bulkStart.split(":")[0]);
    const endH = Number(bulkEnd.split(":")[0]);
    for (let h = startH; h < endH; h++) {
      const s = `${String(h).padStart(2, "0")}:00`;
      const e = `${String(h + 1).padStart(2, "0")}:00`;
      await onBulkAdd(selectedInterviewer, dates, s, e);
    }
    setShowBulk(false);
  };

  const toggleBulkDay = (d: number) => {
    setBulkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold shrink-0">Interviewer:</Label>
          <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select interviewer" />
            </SelectTrigger>
            <SelectContent>
              {interviewers.filter((i) => i.is_active).map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            className="text-sm font-semibold px-3 py-1 rounded-md hover:bg-muted transition min-w-[180px] text-center"
            onClick={() => setWeekOffset(0)}
          >
            {fmtShort(weekStart)} - {fmtShort(weekEnd)}
          </button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowBulk(!showBulk)}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          {showBulk ? "Cancel Bulk" : "Bulk Add Week"}
        </Button>
      </div>

      {/* Bulk Add Panel */}
      {showBulk && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <h4 className="font-semibold text-sm">Bulk Add Hourly Slots</h4>
          <p className="text-xs text-muted-foreground">Creates 1-hour slots from start to end time for the selected days this week.</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleBulkDay(idx)}
                className={`h-9 w-9 rounded-full text-xs font-bold transition ${
                  bulkDays.includes(idx)
                    ? WEEKDAY_COLORS[idx]
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {label.charAt(0)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="time" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} className="h-8 text-xs w-28" />
            </div>
            <span className="text-muted-foreground mt-5">-</span>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="time" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} className="h-8 text-xs w-28" />
            </div>
            <Button onClick={handleBulkAdd} size="sm" className="gradient-go text-primary-foreground mt-5">
              <Plus className="h-3.5 w-3.5 mr-1" /> Generate Slots
            </Button>
          </div>
        </div>
      )}

      {/* Weekly Grid */}
      {!selectedInterviewer ? (
        <p className="text-sm text-muted-foreground text-center py-12">Select an interviewer above to manage their availability.</p>
      ) : (
        <div className="space-y-1">
          {weekDates.map((date, dayIdx) => {
            const dateStr = fmtDate(date);
            const daySlots = filteredSlots
              .filter((s: any) => s.date === dateStr)
              .sort((a: any, b: any) => (a.start_time > b.start_time ? 1 : -1));
            const isPast = date < new Date(new Date().toDateString());
            const isToday = fmtDate(date) === fmtDate(new Date());

            return (
              <div
                key={dateStr}
                className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                  isToday ? "border-primary/40 bg-primary/5" : isPast ? "opacity-60 bg-muted/20" : "bg-card hover:bg-muted/30"
                }`}
              >
                {/* Day label */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0 w-14">
                  <span
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${WEEKDAY_COLORS[dayIdx]}`}
                  >
                    {WEEKDAY_LABELS[dayIdx].charAt(0)}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex-1 min-h-[36px]">
                  {daySlots.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic leading-9">Unavailable</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {daySlots.map((s: any) => (
                        <div
                          key={s.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            s.is_available
                              ? "bg-card border-border hover:border-primary/40"
                              : "bg-muted/50 border-muted text-muted-foreground line-through"
                          }`}
                        >
                          <span>{s.start_time?.slice(0, 5)}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{s.end_time?.slice(0, 5)}</span>
                          <button
                            onClick={() => onToggleSlot(s.id, s.is_available)}
                            className={`ml-0.5 text-[10px] font-bold px-1 rounded ${
                              s.is_available
                                ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                : "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            }`}
                            title={s.is_available ? "Close slot" : "Reopen slot"}
                          >
                            {s.is_available ? "open" : "booked"}
                          </button>
                          <button
                            onClick={() => onDeleteSlot(s.id)}
                            className="text-destructive/60 hover:text-destructive transition"
                            title="Delete slot"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add button */}
                {!isPast && (
                  <div className="shrink-0">
                    {addingDay === dateStr ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={newStart}
                          onChange={(e) => setNewStart(e.target.value)}
                          className="h-7 text-xs w-24"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input
                          type="time"
                          value={newEnd}
                          onChange={(e) => setNewEnd(e.target.value)}
                          className="h-7 text-xs w-24"
                        />
                        <Button size="sm" className="h-7 px-2 gradient-go text-primary-foreground" onClick={() => handleQuickAdd(dateStr)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-1" onClick={() => setAddingDay(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-full hover:bg-primary/10 text-primary"
                        onClick={() => setAddingDay(dateStr)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MockInterviewAdmin() {
  const [tab, setTab] = useState<"interviewers" | "availability" | "appointments" | "credits" | "packages">("interviewers");
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Forms
  const [intForm, setIntForm] = useState<any>({ name: "", email: "", bio_pt: "", bio_en: "", specialties: "", is_active: true });
  const [slotForm, setSlotForm] = useState<any>({ interviewer_id: "", date: "", start_time: "", end_time: "" });
  const [pkgForm, setPkgForm] = useState<any>({ name_pt: "", name_en: "", description_pt: "", description_en: "", session_count: 1, price_cents: 26900, discount_label: "", sort_order: 1 });
  const [creditForm, setCreditForm] = useState<any>({ user_id: "", package_id: "", sessions_total: 1, sessions_used: 0, status: "paid" });
  const [creditSearch, setCreditSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  // New Appointment Form state
  const [showNewApptForm, setShowNewApptForm] = useState(false);
  const [newAppt, setNewAppt] = useState<any>({
    user_id: "",
    purchase_id: "",
    slot_mode: "existing",
    availability_id: "",
    interviewer_id: "",
    date: "",
    start_time: "",
    end_time: "",
    admin_notes: "",
    instructions: "",
    auto_credit: true,
  });

  const loadInterviewers = async () => {
    const { data } = await supabase.from("mock_interview_interviewers").select("*").order("created_at", { ascending: false });
    setInterviewers(data ?? []);
  };
  const loadSlots = async () => {
    const { data } = await supabase.from("mock_interview_availability").select("*, mock_interview_interviewers(name)").order("date", { ascending: true }).order("start_time", { ascending: true }).limit(200);
    setSlots(data ?? []);
  };
  const loadAppointments = async () => {
    const { data } = await supabase.from("mock_interview_appointments").select("*, mock_interview_interviewers(name), profiles(full_name, email)").order("scheduled_date", { ascending: false }).limit(200);
    setAppointments(data ?? []);
  };
  const loadPackages = async () => {
    const { data } = await supabase.from("mock_interview_packages").select("*").order("sort_order", { ascending: true });
    setPackages(data ?? []);
  };
  const loadPurchases = async () => {
    const { data } = await (supabase.from("mock_interview_purchases") as any)
      .select("*, profiles(full_name, email), mock_interview_packages(name_en, name_pt)")
      .order("created_at", { ascending: false })
      .limit(300);
    setPurchases(data ?? []);
  };
  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true }).limit(500);
    setProfiles(data ?? []);
  };

  useEffect(() => {
    loadInterviewers(); loadSlots(); loadAppointments(); loadPackages(); loadPurchases(); loadProfiles();
  }, []);

  // Interviewers CRUD
  const saveInterviewer = async () => {
    const payload = {
      name: intForm.name,
      email: intForm.email || null,
      bio_pt: intForm.bio_pt || null,
      bio_en: intForm.bio_en || null,
      specialties: intForm.specialties ? intForm.specialties.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      is_active: !!intForm.is_active,
    };
    if (editingId) {
      const { error } = await supabase.from("mock_interview_interviewers").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("mock_interview_interviewers").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setIntForm({ name: "", email: "", bio_pt: "", bio_en: "", specialties: "", is_active: true });
    setEditingId(null);
    loadInterviewers();
  };
  const deleteInterviewer = async (id: string) => {
    await supabase.from("mock_interview_interviewers").delete().eq("id", id);
    loadInterviewers();
  };

  // Availability CRUD
  const addSlot = async () => {
    if (!slotForm.interviewer_id || !slotForm.date || !slotForm.start_time) {
      toast.error("Interviewer, date and start time are required"); return;
    }
    const endTime = slotForm.end_time || (() => {
      const [h, m] = slotForm.start_time.split(":");
      return `${String(Number(h) + 1).padStart(2, "0")}:${m}`;
    })();
    const { error } = await supabase.from("mock_interview_availability").insert({
      interviewer_id: slotForm.interviewer_id,
      date: slotForm.date,
      start_time: slotForm.start_time,
      end_time: endTime,
      is_available: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slot added");
    setSlotForm({ ...slotForm, date: "", start_time: "", end_time: "" });
    loadSlots();
  };
  const toggleSlot = async (id: string, current: boolean) => {
    await supabase.from("mock_interview_availability").update({ is_available: !current }).eq("id", id);
    loadSlots();
  };
  const deleteSlot = async (id: string) => {
    await supabase.from("mock_interview_availability").delete().eq("id", id);
    loadSlots();
  };

  // Appointment actions
  const updateApptStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status.startsWith("canceled")) updates.canceled_at = new Date().toISOString();
    const { error } = await supabase.from("mock_interview_appointments").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }

    // If admin cancels, return the credit
    if (status === "canceled_by_admin") {
      const appt = appointments.find((a) => a.id === id);
      if (appt) {
        const { data: pur } = await supabase
          .from("mock_interview_purchases")
          .select("sessions_used")
          .eq("id", appt.purchase_id)
          .single();
        if (pur) {
          await supabase
            .from("mock_interview_purchases")
            .update({ sessions_used: Math.max(0, pur.sessions_used - 1) })
            .eq("id", appt.purchase_id);
        }
        // Reopen availability
        await supabase.from("mock_interview_availability").update({ is_available: true }).eq("id", appt.availability_id);
      }
    }
    toast.success(`Status updated to ${status}`);
    loadAppointments();
    loadPurchases();
  };
  const updateApptNotes = async (id: string, notes: string) => {
    await supabase.from("mock_interview_appointments").update({ admin_notes: notes }).eq("id", id);
    toast.success("Notes saved");
  };
  const updateApptInstructions = async (id: string, instructions: string) => {
    await supabase.from("mock_interview_appointments").update({ instructions }).eq("id", id);
    toast.success("Instructions saved");
  };

  // Create New Appointment (Admin)
  const createAppointment = async () => {
    if (!newAppt.user_id) {
      toast.error("User is required");
      return;
    }

    let purchaseId = newAppt.purchase_id;

    // If no purchase selected, check if user has active credits or auto-create credit
    if (!purchaseId) {
      const userPurchases = purchases.filter((p) => p.user_id === newAppt.user_id && p.status === "paid" && p.sessions_total > p.sessions_used);
      if (userPurchases.length > 0) {
        purchaseId = userPurchases[0].id;
      } else if (newAppt.auto_credit) {
        // Auto grant 1 credit
        const { data: newPur, error: purErr } = await (supabase.from("mock_interview_purchases") as any)
          .insert({
            user_id: newAppt.user_id,
            sessions_total: 1,
            sessions_used: 0,
            status: "paid",
          })
          .select("id")
          .single();
        if (purErr) {
          toast.error("Failed to auto-grant credit: " + purErr.message);
          return;
        }
        purchaseId = newPur.id;
      } else {
        toast.error("User has no available credits. Enable 'Auto-grant 1 credit' or select/grant a credit first.");
        return;
      }
    }

    let availabilityId = newAppt.availability_id;
    let interviewerId = newAppt.interviewer_id;
    let scheduledDate = newAppt.date;
    let scheduledStart = newAppt.start_time;
    let scheduledEnd = newAppt.end_time;

    if (newAppt.slot_mode === "existing") {
      const selectedSlot = slots.find((s) => s.id === availabilityId);
      if (!selectedSlot) {
        toast.error("Please select an available slot");
        return;
      }
      interviewerId = selectedSlot.interviewer_id;
      scheduledDate = selectedSlot.date;
      scheduledStart = selectedSlot.start_time;
      scheduledEnd = selectedSlot.end_time;

      // Mark existing slot unavailable
      await supabase.from("mock_interview_availability").update({ is_available: false }).eq("id", availabilityId);
    } else {
      // Custom slot mode
      if (!interviewerId || !scheduledDate || !scheduledStart) {
        toast.error("Interviewer, date, and start time are required for custom appointment slot");
        return;
      }
      if (!scheduledEnd) {
        const [h, m] = scheduledStart.split(":");
        scheduledEnd = `${String(Number(h) + 1).padStart(2, "0")}:${m}`;
      }

      // Create new availability slot marked as unavailable (booked)
      const { data: newSlot, error: slotErr } = await supabase
        .from("mock_interview_availability")
        .insert({
          interviewer_id: interviewerId,
          date: scheduledDate,
          start_time: scheduledStart,
          end_time: scheduledEnd,
          is_available: false,
        })
        .select("id")
        .single();

      if (slotErr) {
        toast.error("Failed to create availability slot: " + slotErr.message);
        return;
      }
      availabilityId = newSlot.id;
    }

    // Insert Appointment
    const { error: apptErr } = await supabase.from("mock_interview_appointments").insert({
      user_id: newAppt.user_id,
      purchase_id: purchaseId,
      availability_id: availabilityId,
      interviewer_id: interviewerId,
      scheduled_date: scheduledDate,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      status: "scheduled",
      admin_notes: newAppt.admin_notes || null,
      instructions: newAppt.instructions || null,
    });

    if (apptErr) {
      toast.error("Failed to create appointment: " + apptErr.message);
      return;
    }

    // Increment sessions_used on purchase
    const targetPur = purchases.find((p) => p.id === purchaseId);
    const currentUsed = targetPur ? targetPur.sessions_used : 0;
    await (supabase.from("mock_interview_purchases") as any)
      .update({ sessions_used: currentUsed + 1 })
      .eq("id", purchaseId);

    toast.success("Appointment created successfully!");
    setShowNewApptForm(false);
    setNewAppt({
      user_id: "",
      purchase_id: "",
      slot_mode: "existing",
      availability_id: "",
      interviewer_id: "",
      date: "",
      start_time: "",
      end_time: "",
      admin_notes: "",
      instructions: "",
      auto_credit: true,
    });

    loadAppointments();
    loadSlots();
    loadPurchases();
  };

  // User Credits CRUD
  const saveCredit = async () => {
    if (!creditForm.user_id) {
      toast.error("User is required");
      return;
    }
    const payload: any = {
      user_id: creditForm.user_id,
      package_id: creditForm.package_id || null,
      sessions_total: Number(creditForm.sessions_total) || 1,
      sessions_used: Number(creditForm.sessions_used) || 0,
      status: creditForm.status || "paid",
    };

    if (editingCreditId) {
      const { error } = await (supabase.from("mock_interview_purchases") as any).update(payload).eq("id", editingCreditId);
      if (error) { toast.error(error.message); return; }
      toast.success("Credit record updated");
    } else {
      const { error } = await (supabase.from("mock_interview_purchases") as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Credit granted successfully");
    }
    setCreditForm({ user_id: "", package_id: "", sessions_total: 1, sessions_used: 0, status: "paid" });
    setEditingCreditId(null);
    loadPurchases();
  };

  const deleteCredit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase / credit record?")) return;
    const { error } = await (supabase.from("mock_interview_purchases") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Credit record deleted");
    loadPurchases();
  };

  // Packages CRUD
  const savePackage = async () => {
    const payload = {
      name_pt: pkgForm.name_pt,
      name_en: pkgForm.name_en,
      description_pt: pkgForm.description_pt || null,
      description_en: pkgForm.description_en || null,
      session_count: Number(pkgForm.session_count) || 1,
      price_cents: Number(pkgForm.price_cents) || 26900,
      discount_label: pkgForm.discount_label || null,
      sort_order: Number(pkgForm.sort_order) || 0,
      is_active: pkgForm.is_active !== false,
    };
    if (editingId) {
      const { error } = await supabase.from("mock_interview_packages").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("mock_interview_packages").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setPkgForm({ name_pt: "", name_en: "", description_pt: "", description_en: "", session_count: 1, price_cents: 26900, discount_label: "", sort_order: 1 });
    setEditingId(null);
    loadPackages();
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    canceled_by_user: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    canceled_by_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    no_show: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    rescheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!creditSearch) return true;
    const q = creditSearch.toLowerCase();
    const name = p.profiles?.full_name?.toLowerCase() || "";
    const email = p.profiles?.email?.toLowerCase() || "";
    const status = p.status?.toLowerCase() || "";
    return name.includes(q) || email.includes(q) || status.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["interviewers", "availability", "appointments", "credits", "packages"] as const).map((t) => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => { setTab(t); setEditingId(null); setEditingCreditId(null); }}>
            {t === "interviewers" && <Users className="h-3 w-3 mr-1" />}
            {t === "availability" && <CalendarDays className="h-3 w-3 mr-1" />}
            {t === "appointments" && <Clock className="h-3 w-3 mr-1" />}
            {t === "credits" && <CreditCard className="h-3 w-3 mr-1" />}
            {t === "packages" && <Video className="h-3 w-3 mr-1" />}
            {t === "credits" ? "User Credits" : t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Interviewers */}
      {tab === "interviewers" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold">{editingId ? "Edit Interviewer" : "New Interviewer"}</h3>
            <div><Label>Name *</Label><Input value={intForm.name} onChange={e => setIntForm({ ...intForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={intForm.email} onChange={e => setIntForm({ ...intForm, email: e.target.value })} /></div>
            <div><Label>Bio (PT)</Label><Textarea value={intForm.bio_pt} onChange={e => setIntForm({ ...intForm, bio_pt: e.target.value })} /></div>
            <div><Label>Bio (EN)</Label><Textarea value={intForm.bio_en} onChange={e => setIntForm({ ...intForm, bio_en: e.target.value })} /></div>
            <div><Label>Specialties (comma separated)</Label><Input placeholder="React, System Design, Behavioral" value={intForm.specialties} onChange={e => setIntForm({ ...intForm, specialties: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={!!intForm.is_active} onCheckedChange={v => setIntForm({ ...intForm, is_active: v })} />
              <Label>Active</Label>
            </div>
            {editingId ? (
              <div className="flex gap-2">
                <Button onClick={saveInterviewer} className="flex-1 gradient-go text-primary-foreground">Update</Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setIntForm({ name: "", email: "", bio_pt: "", bio_en: "", specialties: "", is_active: true }); }}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={saveInterviewer} className="w-full gradient-go text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Create</Button>
            )}
          </div>
          <div className="rounded-xl border bg-card p-5 max-h-[600px] overflow-auto">
            <h3 className="font-semibold mb-3">Interviewers ({interviewers.length})</h3>
            <ul className="space-y-2">
              {interviewers.map(i => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded hover:bg-muted">
                  <div>
                    <span className="font-medium">{i.name}</span>
                    {!i.is_active && <span className="text-xs text-muted-foreground ml-2">(inactive)</span>}
                    {i.specialties?.length > 0 && <span className="text-xs text-muted-foreground ml-2">{i.specialties.join(", ")}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingId(i.id); setIntForm({ name: i.name, email: i.email ?? "", bio_pt: i.bio_pt ?? "", bio_en: i.bio_en ?? "", specialties: (i.specialties ?? []).join(", "), is_active: !!i.is_active }); }} className="text-primary p-1"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => deleteInterviewer(i.id)} className="text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Availability */}
      {tab === "availability" && (
        <WeeklyAvailabilityScheduler
          interviewers={interviewers}
          slots={slots}
          onAddSlot={async (interviewerId, date, start, end) => {
            const { error } = await supabase.from("mock_interview_availability").insert({
              interviewer_id: interviewerId,
              date,
              start_time: start,
              end_time: end,
              is_available: true,
            });
            if (error) { toast.error(error.message); return; }
            toast.success("Slot added");
            loadSlots();
          }}
          onToggleSlot={toggleSlot}
          onDeleteSlot={deleteSlot}
          onBulkAdd={async (interviewerId, dates, start, end) => {
            for (const date of dates) {
              await supabase.from("mock_interview_availability").insert({
                interviewer_id: interviewerId,
                date,
                start_time: start,
                end_time: end,
                is_available: true,
              });
            }
            loadSlots();
          }}
        />
      )}

      {/* Appointments */}
      {tab === "appointments" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Appointments ({appointments.length})</h3>
            <Button
              onClick={() => setShowNewApptForm(!showNewApptForm)}
              className="gradient-go text-primary-foreground"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {showNewApptForm ? "Cancel New Appointment" : "New Appointment"}
            </Button>
          </div>

          {/* New Appointment Form */}
          {showNewApptForm && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h4 className="font-semibold border-b pb-2">Create Appointment on behalf of User</h4>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Candidate (User) *</Label>
                  <UserSearchAutocomplete
                    value={newAppt.user_id}
                    onChange={(userId) => setNewAppt({ ...newAppt, user_id: userId, purchase_id: "" })}
                    placeholder="Type candidate name or email to search..."
                  />
                </div>

                <div>
                  <Label>Purchase / Credit Record</Label>
                  <Select value={newAppt.purchase_id} onValueChange={(v) => setNewAppt({ ...newAppt, purchase_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select active credit (or auto-select)" /></SelectTrigger>
                    <SelectContent>
                      {purchases
                        .filter((p) => !newAppt.user_id || p.user_id === newAppt.user_id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.profiles?.full_name || "User"} - {p.sessions_total - p.sessions_used} credits left ({p.sessions_used}/{p.sessions_total} used) - {p.status}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="auto_credit"
                      checked={!!newAppt.auto_credit}
                      onCheckedChange={(c) => setNewAppt({ ...newAppt, auto_credit: !!c })}
                    />
                    <label htmlFor="auto_credit" className="text-xs text-muted-foreground cursor-pointer">
                      Auto-grant 1 credit if candidate has no available credits
                    </label>
                  </div>
                </div>
              </div>

              {/* Slot Mode Choice */}
              <div className="space-y-3 border-t pt-3">
                <Label>Time Slot Selection Mode</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="slot_mode"
                      value="existing"
                      checked={newAppt.slot_mode === "existing"}
                      onChange={() => setNewAppt({ ...newAppt, slot_mode: "existing" })}
                    />
                    <span>Select Open Available Slot</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="slot_mode"
                      value="custom"
                      checked={newAppt.slot_mode === "custom"}
                      onChange={() => setNewAppt({ ...newAppt, slot_mode: "custom" })}
                    />
                    <span>Custom Date & Time</span>
                  </label>
                </div>
              </div>

              {newAppt.slot_mode === "existing" ? (
                <div>
                  <Label>Available Slot *</Label>
                  <Select value={newAppt.availability_id} onValueChange={(v) => setNewAppt({ ...newAppt, availability_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select available slot" /></SelectTrigger>
                    <SelectContent>
                      {slots.filter((s) => s.is_available).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.date} @ {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} ({s.mock_interview_interviewers?.name || "Interviewer"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Interviewer *</Label>
                    <Select value={newAppt.interviewer_id} onValueChange={(v) => setNewAppt({ ...newAppt, interviewer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select interviewer" /></SelectTrigger>
                      <SelectContent>
                        {interviewers.filter((i) => i.is_active).map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Start Time *</Label>
                    <Input type="time" value={newAppt.start_time} onChange={(e) => setNewAppt({ ...newAppt, start_time: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <Label>Admin Internal Notes</Label>
                  <Textarea
                    placeholder="Notes visible only to admins..."
                    value={newAppt.admin_notes}
                    onChange={(e) => setNewAppt({ ...newAppt, admin_notes: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Instructions (visible to Candidate)</Label>
                  <Textarea
                    placeholder="e.g. Google Meet link or Zoom link..."
                    value={newAppt.instructions}
                    onChange={(e) => setNewAppt({ ...newAppt, instructions: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={createAppointment} className="w-full gradient-go text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" /> Create Appointment
              </Button>
            </div>
          )}

          {/* Existing Appointments List */}
          <div className="rounded-xl border bg-card p-5 max-h-[800px] overflow-auto">
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointments yet.</p>
            ) : (
              <div className="space-y-4">
                {appointments.map((a) => (
                  <div key={a.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {a.profiles?.full_name ?? "User"}{" "}
                          <span className="text-muted-foreground text-xs">({a.profiles?.email || a.user_id?.slice(0, 8)})</span>
                        </p>
                        <p className="text-sm">
                          {a.scheduled_date} {a.scheduled_start?.slice(0, 5)} - {a.scheduled_end?.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground">Interviewer: {a.mock_interview_interviewers?.name ?? "N/A"}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[a.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {a.status === "scheduled" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateApptStatus(a.id, "completed")}>Mark Completed</Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateApptStatus(a.id, "canceled_by_admin")}>Cancel & Refund Credit</Button>
                          <Button size="sm" variant="outline" onClick={() => updateApptStatus(a.id, "no_show")}>No Show</Button>
                        </>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Admin Notes</Label>
                        <Textarea
                          defaultValue={a.admin_notes ?? ""}
                          className="text-xs mt-1"
                          rows={2}
                          onBlur={(e) => { if (e.target.value !== (a.admin_notes ?? "")) updateApptNotes(a.id, e.target.value); }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Instructions (visible to user)</Label>
                        <Textarea
                          defaultValue={a.instructions ?? ""}
                          className="text-xs mt-1"
                          rows={2}
                          onBlur={(e) => { if (e.target.value !== (a.instructions ?? "")) updateApptInstructions(a.id, e.target.value); }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Credits Management */}
      {tab === "credits" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold">{editingCreditId ? "Edit User Credits" : "Grant / Add User Credits"}</h3>

            <div>
              <Label>Candidate User *</Label>
              <UserSearchAutocomplete
                value={creditForm.user_id}
                onChange={(userId) => setCreditForm({ ...creditForm, user_id: userId })}
                disabled={!!editingCreditId}
                placeholder="Type candidate name or email to search..."
              />
            </div>

            <div>
              <Label>Package (Optional)</Label>
              <Select
                value={creditForm.package_id || ""}
                onValueChange={(v) => {
                  const selPkg = packages.find((pkg) => pkg.id === v);
                  setCreditForm({
                    ...creditForm,
                    package_id: v,
                    sessions_total: selPkg ? selPkg.session_count : creditForm.sessions_total,
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select package preset" /></SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name_en} ({pkg.session_count} sessions)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Sessions *</Label>
                <Input
                  type="number"
                  min={1}
                  value={creditForm.sessions_total}
                  onChange={(e) => setCreditForm({ ...creditForm, sessions_total: +e.target.value })}
                />
              </div>
              <div>
                <Label>Used Sessions</Label>
                <Input
                  type="number"
                  min={0}
                  value={creditForm.sessions_used}
                  onChange={(e) => setCreditForm({ ...creditForm, sessions_used: +e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={creditForm.status} onValueChange={(v) => setCreditForm({ ...creditForm, status: v })}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">paid (active)</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="canceled">canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingCreditId ? (
              <div className="flex gap-2 pt-2">
                <Button onClick={saveCredit} className="flex-1 gradient-go text-primary-foreground">Update Credits</Button>
                <Button variant="outline" onClick={() => { setEditingCreditId(null); setCreditForm({ user_id: "", package_id: "", sessions_total: 1, sessions_used: 0, status: "paid" }); }}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={saveCredit} className="w-full gradient-go text-primary-foreground pt-2">
                <Plus className="h-4 w-4 mr-1" /> Grant Credits
              </Button>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border bg-card p-5 max-h-[700px] overflow-auto flex flex-col">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 className="font-semibold text-lg">User Credit Purchases ({filteredPurchases.length})</h3>
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search candidate name or email..."
                  value={creditSearch}
                  onChange={(e) => setCreditSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {filteredPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No user credit records found.</p>
            ) : (
              <div className="space-y-3">
                {filteredPurchases.map((p) => {
                  const remaining = Math.max(0, p.sessions_total - p.sessions_used);
                  return (
                    <div key={p.id} className="p-3 rounded-lg border flex items-center justify-between gap-3 text-sm flex-wrap hover:bg-muted/50 transition">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">
                          {p.profiles?.full_name || "User"}{" "}
                          <span className="text-xs text-muted-foreground">({p.profiles?.email || p.user_id.slice(0, 8)})</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Package: {p.mock_interview_packages?.name_en || "Custom / Direct"} | Status: <span className="font-medium text-foreground">{p.status}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-primary">
                            {remaining} credit{remaining === 1 ? "" : "s"} available
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.sessions_used} of {p.sessions_total} used
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCreditId(p.id);
                              setCreditForm({
                                user_id: p.user_id,
                                package_id: p.package_id || "",
                                sessions_total: p.sessions_total,
                                sessions_used: p.sessions_used,
                                status: p.status,
                              });
                            }}
                            className="text-primary p-1 hover:text-primary/80"
                            title="Edit credits"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCredit(p.id)}
                            className="text-destructive p-1 hover:text-destructive/80"
                            title="Delete credit record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Packages */}
      {tab === "packages" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="font-semibold">{editingId ? "Edit Package" : "New Package"}</h3>
            <div><Label>Name PT *</Label><Input value={pkgForm.name_pt} onChange={e => setPkgForm({ ...pkgForm, name_pt: e.target.value })} /></div>
            <div><Label>Name EN *</Label><Input value={pkgForm.name_en} onChange={e => setPkgForm({ ...pkgForm, name_en: e.target.value })} /></div>
            <div><Label>Description PT</Label><Textarea value={pkgForm.description_pt} onChange={e => setPkgForm({ ...pkgForm, description_pt: e.target.value })} /></div>
            <div><Label>Description EN</Label><Textarea value={pkgForm.description_en} onChange={e => setPkgForm({ ...pkgForm, description_en: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Session Count *</Label><Input type="number" min={1} value={pkgForm.session_count} onChange={e => setPkgForm({ ...pkgForm, session_count: +e.target.value })} /></div>
              <div><Label>Price (cents BRL) *</Label><Input type="number" min={100} value={pkgForm.price_cents} onChange={e => setPkgForm({ ...pkgForm, price_cents: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount Label</Label><Input placeholder="e.g. SAVE 13%" value={pkgForm.discount_label} onChange={e => setPkgForm({ ...pkgForm, discount_label: e.target.value })} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={pkgForm.sort_order} onChange={e => setPkgForm({ ...pkgForm, sort_order: +e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pkgForm.is_active !== false} onCheckedChange={v => setPkgForm({ ...pkgForm, is_active: v })} />
              <Label>Active</Label>
            </div>
            {editingId ? (
              <div className="flex gap-2">
                <Button onClick={savePackage} className="flex-1 gradient-go text-primary-foreground">Update</Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setPkgForm({ name_pt: "", name_en: "", description_pt: "", description_en: "", session_count: 1, price_cents: 26900, discount_label: "", sort_order: 1 }); }}>Cancel</Button>
              </div>
            ) : (
              <Button onClick={savePackage} className="w-full gradient-go text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Create</Button>
            )}
          </div>
          <div className="rounded-xl border bg-card p-5 max-h-[600px] overflow-auto">
            <h3 className="font-semibold mb-3">Packages ({packages.length})</h3>
            <ul className="space-y-2">
              {packages.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded hover:bg-muted">
                  <div>
                    <span className="font-medium">{p.name_en}</span>
                    <span className="text-muted-foreground ml-2">{p.session_count}x R${(p.price_cents / 100).toFixed(0)}</span>
                    {!p.is_active && <span className="text-xs text-muted-foreground ml-2">(inactive)</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => {
                      setEditingId(p.id);
                      setPkgForm({
                        name_pt: p.name_pt, name_en: p.name_en,
                        description_pt: p.description_pt ?? "", description_en: p.description_en ?? "",
                        session_count: p.session_count, price_cents: p.price_cents,
                        discount_label: p.discount_label ?? "", sort_order: p.sort_order,
                        is_active: p.is_active,
                      });
                      setTab("packages");
                    }} className="text-primary p-1"><Pencil className="h-3 w-3" /></button>
                    <button onClick={async () => { await supabase.from("mock_interview_packages").delete().eq("id", p.id); loadPackages(); }} className="text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const JOB_FIELD_DEFS: { name: string; label: string; type?: string; opts?: string[] }[] = [
  { name: "company_name", label: "Company" },
  { name: "role", label: "Role" },
  { name: "seniority_level", label: "Seniority", opts: ["intern", "junior", "mid", "senior", "staff", "principal", "lead"] },
  { name: "job_type", label: "Job Type", opts: ["full_time", "part_time", "contract", "freelance", "internship"] },
  { name: "location_type", label: "Location Type", opts: ["remote", "hybrid", "onsite"] },
  { name: "location", label: "Location" },
  { name: "region_scope", label: "Region Scope", opts: ["worldwide", "north_america", "latin_america", "europe", "asia"] },
  { name: "country_codes", label: "Country Codes (comma separated)" },
  { name: "apply_url", label: "Apply URL" },
  { name: "stack", label: "Stack (comma separated)" },
  { name: "salary_min", label: "Salary Min", type: "number" },
  { name: "salary_max", label: "Salary Max", type: "number" },
  { name: "salary_currency", label: "Salary Currency" },
  { name: "salary_period", label: "Salary Period", opts: ["year", "month", "week", "day", "hour"] },
  { name: "english_level", label: "English Level" },
  { name: "description", label: "Description" },
];

function JobEditDialog({ job, onClose, onSaved }: { job: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(() => ({
    company_name: job.company_name ?? "",
    role: job.role ?? "",
    seniority_level: job.seniority_level ?? "",
    job_type: job.job_type ?? "full_time",
    location_type: job.location_type ?? "remote",
    location: job.location ?? "Remote",
    region_scope: job.region_scope ?? "",
    country_codes: Array.isArray(job.country_codes) ? job.country_codes.join(", ") : (job.country_codes ?? ""),
    apply_url: job.apply_url ?? "",
    stack: Array.isArray(job.stack) ? job.stack.join(", ") : (job.stack ?? ""),
    salary_min: job.salary_min ?? "",
    salary_max: job.salary_max ?? "",
    salary_currency: job.salary_currency ?? "USD",
    salary_period: job.salary_period ?? "year",
    english_level: job.english_level ?? "",
    description: job.description ?? "",
    status: job.status ?? "published",
    is_active: job.is_active !== false,
    is_hot: !!job.is_hot,
    is_featured: !!job.is_featured,
    perks: (job.job_perk_map ?? []).map((m: { job_perks?: { slug?: string | null } | null }) => m.job_perks?.slug).filter(Boolean) as string[],
  }));
  const [perks, setPerks] = useState<{ id: string; slug: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("job_perks").select("id,slug,label").order("label").then(({ data }) => setPerks(data ?? []));
  }, []);

  const save = async () => {
    setSaving(true);

    let companyId = job.company_id ?? null;
    if (form.company_name?.trim()) {
      const compName = form.company_name.trim();
      const compSlug = compName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

      const { data: company, error: compErr } = await (supabase
        .from("companies") as any)
        .upsert({ name: compName, slug: compSlug, hiring: true }, { onConflict: "slug" })
        .select("id")
        .single();
      if (compErr) {
        toast.error("Error upserting company: " + compErr.message);
        setSaving(false);
        return;
      }
      companyId = company.id;
    }

    const num = (v: string | number | null | undefined) => v !== "" && v != null ? Number(v) : null;
    const record: any = {
      company_id: companyId,
      company_name: form.company_name?.trim() || "",
      role: form.role?.trim() || "",
      title: form.role?.trim() || "",
      seniority_level: form.seniority_level || null,
      seniority: form.seniority_level || null,
      job_type: form.job_type || "full_time",
      location_type: form.location_type || "remote",
      location: form.location || "Remote",
      region_scope: form.region_scope || null,
      country_codes: form.country_codes ? String(form.country_codes).split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean) : [],
      apply_url: form.apply_url?.trim() || "",
      description: form.description || null,
      stack: form.stack ? String(form.stack).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      salary_min: num(form.salary_min),
      salary_max: num(form.salary_max),
      comp_min: num(form.salary_min),
      comp_max: num(form.salary_max),
      salary_currency: form.salary_currency || "USD",
      comp_currency: form.salary_currency || "USD",
      salary_period: form.salary_period || "year",
      english_level: form.english_level?.trim() || null,
      status: form.status || "published",
      is_active: !!form.is_active,
      is_hot: !!form.is_hot,
      is_featured: !!form.is_featured,
    };

    const { error: jobErr } = await supabase.from("jobs").update(record).eq("id", job.id);
    setSaving(false);
    if (jobErr) {
      toast.error(jobErr.message);
      return;
    }

    await supabase.from("job_perk_map").delete().eq("job_id", job.id);

    const perkSlugs = (form.perks ?? []).map((p: string) => p.trim()).filter(Boolean);
    if (perkSlugs.length > 0) {
      const { data: perkRows } = await supabase.from("job_perks").select("id, slug").in("slug", perkSlugs);
      if (perkRows?.length) {
        await supabase.from("job_perk_map").insert(
          perkRows.map((perk) => ({ job_id: job.id, perk_id: perk.id }))
        );
      }
    }

    toast.success("Job updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Job</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {JOB_FIELD_DEFS.map(f => (
            <div key={f.name}>
              <Label>{f.label}</Label>
              {f.opts ? (
                <Select value={form[f.name] ?? ""} onValueChange={v => setForm({ ...form, [f.name]: v })}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>{f.opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : f.name === "description" ? (
                <Textarea value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
              ) : (
                <Input type={f.type ?? "text"} value={form[f.name] ?? ""} onChange={e => setForm({ ...form, [f.name]: f.type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value })} />
              )}
            </div>
          ))}

          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "published"} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["published", "pending", "rejected", "archived"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active (visible in listing)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_hot} onCheckedChange={v => setForm({ ...form, is_hot: v })} />
              <Label>Hot (highlighted)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.is_featured} onCheckedChange={v => setForm({ ...form, is_featured: v })} />
              <Label>Featured</Label>
            </div>
          </div>

          {job.external_id ? (
            <p className="text-xs text-muted-foreground pt-1">
              This listing is synced from {job.source ?? "Onstrider"} (external id {job.external_id}). Manual edits to source fields such as company, role, salary, and apply URL may be overwritten by the next scrape.
            </p>
          ) : null}

          <div>
            <Label>Perks</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
              {perks.map((perk) => (
                <label key={perk.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={(form.perks ?? []).includes(perk.slug)}
                    onCheckedChange={(checked) => {
                      setForm((prev: any) => ({
                        ...prev,
                        perks: checked
                          ? [...(prev.perks ?? []), perk.slug]
                          : (prev.perks ?? []).filter((slug: string) => slug !== perk.slug),
                      }));
                    }}
                  />
                  <span>{perk.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JobsAdmin({ onPendingCountChange }: { onPendingCountChange?: (count: number) => void }) {
  const [filter, setFilter] = useState<"pending" | "published" | "rejected" | "all">("pending");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);

  const PAGE_SIZE = 20;

  const loadPendingCount = async () => {
    const { count } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    const countVal = count ?? 0;
    setPendingCount(countVal);
    if (onPendingCountChange) onPendingCountChange(countVal);
  };

  const loadJobs = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order("posted_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter as any);
    }

    if (search.trim()) {
      query = query.or(`role.ilike.%${search.trim()}%,company_name.ilike.%${search.trim()}%,submitted_by.ilike.%${search.trim()}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      toast.error(error.message);
    } else {
      setItems(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    loadPendingCount();
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, search]);

  const moderate = async (id: string, action: "approve" | "reject") => {
    setActioning(id);
    const { error } = await supabase.functions.invoke("jobs-moderate", {
      body: { jobId: id, action },
    });
    setActioning(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(action === "approve" ? "Job approved" : "Job rejected");
      loadJobs();
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job permanently?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Job deleted permanently");
      loadJobs();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      {editingJob && (
        <JobEditDialog
          key={editingJob.id}
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSaved={() => { setEditingJob(null); loadJobs(); }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Jobs Approval</h2>
          <p className="text-sm text-muted-foreground">
            Review and moderate community submitted jobs. Pending items require approval before appearing on the public board. Admins can edit any listing, including scraped ones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold">
              {pendingCount} Pending Approval
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex border rounded-lg p-1 bg-muted/30">
          {(["pending", "published", "rejected", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setFilter(tab); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition ${
                filter === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search jobs, company, or user ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <p className="text-muted-foreground text-sm">No jobs found for status "{filter}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(j => (
            <div key={j.id} className="border rounded-xl bg-card p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base">{j.role}</h3>
                  <span className="text-sm text-muted-foreground">@ {j.company_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${
                    j.status === "published" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                    j.status === "rejected" ? "bg-rose-500/10 text-rose-600 border-rose-500/30" :
                    "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }`}>
                    {j.status}
                  </span>
                </div>
                {j.description && <p className="text-xs text-muted-foreground/80 line-clamp-2">{j.description}</p>}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(j.stack ?? []).map((s: string) => (
                    <span key={s} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-3 flex-wrap">
                  <span>User: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{j.submitted_by ?? "n/a"}</code></span>
                  <span>Submitted: {new Date(j.posted_at).toLocaleString()}</span>
                  {j.location_type && <span>{j.location_type}</span>}
                  {j.seniority_level && <span>{j.seniority_level}</span>}
                  {j.salary_min || j.salary_max ? (
                    <span>{(j.salary_min || "")} - {(j.salary_max || "")} {j.salary_currency}</span>
                  ) : null}
                  {j.apply_url && (
                    <a href={j.apply_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                      Apply <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditingJob(j)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                {j.status !== "published" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actioning === j.id} onClick={() => moderate(j.id, "approve")}>
                    {actioning === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Approve
                  </Button>
                )}
                {j.status !== "rejected" && (
                  <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" disabled={actioning === j.id} onClick={() => moderate(j.id, "reject")}>
                    Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteJob(j.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total jobs)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectsAdmin({ onPendingCountChange }: { onPendingCountChange?: (count: number) => void }) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", tagline: "", description: "", url: "", image_url: "", stack: "" });

  const PAGE_SIZE = 20;

  const loadPendingCount = async () => {
    const { count } = await supabase
      .from("side_projects")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    const countVal = count ?? 0;
    setPendingCount(countVal);
    if (onPendingCountChange) onPendingCountChange(countVal);
  };

  const loadProjects = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("side_projects")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,tagline.ilike.%${search.trim()}%,user_id.ilike.%${search.trim()}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      toast.error(error.message);
    } else {
      setItems(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    loadPendingCount();
  };

  useEffect(() => {
    loadProjects();
  }, [filter, page, search]);

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    const { error } = await supabase
      .from("side_projects")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Project ${newStatus}`);
      loadProjects();
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project permanently?")) return;
    const { error } = await supabase.from("side_projects").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Project deleted permanently");
      loadProjects();
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({
      title: p.title || "",
      tagline: p.tagline || "",
      description: p.description || "",
      url: p.url || "",
      image_url: p.image_url || "",
      stack: (p.stack || []).join(", ")
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const payload = {
      title: editForm.title,
      tagline: editForm.tagline,
      description: editForm.description,
      url: editForm.url,
      image_url: editForm.image_url,
      stack: editForm.stack.split(",").map(s => s.trim()).filter(Boolean),
    };
    const { error } = await supabase.from("side_projects").update(payload).eq("id", editingId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Project updated");
      setEditOpen(false);
      loadProjects();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></div>
            <div><Label>Tagline</Label><Input value={editForm.tagline} onChange={e => setEditForm({...editForm, tagline: e.target.value})} /></div>
            <div><Label>URL</Label><Input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} /></div>
            <div><Label>Image URL</Label><Input value={editForm.image_url} onChange={e => setEditForm({...editForm, image_url: e.target.value})} /></div>
            <div><Label>Stack (comma-separated)</Label><Input value={editForm.stack} onChange={e => setEditForm({...editForm, stack: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /></div>
            <Button onClick={saveEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Side Projects Approval</h2>
          <p className="text-sm text-muted-foreground">
            Review and moderate community submitted projects. Pending items require approval before appearing on the public showcase.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="bg-amber-500/10 text-amber-600 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold">
              {pendingCount} Pending Approval
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex border rounded-lg p-1 bg-muted/30">
          {(["pending", "approved", "rejected", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setFilter(tab); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition ${
                filter === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search projects or user ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <p className="text-muted-foreground text-sm">No projects found for status "{filter}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(p => (
            <div key={p.id} className="border rounded-xl bg-card p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="flex gap-4 items-start min-w-0 flex-1">
                {p.image_url ? (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover relative z-10" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div className="absolute inset-0 gradient-hero z-0"></div>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg gradient-hero flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground font-semibold">
                    No image
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{p.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize border ${
                      p.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                      p.status === "rejected" ? "bg-rose-500/10 text-rose-600 border-rose-500/30" :
                      "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-muted-foreground">Upvotes: {p.upvotes}</span>
                  </div>
                  {p.tagline && <p className="text-sm text-muted-foreground truncate">{p.tagline}</p>}
                  {p.description && <p className="text-xs text-muted-foreground/80 line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(p.stack ?? []).map((s: string) => (
                      <span key={s} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-3 flex-wrap">
                    <span>User: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{p.user_id}</code></span>
                    <span>Submitted: {new Date(p.created_at).toLocaleString()}</span>
                    {p.url && (
                      <a href={p.url.includes("?") ? `${p.url}&utm_source=remotedevsbr.com` : `${p.url}?utm_source=remotedevsbr.com`} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {p.status !== "approved" && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(p.id, "approved")}>
                    Approve
                  </Button>
                )}
                {p.status !== "rejected" && (
                  <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => updateStatus(p.id, "rejected")}>
                    Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteProject(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total projects)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Inner() {
  const [pendingProjectsCount, setPendingProjectsCount] = useState(0);
  const [pendingJobsCount, setPendingJobsCount] = useState(0);

  useEffect(() => {
    const fetchPendingProjectsCount = async () => {
      const { count } = await supabase
        .from("side_projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingProjectsCount(count ?? 0);
    };
    const fetchPendingJobsCount = async () => {
      const { count } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingJobsCount(count ?? 0);
    };
    fetchPendingProjectsCount();
    fetchPendingJobsCount();
  }, []);

  return (
    <AppLayout>
      <SEO
        title="Admin | RemoteDevs BR"
        description="Administrative panel for RemoteDevs BR."
        canonicalPath="/admin"
      />
      <div className="container py-10">
        <h1 className="text-4xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> Admin</h1>
        <p className="text-muted-foreground mt-2 mb-8">Manage all platform content and settings.</p>
        <Tabs defaultValue="jobs">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="jobs" className="relative">
              Jobs
              {pendingJobsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                  {pendingJobsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="projects" className="relative">
              Projects
              {pendingProjectsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                  {pendingProjectsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="help_articles">Help</TabsTrigger>
            <TabsTrigger value="english_lessons">English</TabsTrigger>
            <TabsTrigger value="feature_toggles">Feature Toggles</TabsTrigger>
            <TabsTrigger value="mock_interviews">Mock Interviews</TabsTrigger>
          </TabsList>
          {(["companies","resources","classes","help_articles","english_lessons"] as Section[]).map(s => (
            <TabsContent key={s} value={s} className="mt-6"><CrudList section={s} /></TabsContent>
          ))}
          <TabsContent value="jobs" className="mt-6">
            <JobsAdmin onPendingCountChange={setPendingJobsCount} />
          </TabsContent>
          <TabsContent value="projects" className="mt-6">
            <ProjectsAdmin onPendingCountChange={setPendingProjectsCount} />
          </TabsContent>
          <TabsContent value="feature_toggles" className="mt-6">
            <FeatureTogglesList />
          </TabsContent>
          <TabsContent value="mock_interviews" className="mt-6">
            <MockInterviewAdmin />
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground mt-8">To become an admin, use the database panel and add a row in <code>user_roles</code> with your user_id and role=admin.</p>
      </div>
    </AppLayout>
  );
}
export default function Admin() { return <RequireAdmin><Inner /></RequireAdmin>; }
