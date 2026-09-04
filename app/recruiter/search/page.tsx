"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SEO } from "@/components/SEO";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { CandidateCard } from "@/components/CandidateCard";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Loader2, Lock } from "lucide-react";
import Link from "next/link";

export default function RecruiterSearch() {
  const router = useRouter();
  const { t } = useI18n();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("free");
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Filters
  const [stack, setStack] = useState("");
  const [english, setEnglish] = useState("any");

  const search = async () => {
    setLoading(true);
    setLoadError(null);
    try {
        const filters: any = {};
        if (stack) filters.stack = [stack.trim()];
        if (english && english !== "any") filters.english_level = english;

        const { data, error } = await supabase.functions.invoke("recruiter-search", {
            body: { filters }
        });
        
        if (error) throw error;
        if (!Array.isArray(data?.candidates)) throw new Error("Unexpected response from search.");
        setCandidates(data.candidates || []);
        setPlan(data?.plan || "free");
    } catch (e: any) {
        setCandidates([]);
        setLoadError(e?.message || t("recruiter.searchFailed"));
    } finally {
        setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { search(); }, []);

  const isFree = plan === "free";

  return (
    <RecruiterLayout>
      <SEO
        title="Buscar Candidatos | RemoteDevs BR"
        description="Filtre e encontre desenvolvedores brasileiros por stack, senioridade e inglês."
        canonicalPath="/recruiter/search"
      />
      <div className="container py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Filter className="w-4 h-4"/> {t("recruiter.filters")}</h3>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("recruiter.techStack")}</label>
                        <Input
                            placeholder={t("recruiter.stackPlaceholder")}
                            value={stack}
                            onChange={(e) => setStack(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("recruiter.englishLevel")}</label>
                        <Select value={english} onValueChange={setEnglish}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("recruiter.anyLevel")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">{t("recruiter.anyLevel")}</SelectItem>
                                <SelectItem value="B2">{t("recruiter.englishB2")}</SelectItem>
                                <SelectItem value="C1">{t("recruiter.englishC1")}</SelectItem>
                                <SelectItem value="C2">{t("recruiter.englishC2")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>



                    <Button onClick={search} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        {t("recruiter.applyFilters")}
                    </Button>
                </div>
            </div>
        </div>

        {/* Results */}
        <div className="flex-1">
            {isFree && (
                <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <h2 className="font-bold flex items-center gap-2 text-amber-900 dark:text-amber-400">
                            <Lock className="w-4 h-4" /> {t("recruiter.freeTitle")}
                        </h2>
                        <p className="text-sm text-amber-800/90 dark:text-amber-500/90 mt-1">
                            {t("recruiter.freeDescription")}
                        </p>
                    </div>
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                        <Link href="/recruiter/pricing">{t("recruiter.upgradePlan")}</Link>
                    </Button>
                </div>
            )}

            {loadError && (
                <div className="mb-6 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-5">
                    <h2 className="font-bold text-red-900 dark:text-red-400">{t("recruiter.loadErrorTitle")}</h2>
                    <p className="text-sm text-red-800/90 dark:text-red-500/90 mt-1">{loadError}</p>
                    <Button onClick={search} variant="outline" className="mt-3" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} {t("recruiter.tryAgain")}
                    </Button>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{t("recruiter.candidates")} <span className="text-muted-foreground text-lg font-normal">({candidates.length})</span></h2>
                {isFree && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">{t("recruiter.freePreview")}</span>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
            ) : candidates.length === 0 ? (
                <div className="text-center py-20 border rounded-xl bg-card">
                    <p className="text-muted-foreground">{t("recruiter.noCandidates")}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {candidates.map(c => (
                        <CandidateCard 
                            key={c.id} 
                            candidate={c} 
                            onExpressInterest={(id) => router.push(`/recruiter/candidate/${id}?contact=1`)}
                        />
                    ))}
                </div>
            )}
        </div>

      </div>
    </RecruiterLayout>
  );
}
