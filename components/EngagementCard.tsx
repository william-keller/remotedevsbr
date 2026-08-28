"use client";

import { useState } from "react";
import Link from "next/link";

import { X, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EngagementCardProps {
  id: string;
  title: string;
  description: string;
  actionText: string;
  actionUrl: string;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
  onDismiss?: (id: string) => void;
}

export function EngagementCard({
  id,
  title,
  description,
  actionText,
  actionUrl,
  icon = <Sparkles className="h-5 w-5" />,
  variant = "default",
  className,
  onDismiss
}: EngagementCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss(id);
  };

  const variants = {
    default: "bg-card border-border",
    primary: "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50",
    success: "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50",
    warning: "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50",
  };

  const iconColors = {
    default: "text-foreground",
    primary: "text-blue-500",
    success: "text-emerald-500",
    warning: "text-amber-500",
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl border p-5 transition-all", variants[variant], className)}>
      {onDismiss && (
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex gap-4">
        <div className={cn("mt-1 shrink-0", iconColors[variant])}>
          {icon}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium leading-none tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <Button asChild size="sm" variant={variant === "default" ? "outline" : "default"} className="mt-2">
            <Link href={actionUrl}>
              {actionText}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
