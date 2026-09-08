"use client";

import { Landmark, ShieldCheck, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

type SecurityBadgesProps = {
  className?: string;
  complianceLabel: string;
  encryptedLabel: string;
};

export function SecurityBadges({ className, complianceLabel, encryptedLabel }: SecurityBadgesProps) {
  return (
    <div
      className={cn(
        "mt-6 border-t border-border pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-2 sm:gap-x-4">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <ShieldCheck className="h-3.5 w-3.5" />
          {complianceLabel}
        </span>
        <span className="hidden sm:block h-3 w-px bg-border" aria-hidden />
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Landmark className="h-3.5 w-3.5" />
          {encryptedLabel}
        </span>
        <span className="hidden sm:block h-3 w-px bg-border" aria-hidden />
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Lock className="h-3.5 w-3.5" />
          SSL/TLS
        </span>
      </div>
    </div>
  );
}
