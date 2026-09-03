"use client";

import { useEffect, useState, useRef } from "react";
import { SEO } from "@/components/SEO";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { RecruiterLayout } from "@/components/RecruiterLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Send, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const INCOME_LABELS: Record<string, string> = {
  lt_5k: "Up to R$5k / month",
  r5_6_5k: "R$5k - 6.5k / month",
  r6_5_8k: "R$6.5k - 8k / month",
  r8_10k: "R$8k - 10k / month",
  r10_15k: "R$10k - 15k / month",
  r15_20k: "R$15k - 20k / month",
  gt_20k: "R$20k+ / month",
};

export default function RecruiterCandidateView() {
  const { id } = useParams<{ id: string }>();
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
        toast.error("Failed to load candidate: " + e.message);
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
        toast.error("Please enter a message");
        return;
    }
    setSending(true);
    try {
        const { error } = await supabase.functions.invoke("recruiter-interest", {
            body: { candidate_id: id, message }
        });
        if (error) throw error;
        toast.success("Interest sent successfully!");
        setAlreadyInterested(true);
    } catch (e: any) {
        toast.error("Failed to send: " + e.message);
    } finally {
        setSending(false);
    }
  };

  if (loading) return <RecruiterLayout><div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div></RecruiterLayout>;
  if (!candidate) return <RecruiterLayout><div className="p-10 text-center">Candidate not found</div></RecruiterLayout>;

  return (
    <RecruiterLayout>
      <SEO
        title="Perfil do Candidato | RemoteDevs BR"
        description="Veja o perfil detalhado do candidato e entre em contato."
        canonicalPath={`/recruiter/candidate/${id}`}
      />
      <div className="container py-8 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 -ml-4">
            <Link href="/recruiter/search"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Search</Link>
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <div className="flex items-start gap-6 bg-card p-6 rounded-xl border relative overflow-hidden">
                    {candidate.is_blurred && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Blur Preview
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
                        <p className="text-lg text-muted-foreground mt-1">{candidate.current_job_title || "Software Developer"}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-medium">
                                {candidate.years_experience || 0} YOE
                            </span>
                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                                English: {candidate.english_level || "N/A"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">Tech Stack</h2>
                    <div className="flex flex-wrap gap-2">
                        {candidate.stack && candidate.stack.length > 0 ? (
                            candidate.stack.map((tech: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">
                                    {tech}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground text-sm">No tech stack listed.</span>
                        )}
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">Remote Goals</h2>
                    {candidate.is_blurred ? (
                        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-muted-foreground text-sm italic">
                            {candidate.remote_goals}
                        </div>
                    ) : (
                        <p className="text-muted-foreground whitespace-pre-wrap">{candidate.remote_goals || "No goals specified."}</p>
                    )}
                </div>

                <div className="bg-card p-6 rounded-xl border space-y-4">
                    <h2 className="text-xl font-bold">Avg Monthly Income</h2>
                    {candidate.is_blurred ? (
                        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-muted-foreground text-sm italic">
                            {candidate.monthly_income_bucket}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{INCOME_LABELS[candidate.monthly_income_bucket] || "Not specified."}</p>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {candidate.is_blurred ? (
                    <div className="bg-card p-6 rounded-xl border border-amber-200 bg-amber-50/10 dark:bg-amber-950/5 dark:border-amber-900/50 sticky top-24 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                            <ShieldCheck className="w-5 h-5" />
                            <h2 className="text-lg font-bold">Unlock Profile</h2>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You are browsing in <strong>Free Preview</strong> mode. Upgrade your recruiter plan to unlock:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                            <li>Full candidate name</li>
                            <li>Contact details & avatar</li>
                            <li>Detailed remote goals</li>
                            <li>Direct messaging capabilities</li>
                        </ul>
                        <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 font-semibold shadow-sm">
                            <Link href="/recruiter/pricing">View Subscription Plans</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="bg-card p-6 rounded-xl border sticky top-24">
                        <h2 className="text-lg font-bold mb-4">Contact Candidate</h2>
                        
                        {alreadyInterested ? (
                            <div className="text-center p-6 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Message Sent!</h3>
                                <p className="text-sm text-emerald-600/80 mt-2">The candidate has been notified of your interest.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Textarea 
                                    ref={textareaRef}
                                    placeholder="Hi! We have an open role that perfectly matches your profile..." 
                                    className="min-h-[150px]"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">This uses 1 contact credit. The candidate will receive an email notification.</p>
                                <Button 
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleInterest}
                                    disabled={sending}
                                >
                                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                    Send Interest
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
