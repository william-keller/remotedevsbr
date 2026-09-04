"use client";

import Link from "next/link";

import { Briefcase, Languages, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
  candidate: {
    id: string;
    full_name: string;
    avatar_url: string;
    current_job_title: string;
    english_level: string;
    stack: string[];
    years_experience: number;
    remote_goals: string;
    is_blurred?: boolean;
  };
  onExpressInterest?: (id: string) => void;
}

export function CandidateCard({ candidate, onExpressInterest }: CandidateCardProps) {
  const { t } = useI18n();
  const {
    id,
    full_name,
    avatar_url,
    current_job_title,
    english_level,
    stack = [],
    years_experience,
    is_blurred
  } = candidate;

  const techStack = stack ?? [];
  const yearsLabel = t("recruiter.yearsBadge").replace("{n}", String(years_experience || 0));

  return (
    <div className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40">
      <div className="flex gap-4 items-start">
        <Avatar className="h-16 w-16 border-2 border-border shadow-sm">
          <AvatarImage src={is_blurred ? undefined : avatar_url} className={cn(is_blurred && "blur-sm")} />
          <AvatarFallback className="bg-primary/10 text-primary">{full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate flex items-center gap-2">
            {full_name}
            {is_blurred && <span className="text-[10px] uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{t("recruiter.freeTier")}</span>}
          </h3>
          <p className="text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{current_job_title || t("recruiter.defaultJobTitle")}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <Languages className="h-3.5 w-3.5" />
          {english_level || "N/A"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" />
          {yearsLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          {t("recruiter.resumeScore")}
        </span>
      </div>

      <div className="mt-4 flex-1">
        <div className="flex flex-wrap gap-1.5">
          {techStack.map((tech, idx) => (
            <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/recruiter/candidate/${id}`}>{t("recruiter.viewProfile")}</Link>
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onExpressInterest?.(id)}
        >
          {t("recruiter.expressInterest")}
        </Button>
      </div>
    </div>
  );
}
