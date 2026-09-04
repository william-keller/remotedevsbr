"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { AppLayout } from "@/components/Layout";
import { CoverLetterSubnav } from "@/components/tools/CoverLetterSubnav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  COVER_LETTER_TEMPLATES,
  getExampleBySlug,
} from "@/lib/cover-letter-content";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Copy,
  Download,
  Check,
  Zap,
  Target,
  Search,
  Languages,
  FileText,
  Star,
  Trash2,
  History,
  Lock,
  Mail,
  Save,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const FAQ_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
const STEP_KEYS = ["1", "2", "3"] as const;
const FEATURE_KEYS = ["f1", "f2", "f3", "f4"] as const;
const FEATURE_ICONS = [Target, Search, Zap, Languages] as const;

const PREFILL_KEY = "rdbr_cover_prefill";
const ANALYZE_PREFILL_KEY = "rdbr_analyze_prefill";

type GenerateResult = {
  id: string | null;
  letter: string;
  matched_keywords: string[];
  missing_keywords: string[];
  keyword_coverage: number;
  word_count: number;
  cliches_found: string[];
};

type Review = {
  id: string;
  csat_rating: number;
  csat_comment: string;
  target_role: string;
  created_at: string;
};

function ReviewsBlock() {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data } = await supabase
          .from("public_cover_letter_reviews" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);
        if (data) setReviews(data as any as Review[]);
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };
    fetchReviews();
  }, []);

  if (!reviews.length) return null;

  return (
    <section className="mt-16 border-t pt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
        {t("coverLetter.reviewsTitle")}
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex gap-1 mb-2 text-gold">
                {Array.from({ length: r.csat_rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current text-gold" />
                ))}
              </div>
              <p className="text-sm italic text-muted-foreground mb-4">"{r.csat_comment}"</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary">
                {r.target_role || "Developer"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnlockPdfModal({
  isOpen,
  onClose,
  onUnlock,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (email: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error(t("auth.email"));
      return;
    }
    setLoading(true);
    try {
      await onUnlock(email);
      onClose();
    } catch {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          ✕
        </button>
        <div className="text-center">
          <Lock className="h-10 w-10 mx-auto text-primary mb-3" />
          <h3 className="text-xl font-bold">{t("coverLetter.unlockPdfTitle")}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t("coverLetter.unlockPdfSub")}</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="unlock-email">{t("auth.email")}</Label>
            <Input
              id="unlock-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full gradient-gold text-gold-foreground" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("coverLetter.unlockPdfCta")}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">{t("coverLetter.unlockPdfNoSpam")}</p>
        </form>
      </div>
    </div>
  );
}

function CoverLetterGeneratorInner() {
  const { t } = useI18n();
  const { user, isPro } = useAuth();
  const searchParams = useSearchParams();

  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [tone, setTone] = useState("confident");
  const [language, setLanguage] = useState("en");
  const [templateId, setTemplateId] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState("");
  const [meta, setMeta] = useState<Omit<GenerateResult, "letter"> | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [csatComment, setCsatComment] = useState("");
  const [csatDone, setCsatDone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Enhancements states
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [votedFaqs, setVotedFaqs] = useState<string[]>([]);
  const [analyzingLetter, setAnalyzingLetter] = useState(false);
  const [analysisSuggestions, setAnalysisSuggestions] = useState<string[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("cover_letters" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setHistory((data as any) ?? []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [user, loadHistory]);

  useEffect(() => {
    const tpl = searchParams.get("template");
    if (tpl) setTemplateId(tpl);

    const exSlug = searchParams.get("example");
    if (exSlug) {
      const ex = getExampleBySlug(exSlug);
      if (ex) {
        setTargetRole(ex.targetRole);
        setJobDescription(ex.sampleJobDescription);
        setResumeText(ex.sampleResume);
      }
    }

    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (raw) {
        const p = JSON.parse(raw) as {
          target_role?: string;
          job_description?: string;
          resume_text?: string;
          template_id?: string;
        };
        if (p.target_role) setTargetRole(p.target_role);
        if (p.job_description) setJobDescription(p.job_description);
        if (p.resume_text) setResumeText(p.resume_text);
        if (p.template_id) setTemplateId(p.template_id);
        sessionStorage.removeItem(PREFILL_KEY);
      }
      const analyzeRaw = sessionStorage.getItem(ANALYZE_PREFILL_KEY);
      if (analyzeRaw) {
        const a = JSON.parse(analyzeRaw) as { target_role?: string; resume_text?: string };
        if (a.target_role) setTargetRole(a.target_role);
        if (a.resume_text) setResumeText(a.resume_text);
        sessionStorage.removeItem(ANALYZE_PREFILL_KEY);
      }
    } catch {
      /* ignore */
    }

    const storedFaqs = localStorage.getItem("rdbr_voted_faqs");
    if (storedFaqs) {
      try {
        setVotedFaqs(JSON.parse(storedFaqs));
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);

  const importFromAnalyze = () => {
    try {
      const raw = sessionStorage.getItem(ANALYZE_PREFILL_KEY);
      if (!raw) {
        toast.error(t("coverLetter.importAnalyze"));
        return;
      }
      const a = JSON.parse(raw) as { target_role?: string; resume_text?: string };
      if (a.target_role) setTargetRole(a.target_role);
      if (a.resume_text) setResumeText(a.resume_text);
      sessionStorage.removeItem(ANALYZE_PREFILL_KEY);
      toast.success(t("coverLetter.importAnalyze"));
    } catch {
      toast.error(t("coverLetter.importAnalyze"));
    }
  };

  const wordCount = letter.trim() ? letter.trim().split(/\s+/).length : 0;
  const wordOk = wordCount >= 250 && wordCount <= 400;

  const faqStructured = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_KEYS.map((n) => ({
        "@type": "Question",
        name: t(`coverLetter.faq${n}q`),
        acceptedAnswer: { "@type": "Answer", text: t(`coverLetter.faq${n}a`) },
      })),
    }),
    [t],
  );

  const webAppStructured = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "RemoteDevs BR Cover Letter Generator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: t("coverLetter.seoDesc"),
      url: "https://remotedevsbr.com/tools/cover-letter",
    }),
    [t],
  );

  const howToStructured = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: t("coverLetter.howTitle"),
      step: STEP_KEYS.map((n, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: t(`coverLetter.step${n}Title`),
        text: t(`coverLetter.step${n}Desc`),
      })),
    }),
    [t],
  );

  // Normalize a backend letter value into a plain string. Guards against the
  // server ever returning a raw JSON object/string blob instead of a paragraph.
  const normalizeLetter = (value: unknown): string => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed.letter === "string") return parsed.letter;
        } catch {
          /* not JSON, use as-is */
        }
      }
      return trimmed;
    }
    if (value && typeof value === "object") {
      const maybe = (value as Record<string, unknown>).letter;
      if (typeof maybe === "string") return maybe;
    }
    return "";
  };

  const generate = async () => {
    setLoading(true);
    setMeta(null);
    setRating(null);
    setCsatComment("");
    setCsatDone(false);
    setAnalysisSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("cover-letter", {
        body: {
          action: "generate",
          target_role: targetRole.trim(),
          job_description: jobDescription.trim(),
          resume_text: resumeText.trim(),
          tone,
          language,
          template_id: templateId,
          user_id: user?.id ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data as GenerateResult;
      setLetter(normalizeLetter(result.letter));
      setRecordId(result.id);
      setMeta({
        id: result.id,
        matched_keywords: result.matched_keywords ?? [],
        missing_keywords: result.missing_keywords ?? [],
        keyword_coverage: result.keyword_coverage ?? 0,
        word_count: result.word_count ?? 0,
        cliches_found: result.cliches_found ?? [],
      });
      loadHistory();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const reanalyzeLetter = async () => {
    if (!letter.trim()) return;
    setAnalyzingLetter(true);
    try {
      const { data, error } = await supabase.functions.invoke("cover-letter", {
        body: {
          action: "analyze-letter",
          job_description: jobDescription,
          target_role: targetRole,
          cover_letter: letter,
          language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMeta({
        id: recordId,
        matched_keywords: data.matched_keywords ?? [],
        missing_keywords: data.missing_keywords ?? [],
        keyword_coverage: data.keyword_coverage ?? 0,
        word_count: data.word_count ?? 0,
        cliches_found: data.cliches_found ?? [],
      });
      setAnalysisSuggestions(data.suggestions ?? []);
      toast.success(t("coverLetter.editsSaved"));

      // Also save updated results to database if user is logged in
      if (recordId && user) {
        await supabase
          .from("cover_letters" as any)
          .update({
            generated_text: letter,
            keyword_meta: {
              matched_keywords: data.matched_keywords ?? [],
              missing_keywords: data.missing_keywords ?? [],
              keyword_coverage: data.keyword_coverage ?? 0,
              cliches_found: data.cliches_found ?? [],
              word_count: data.word_count ?? 0,
            },
          })
          .eq("id", recordId);
        loadHistory();
      }
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setAnalyzingLetter(false);
    }
  };

  const saveEdits = async () => {
    if (!recordId) return;
    try {
      const { error } = await supabase
        .from("cover_letters" as any)
        .update({
          generated_text: letter,
          keyword_meta: meta
            ? {
                matched_keywords: meta.matched_keywords,
                missing_keywords: meta.missing_keywords,
                keyword_coverage: meta.keyword_coverage,
                cliches_found: meta.cliches_found,
                word_count: wordCount,
              }
            : {},
        })
        .eq("id", recordId);
      if (error) throw error;
      toast.success(t("coverLetter.editsSaved"));
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to save edits");
    }
  };

  const copyLetter = useCallback(async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    toast.success(t("coverLetter.copied"));
    setTimeout(() => setCopied(false), 2000);
  }, [letter, t]);

  const downloadTxt = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${targetRole.replace(/\s+/g, "-").slice(0, 40) || "remote"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!letter) return;

    // Check email gate for anonymous users
    if (!user && !sessionStorage.getItem("rdbr_cover_unlocked")) {
      setUnlockModalOpen(true);
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);

      const lines = doc.splitTextToSize(letter, 170);
      let y = 20;
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      });
      doc.save(`cover-letter-${targetRole.replace(/\s+/g, "-").slice(0, 40) || "remote"}.pdf`);
      toast.success(t("common.completed"));
    } catch (err) {
      toast.error("Failed to generate PDF");
      console.error(err);
    }
  };

  const unlockAndDownload = async (inputEmail: string) => {
    if (!recordId) return;
    try {
      const { error } = await supabase.functions.invoke("cover-letter", {
        body: { action: "unlock", id: recordId, email: inputEmail },
      });
      if (error) throw error;
      sessionStorage.setItem("rdbr_cover_unlocked", "true");
      
      // Perform PDF download
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);

      const lines = doc.splitTextToSize(letter, 170);
      let y = 20;
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      });
      doc.save(`cover-letter-${targetRole.replace(/\s+/g, "-").slice(0, 40) || "remote"}.pdf`);
      toast.success(t("common.completed"));
    } catch (e: any) {
      toast.error(e.message || "Failed to unlock");
    }
  };

  const submitCsat = async (ratingVal: number, commentVal?: string) => {
    if (!recordId || csatDone) return;
    try {
      await supabase.functions.invoke("cover-letter", {
        body: { action: "csat", id: recordId, rating: ratingVal, comment: commentVal || null },
      });
      setCsatDone(true);
      toast.success(t("coverLetter.csatThanks"));
    } catch {
      setCsatDone(true);
    }
  };

  const deleteLetter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("coverLetter.deleteConfirm"))) return;
    try {
      const { error } = await supabase.from("cover_letters" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success(t("common.completed"));
      loadHistory();
      if (recordId === id) {
        reset();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const loadHistoryItem = (item: any) => {
    setTargetRole(item.target_role || "");
    setJobDescription(item.job_description || "");
    setResumeText(item.resume_snippet || "");
    setTone(item.tone || "confident");
    setLanguage(item.language || "en");
    setTemplateId(item.template_id || "classic");
    setLetter(normalizeLetter(item.generated_text || ""));
    setRecordId(item.id);
    setMeta({
      id: item.id,
      matched_keywords: item.keyword_meta?.matched_keywords ?? [],
      missing_keywords: item.keyword_meta?.missing_keywords ?? [],
      keyword_coverage: item.keyword_meta?.keyword_coverage ?? 0,
      word_count: item.keyword_meta?.word_count ?? 0,
      cliches_found: item.keyword_meta?.cliches_found ?? [],
    });
    setRating(item.csat_rating);
    setCsatComment(item.csat_comment || "");
    setCsatDone(item.csat_rating !== null);
    setAnalysisSuggestions([]);
  };

  const submitFaqVote = async (faqId: string, vote: boolean) => {
    try {
      const { error } = await supabase.from("faq_votes" as any).insert({
        faq_id: faqId,
        tool_name: "cover-letter",
        vote,
      });
      if (error) throw error;
      const updated = [...votedFaqs, faqId];
      setVotedFaqs(updated);
      localStorage.setItem("rdbr_voted_faqs", JSON.stringify(updated));
      toast.success(t("coverLetter.faqVoteThanks"));
    } catch {
      toast.error("Error saving vote");
    }
  };

  const reset = () => {
    setLetter("");
    setMeta(null);
    setRecordId(null);
    setRating(null);
    setCsatComment("");
    setCsatDone(false);
    setAnalysisSuggestions([]);
  };

  const displayHistory = isPro ? history : history.slice(0, 1);
  const showLanding = !letter;

  return (
    <AppLayout>
      <SEO
        title={t("coverLetter.seoTitle")}
        description={t("coverLetter.seoDesc")}
        canonicalPath="/tools/cover-letter"
        structuredData={[webAppStructured, faqStructured, howToStructured]}
      />

      <article className="container max-w-6xl py-10">
        <CoverLetterSubnav />

        <header className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold mb-4">
            <Sparkles className="h-3.5 w-3.5" /> {t("coverLetter.badge")}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("coverLetter.title")}</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">{t("coverLetter.subtitle")}</p>
        </header>

        {/* Saved History Panel */}
        {user && history.length > 0 && (
          <section className="rounded-xl border bg-card p-5 mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{t("coverLetter.historyTitle")} ({displayHistory.length}{!isPro ? "/1" : ""})</h3>
              </div>
              {!isPro && (
                <Button asChild size="sm" className="gradient-gold text-gold-foreground">
                  <Link href="/pro">
                    <Sparkles className="h-3 w-3 mr-1" /> {t("nav.upgrade")}
                  </Link>
                </Button>
              )}
            </div>

            {!isPro && history.length > 1 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-3 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">{t("coverLetter.proLimitTitle")}</span>: {t("coverLetter.proLimitDesc")}
              </div>
            )}

            {loadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
              </div>
            ) : (
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                {displayHistory.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className={`flex items-center justify-between gap-2 text-xs p-3 rounded-lg border cursor-pointer hover:bg-muted transition text-left group ${
                      recordId === item.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{item.target_role || "Untitled Cover Letter"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(item.created_at).toLocaleDateString()} · {item.language === "pt" ? "Português" : "English"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive group-hover:opacity-100 opacity-0 transition-opacity"
                      onClick={(e) => deleteLetter(item.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Form Area */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <Label htmlFor="cl-role">{t("coverLetter.targetRole")}</Label>
              <Input
                id="cl-role"
                className="mt-1.5"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder={t("coverLetter.targetRolePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="cl-jd">{t("coverLetter.jobDescription")}</Label>
              <Textarea
                id="cl-jd"
                className="mt-1.5 min-h-[140px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={t("coverLetter.jobDescriptionPlaceholder")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cl-resume">{t("coverLetter.resume")}</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={importFromAnalyze}>
                  <FileText className="h-3 w-3 mr-1" />
                  {t("coverLetter.importAnalyze")}
                </Button>
              </div>
              <Textarea
                id="cl-resume"
                className="mt-1.5 min-h-[120px]"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={t("coverLetter.resumePlaceholder")}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("coverLetter.tone")}</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">{t("coverLetter.toneFormal")}</SelectItem>
                    <SelectItem value="confident">{t("coverLetter.toneConfident")}</SelectItem>
                    <SelectItem value="concise">{t("coverLetter.toneConcise")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("coverLetter.language")}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("coverLetter.langEn")}</SelectItem>
                    <SelectItem value="pt">{t("coverLetter.langPt")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("coverLetter.template")}</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COVER_LETTER_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {t(tpl.nameKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={generate}
              disabled={loading}
              className="w-full gradient-go text-primary-foreground"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t("coverLetter.generate")}
                </>
              )}
            </Button>
            <p className="text-center">
              <Link href="/analyze" className="text-sm text-primary hover:underline">
                {t("coverLetter.ctaAnalyze")}
              </Link>
            </p>

            {/* LinkedIn Pitch Callout */}
            <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3 shadow-sm">
              <div className="space-y-1">
                <p className="font-semibold text-xs">{t("coverLetter.linkedinPitch")}</p>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs shrink-0 hover:border-primary">
                <Link href="/tools/linkedin">
                  {t("coverLetter.linkedinPitchCta")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Preview / Results Area */}
          <div className="lg:col-span-7 rounded-xl border bg-card p-5 min-h-[320px] flex flex-col">
            <h2 className="font-semibold text-lg mb-3">{t("coverLetter.preview")}</h2>
            {!letter ? (
              <p className="text-sm text-muted-foreground flex-1 flex items-center justify-center text-center px-4">
                {t("coverLetter.step3Desc")}
              </p>
            ) : (
              <>
                {meta && (
                  <div className="mb-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{t("coverLetter.keywordCoverage")}</span>
                        <span className="font-semibold tabular-nums">{meta.keyword_coverage}%</span>
                      </div>
                      <Progress value={meta.keyword_coverage} className="h-1.5" />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 ${wordOk ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}
                      >
                        {t("coverLetter.wordCount")}: {wordCount}
                      </span>
                      {!wordOk && (
                        <span className="text-muted-foreground">{t("coverLetter.wordCountHint")}</span>
                      )}
                    </div>
                    {meta.matched_keywords.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t("coverLetter.matchedKeywords")}</div>
                        <div className="flex flex-wrap gap-1">
                          {meta.matched_keywords.map((k, i) => (
                            <span key={i} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {meta.missing_keywords.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t("coverLetter.missingKeywords")}</div>
                        <div className="flex flex-wrap gap-1">
                          {meta.missing_keywords.map((k, i) => (
                            <span key={i} className="text-[10px] rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="text-muted-foreground">{t("coverLetter.cliches")}: </span>
                      {meta.cliches_found.length ? (
                        <span className="text-amber-600">{meta.cliches_found.join(", ")}</span>
                      ) : (
                        <span className="text-emerald-600">{t("coverLetter.noCliches")}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Review Suggestions */}
                {analysisSuggestions.length > 0 && (
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 animate-in fade-in duration-200">
                    <h3 className="font-semibold text-xs flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary" /> {t("coverLetter.suggestionsTitle")}
                    </h3>
                    <ul className="text-xs space-y-1.5 list-disc pl-5">
                      {analysisSuggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mb-2">{t("coverLetter.editHint")}</p>
                <Textarea
                  className="flex-1 min-h-[200px] font-mono text-sm leading-relaxed"
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                />
                
                {/* Actions Grid */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={copyLetter}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? t("coverLetter.copied") : t("coverLetter.copy")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadPdf}>
                      <Download className="h-4 w-4" /> {t("coverLetter.downloadPdf")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadTxt}>
                      <Download className="h-4 w-4" /> {t("coverLetter.download")}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reanalyzeLetter}
                      disabled={analyzingLetter}
                      className="text-primary hover:text-primary/80"
                    >
                      {analyzingLetter ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          {t("coverLetter.reanalyzing")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          {t("coverLetter.reanalyze")}
                        </>
                      )}
                    </Button>
                    {user && recordId && (
                      <Button variant="outline" size="sm" onClick={saveEdits}>
                        <Save className="h-4 w-4 mr-1.5" /> {t("coverLetter.saveEdits")}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={reset}>
                      {t("coverLetter.generateAnother")}
                    </Button>
                  </div>
                </div>

                {/* CSAT Star Rating + Comment feedback form */}
                {recordId && !csatDone && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <p className="text-sm font-medium">{t("coverLetter.csatTitle")}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="p-1 rounded hover:bg-gold/20 transition-colors"
                          onClick={() => setRating(n)}
                          aria-label={`${n} stars`}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              rating !== null && rating >= n ? "text-gold fill-current" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating !== null && (
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <Textarea
                          placeholder={t("coverLetter.csatCommentPlaceholder")}
                          value={csatComment}
                          onChange={(e) => setCsatComment(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => submitCsat(rating, csatComment)}
                          className="gradient-gold text-gold-foreground"
                        >
                          {t("coverLetter.csatSubmit")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showLanding && (
          <>
            <section className="mt-16" aria-labelledby="cl-how">
              <h2 id="cl-how" className="text-2xl md:text-3xl font-bold text-center mb-10">
                {t("coverLetter.howTitle")}
              </h2>
              <ol className="grid md:grid-cols-3 gap-6">
                {STEP_KEYS.map((n) => (
                  <li key={n} className="rounded-xl border bg-card p-6 relative">
                    <span className="text-4xl font-bold text-primary/20 absolute top-4 right-4">{`0${n}`}</span>
                    <h3 className="font-semibold text-lg pr-12">{t(`coverLetter.step${n}Title`)}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{t(`coverLetter.step${n}Desc`)}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-16" aria-labelledby="cl-features">
              <h2 id="cl-features" className="text-2xl md:text-3xl font-bold text-center mb-8">
                {t("coverLetter.featuresTitle")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {FEATURE_KEYS.map((key, i) => {
                  const Icon = FEATURE_ICONS[i];
                  return (
                    <div key={key} className="rounded-xl border bg-card p-5">
                      <Icon className="h-5 w-5 text-primary mb-3" />
                      <h3 className="font-semibold">{t(`coverLetter.${key}Title`)}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t(`coverLetter.${key}Desc`)}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-16 rounded-xl border bg-primary/5 p-6 md:p-8">
              <h2 className="text-xl font-bold">{t("coverLetter.diffTitle")}</h2>
              <ul className="mt-4 space-y-2">
                {[t("coverLetter.diff1"), t("coverLetter.diff2"), t("coverLetter.diff3")].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            {/* Testimonials Social Proof */}
            <ReviewsBlock />

            {/* FAQs with Helpfulness Vote Tracking */}
            <section className="mt-16 mb-8" aria-labelledby="cl-faq">
              <h2 id="cl-faq" className="text-2xl md:text-3xl font-bold">
                {t("coverLetter.faqTitle")}
              </h2>
              <p className="text-muted-foreground mt-2 mb-6">{t("coverLetter.faqSub")}</p>
              <Accordion type="single" collapsible className="rounded-xl border bg-card px-2">
                {FAQ_KEYS.map((n) => (
                  <AccordionItem key={n} value={n}>
                    <AccordionTrigger className="px-4 text-left">{t(`coverLetter.faq${n}q`)}</AccordionTrigger>
                    <AccordionContent className="px-4 text-muted-foreground">
                      <div className="space-y-4">
                        <p>{t(`coverLetter.faq${n}a`)}</p>
                        <div className="flex items-center gap-2 pt-3 border-t text-xs">
                          <span>{t("coverLetter.faqHelpful")}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={votedFaqs.includes(n)}
                            onClick={() => submitFaqVote(n, true)}
                          >
                            👍 {t("coverLetter.yes")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={votedFaqs.includes(n)}
                            onClick={() => submitFaqVote(n, false)}
                          >
                            👎 {t("coverLetter.no")}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          </>
        )}
      </article>

      {/* Email Gate Modal for Anonymous PDF Exports */}
      <UnlockPdfModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlock={unlockAndDownload}
      />
    </AppLayout>
  );
}

export default function CoverLetterPage() {
  return (
    <Suspense fallback={null}>
      <CoverLetterGeneratorInner />
    </Suspense>
  );
}
