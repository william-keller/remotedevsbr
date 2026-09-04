"use client";

import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RequireAuth } from "@/components/Guards";
import Link from "next/link";
import { Camera, Loader2, Video, CalendarDays, ShoppingCart } from "lucide-react";

type FormState = {
  full_name: string;
  current_job_title: string;
  years_experience: string;
  english_level: string;
  stack: string;
  salary_expectation_usd: string;
  remote_goals: string;
  bio: string;
  github_url: string;
  linkedin_url: string;
  locale: "pt" | "en";
  visible_to_recruiters: boolean;
};

function Inner() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: "",
    current_job_title: "",
    years_experience: "",
    english_level: "",
    stack: "",
    salary_expectation_usd: "",
    remote_goals: "",
    bio: "",
    github_url: "",
    linkedin_url: "",
    locale: "pt",
    visible_to_recruiters: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!user) return;
    if (!window.confirm(t("profile.deleteConfirm"))) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        method: 'POST'
      });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (profile) setForm({
      full_name: profile.full_name ?? "",
      current_job_title: profile.current_job_title ?? "",
      years_experience: profile.years_experience != null ? String(profile.years_experience) : "",
      english_level: profile.english_level ?? "",
      stack: (profile.stack ?? []).join(", "),
      salary_expectation_usd: profile.salary_expectation_usd != null ? String(profile.salary_expectation_usd) : "",
      remote_goals: profile.remote_goals ?? "",
      bio: profile.bio ?? "",
      github_url: profile.github_url ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      locale: profile.locale,
      visible_to_recruiters: profile.visible_to_recruiters ?? false,
    });
  }, [profile]);

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("profile.maxAvatarSize")); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updErr) throw updErr;
      toast.success(t("profile.avatarUpdated"));
      refreshProfile();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      current_job_title: form.current_job_title.trim() || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      english_level: form.english_level,
      stack: form.stack.split(",").map(s => s.trim()).filter(Boolean),
      salary_expectation_usd: form.salary_expectation_usd ? Number(form.salary_expectation_usd) : null,
      remote_goals: form.remote_goals.trim() || null,
      bio: form.bio,
      github_url: form.github_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      locale: form.locale,
      visible_to_recruiters: form.visible_to_recruiters,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(t("profile.saved")); refreshProfile(); }
  };

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setForm(s => ({ ...s, [k]: v }));

  return (
    <AppLayout>
      <SEO
        title={`${t("profile.title")} | RemoteDevs BR`}
        description="Gerencie seu perfil profissional e controle a visibilidade para recrutadores."
        canonicalPath="/profile"
      />
      <div className="container max-w-2xl py-10 space-y-6">
        <h1 className="text-3xl font-bold">{t("profile.title")}</h1>

        {/* Avatar */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-6">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{(profile?.full_name ?? "U").slice(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatar} />
          </div>
          <div>
            <p className="font-semibold">{profile?.full_name ?? user?.email}</p>
            <p className="text-sm text-muted-foreground">{t("profile.avatarHint")}</p>
          </div>
        </div>

        {/* Professional profile */}
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div><Label>{t("auth.fullName")}</Label><Input value={form.full_name} onChange={e=>set("full_name")(e.target.value)} /></div>
          <div><Label>{t("profile.currentJob")}</Label><Input placeholder={t("profile.currentJobPlaceholder")} value={form.current_job_title} onChange={e=>set("current_job_title")(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("profile.yearsExperience")}</Label><Input type="number" min={0} max={50} placeholder="3" value={form.years_experience} onChange={e=>set("years_experience")(e.target.value)} /></div>
            <div><Label>{t("profile.englishLevel")}</Label>
              <Select value={form.english_level} onValueChange={v=>set("english_level")(v)}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {["A1","A2","B1","B2","C1","C2"].map(l=><SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>{t("profile.stack")}</Label><Input value={form.stack} onChange={e=>set("stack")(e.target.value)} placeholder={t("profile.stackPlaceholder")} /></div>
          <div><Label>{t("profile.language")}</Label>
            <Select value={form.locale} onValueChange={(v: "pt"|"en")=>set("locale")(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Portugu&#234;s</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t("profile.bio")}</Label><Textarea value={form.bio} onChange={e=>set("bio")(e.target.value)} /></div>
        </div>

        {/* Remote opportunities */}
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div><Label>{t("profile.salaryExpectation")}</Label><Input type="number" min={0} placeholder="90000" value={form.salary_expectation_usd} onChange={e=>set("salary_expectation_usd")(e.target.value)} /></div>
          <div><Label>{t("profile.remoteGoals")}</Label><Textarea rows={3} placeholder={t("profile.remoteGoalsPlaceholder")} value={form.remote_goals} onChange={e=>set("remote_goals")(e.target.value)} /></div>
          <div><Label>{t("profile.githubUrl")}</Label><Input placeholder="https://github.com/username" value={form.github_url} onChange={e=>set("github_url")(e.target.value)} /></div>
          <div><Label>{t("profile.linkedinUrl")}</Label><Input placeholder="https://linkedin.com/in/profile" value={form.linkedin_url} onChange={e=>set("linkedin_url")(e.target.value)} /></div>
        </div>

        {/* Recruiter visibility */}
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="visible" 
              checked={form.visible_to_recruiters}
              onChange={e => set("visible_to_recruiters")(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="visible" className="font-medium">{t("profile.visible")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{t("profile.visibleHint")}</p>

          <Button onClick={save} disabled={saving} className="gradient-go text-primary-foreground">{t("common.save")}</Button>
        </div>

        {/* Mock Interview History */}
        {user && <MockInterviewSection userId={user.id} />}

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">{t("profile.dangerZone")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("profile.deleteWarning")}</p>
          <Button 
            variant="destructive" 
            onClick={deleteAccount} 
            disabled={deleting}
          >
            {deleting ? t("profile.deleting") : t("profile.deleteButton")}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function MockInterviewSection({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: purchases } = await supabase
        .from("mock_interview_purchases")
        .select("id, sessions_total, sessions_used")
        .eq("user_id", userId)
        .eq("status", "paid");
      const p = purchases ?? [];
      const totalCredits = p.reduce((sum: number, x: any) => sum + (x.sessions_total - x.sessions_used), 0);
      setCredits(totalCredits);

      const { data: appts } = await supabase
        .from("mock_interview_appointments")
        .select("*, mock_interview_interviewers(name)")
        .eq("user_id", userId)
        .order("scheduled_date", { ascending: false });
      setAppointments(appts ?? []);
    } catch (e: any) {
      console.error("Failed to load mock interview profile data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const cancelAppointment = async (appt: any) => {
    if (!window.confirm(t("mockInterview.profile.cancelConfirm"))) return;
    setCancelingId(appt.id);
    try {
      const { error: apptErr } = await supabase
        .from("mock_interview_appointments")
        .update({ status: "canceled_by_user", canceled_at: new Date().toISOString() })
        .eq("id", appt.id);
      if (apptErr) throw apptErr;

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

      if (appt.availability_id) {
        await supabase
          .from("mock_interview_availability")
          .update({ is_available: true })
          .eq("id", appt.availability_id);
      }

      toast.success(t("mockInterview.profile.canceledToast"));
      loadData();
    } catch (e: any) {
      toast.error(e.message ?? t("mockInterview.profile.cancelFailed"));
    } finally {
      setCancelingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    canceled_by_user: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    canceled_by_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    no_show: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    rescheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {t("mockInterview.profile.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {credits} {t("mockInterview.profile.creditsAvailable")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {credits > 0 && (
            <Button size="sm" asChild className="gradient-go text-primary-foreground">
              <Link href="/mock-interview/book">
                <CalendarDays className="h-4 w-4 mr-1.5" />
                {t("mockInterview.book.title")}
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/mock-interview">
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              {t("mockInterview.profile.buyMore")}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse py-4">{t("common.loading")}</p>
      ) : appointments.length === 0 ? (
        <div className="text-center py-6 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground mb-3">{t("mockInterview.profile.noAppointments")}</p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/mock-interview">{t("mockInterview.heroCta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-lg border p-4 space-y-2 bg-background">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">
                    {a.scheduled_date} &bull; {a.scheduled_start?.slice(0, 5)} - {a.scheduled_end?.slice(0, 5)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("mockInterview.book.interviewer")}: {a.mock_interview_interviewers?.name ?? t("mockInterview.profile.assignedInterviewer")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[a.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {t(`mockInterview.status.${a.status}`) || a.status}
                  </span>
                  {a.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      disabled={cancelingId === a.id}
                      onClick={() => cancelAppointment(a)}
                    >
                      {cancelingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t("mockInterview.profile.cancelBtn")}
                    </Button>
                  )}
                </div>
              </div>
              {a.instructions && (
                <div className="mt-2 text-xs bg-muted p-2.5 rounded-md border text-muted-foreground whitespace-pre-line">
                  <span className="font-semibold block text-foreground mb-1">{t("mockInterview.profile.instructions")}</span>
                  {a.instructions}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() { return <RequireAuth><Inner /></RequireAuth>; }
