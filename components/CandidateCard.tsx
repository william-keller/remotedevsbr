"use client";

import Link from "next/link";

import { MapPin, Briefcase, Languages, FileText, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="rounded-xl border bg-card p-5 transition-all hover:border-primary/40 group">
      <div className="flex gap-4 items-start">
        <Avatar className="h-16 w-16 border-2 border-border">
          <AvatarImage src={is_blurred ? undefined : avatar_url} className={cn(is_blurred && "blur-sm")} />
          <AvatarFallback>{full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg truncate flex items-center gap-2">
            {full_name}
            {is_blurred && <span className="text-[10px] uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Free Tier</span>}
          </h3>
          <p className="text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Briefcase className="h-3 w-3" />
            {current_job_title || "Software Developer"} • {years_experience || 0} years exp
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Languages className="h-4 w-4 shrink-0" />
          <span className="truncate">English: {english_level || "N/A"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">Resume AI Score: 85/100</span> {/* Mocked for now */}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap gap-1.5 h-14 overflow-hidden">
          {stack.map((tech, idx) => (
            <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/recruiter/candidate/${id}`}>View Profile</Link>
        </Button>
        <Button 
          className="flex-1"
          onClick={() => onExpressInterest?.(id)}
        >
          Express Interest
        </Button>
      </div>
    </div>
  );
}
