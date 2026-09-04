"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";

type JobDetail = {
  id: string;
  slug: string;
  role: string;
  company_name: string;
  description: string | null;
  apply_url: string;
  location: string | null;
  stack: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  posted_at: string;
  job_perk_map?: { job_perks: { label: string } | null }[];
};

export default function JobDetailPage() {
  const params = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,slug,role,company_name,description,apply_url,location,stack,salary_min,salary_max,salary_currency,salary_period,posted_at,job_perk_map(job_perks(label))")
        .eq("slug", params.slug)
        .single();
      setJob((data as JobDetail) ?? null);
      setLoading(false);
    };
    run();
  }, [params.slug]);

  return (
    <AppLayout>
      <div className="container py-10">
        <Button asChild variant="ghost" className="mb-6">
          <Link href="/jobs"><ArrowLeft className="h-4 w-4 mr-2" />{t("jobs.detail.back")}</Link>
        </Button>

        {loading && <p className="text-muted-foreground">{t("common.loading")}</p>}
        {!loading && !job && <p className="text-muted-foreground">{t("jobs.detail.notFound")}</p>}

        {job && (
          <article className="max-w-4xl rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{job.company_name}</p>
            <h1 className="text-3xl font-bold mt-1">{job.role}</h1>
            <p className="text-sm text-muted-foreground mt-2">{job.location || t("jobs.locType.remote")} • {new Date(job.posted_at).toLocaleDateString()}</p>

            {(job.salary_min || job.salary_max) && (
              <p className="mt-4 font-medium">
                {(job.salary_min ?? 0).toLocaleString()} - {(job.salary_max ?? job.salary_min ?? 0).toLocaleString()} {job.salary_currency} / {job.salary_period}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {(job.stack ?? []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              {(job.job_perk_map ?? [])
                .map((x) => x.job_perks?.label)
                .filter(Boolean)
                .map((label) => <Badge key={label}>{label}</Badge>)}
            </div>

            {job.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none mt-6 whitespace-pre-wrap">
                {job.description}
              </div>
            )}

            <div className="mt-8">
              <Button asChild className="gradient-go text-primary-foreground">
                <a href={job.apply_url} target="_blank" rel="noreferrer">{t("jobs.detail.applyNow")} <ExternalLink className="h-4 w-4 ml-2" /></a>
              </Button>
            </div>
          </article>
        )}
      </div>
    </AppLayout>
  );
}
