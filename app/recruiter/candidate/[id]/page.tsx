"use client";

import { useEffect, useState, useRef } from "react";
import { SEO } from "@/components/SEO";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { RecruiterLayout } from "@/components/RecruiterLayout";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Send, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const INCOME_LABELS: Record<string, string> = {
  lt_5k: "recruiter.income.lt_5k",
  r5_6_5k: "recruiter.income.r5_6_5k",
  r6_5_8k: "recruiter.income.r6_5_8k",
  r8_10k: "recruiter.income.r8_10k",
  r10_15k: "recruiter.income.r10_15k",
  r15_20k: "recruiter.income.r15_20k",
  gt_20k: "recruiter.income.gt_20k",
};

export default function RecruiterCandidateView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [alreadyInterested, setAlreadyInterested] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchCandidate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("recruiter-candidate", {
          body: { candidate_id: id }
        });
        
        if (error) throw error;
        setCandidate(data.candidate);
        setPlan(data.plan || "free");

        // Check if already contacted
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: rec } = await supabase.from("recruiter_profiles").select("id").eq("user_id", user.id).single();
            if (rec) {
               const { data: interest } = await supabase.from("candidate_interests").select("id").eq("recruiter_id", rec.id).eq("candidate_id", id).maybeSingle();
               if (interest) setAlreadyInterested(true);
            }
        }
      } catch (e: any) {
        toast.error(t("recruiter.candidate.loadFailed") + ": " + e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id]);

  useEffect(() => {
    if (!loading && candidate && !candidate.is_blurred && searchParams.get("contact") === "1") {
      // Small timeout to ensure element is rendered and interactive
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, candidate, searchParams]);

  const handleInterest = async () => {
    if (!message.trim()) {
        toast.error(t("recruiter.candidate.messageRequired"));
        return;
    }
    setSending(true);
    try {
        const { error } = await supabase.functions.invoke("recruiter-interest", {
            body: { candidate_id: id, message }
        });
        if (error) throw error;
        toast.success(t("recruiter.candidate.sent"));
        setAlreadyInterested(true);
    } catch (e: any) {
        toast.error(t("recruiter.candidate.sendFailed") + ": " + e.message);
    } finally {
        setSending(false);
    }
  };

  if (loading) return <RecruiterLayout><div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div></RecruiterLayout>;
  if (!candidate) return <RecruiterLayout><div className="p-10 text-center">{t("recruiter.candidate.notFound")}</div></RecruiterLayout>;

  return (
    <RecruiterLayout>
      <SEO
        title="Perfil do Candidato | RemoteDevs BR"
        description="Veja o perfil detalhado do candidato e entre em contato."
        canonicalPath={`/recruiter/candidate/${id}`}
      />
      <div className="container py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 -ml-4">
            <Link href="/recruiter/search"><ArrowLeft className="w-4 h-4 mr-2" /> {t("recruiter.candidate.back")}</Link>
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <div className="flex items-start gap-6 bg-card p-6 rounded-xl border relative overflow-hidden">
                    {candidate.is_blurred && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" /> {t("recruiter.candidate.blurPreview")}
                        </div>
                    )}
                    <Avatar className="w-24 h-24 border-4 border-background shadow-sm shrink-0">
                        <AvatarImage src={candidate.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground font-semibold">
                            {candidate.full_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
                            {candidate.full_name}
                        </h1>
                        <p className="text-lg text-muted-foreground mt-1">{candidate.current_job_title || t("recruiter.defaultJobTitle")}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                                {t("recruiter.candidate.yoe").replace("{n}", String(candidate.years_experience || 0))}
                            </span>
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                                {t("recruiter.englishPrefix")} {candidate.english_level || "N/A"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">{t("recruiter.candidate.stack")}</h2>
                    <div className="flex flex-wrap gap-2">
                        {candidate.stack && candidate.stack.length > 0 ? (
                            candidate.stack.map((tech: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                                    {tech}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground text-sm">{t("recruiter.candidate.noStack")}</span>
                        )}
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">{t("recruiter.candidate.goals")}</h2>
                    {candidate.is_blurred ? (
                        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-muted-foreground text-sm italic">
                            {candidate.remote_goals}
                        </div>
                    ) : (
                        <p className="text-muted-foreground whitespace-pre-wrap">{candidate.remote_goals || t("recruiter.candidate.noGoals")}</p>
                    )}
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">{t("recruiter.candidate.income")}</h2>
                    {candidate.is_blurred ? (
                        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-muted-foreground text-sm italic">
                            {candidate.monthly_income_bucket}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{t(INCOME_LABELS[candidate.monthly_income_bucket] || "recruiter.candidate.notSpecified")}</p>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {candidate.is_blurred ? (
                    <div className="bg-card p-6 rounded-xl border border-amber-200 bg-amber-50/10 dark:bg-amber-950/5 dark:border-amber-900/50 sticky top-24 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <ShieldCheck className="w-5 h-5" />
                            <h2 className="text-lg font-bold">{t("recruiter.candidate.unlock")}</h2>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {t("recruiter.candidate.freePreviewA")} <strong>{t("recruiter.candidate.freePreviewStrong")}</strong>{t("recruiter.candidate.freePreviewB")}
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                            <li>{t("recruiter.candidate.unlock1")}</li>
                            <li>{t("recruiter.candidate.unlock2")}</li>
                            <li>{t("recruiter.candidate.unlock3")}</li>
                            <li>{t("recruiter.candidate.unlock4")}</li>
                        </ul>
                        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 font-semibold shadow-sm">
                            <Link href="/recruiter/pricing">{t("recruiter.candidate.viewPlans")}</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="bg-card p-6 rounded-xl border sticky top-24">
                        <h2 className="text-lg font-bold mb-4">{t("recruiter.candidate.contact")}</h2>
                        
                        {alreadyInterested ? (
                            <div className="text-center p-6 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="font-bold text-emerald-800 dark:text-emerald-400">{t("recruiter.candidate.sentTitle")}</h3>
                                <p className="text-sm text-emerald-600/80 mt-2">{t("recruiter.candidate.sentDesc")}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Textarea 
                                    ref={textareaRef}
                                    placeholder={t("recruiter.candidate.messagePlaceholder")}
                                    className="min-h-[150px]"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">{t("recruiter.candidate.creditNote")}</p>
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleInterest}
                                    disabled={sending}
                                >
                                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                    {t("recruiter.candidate.send")}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
