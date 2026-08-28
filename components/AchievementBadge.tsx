"use client";

import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AchievementBadgeProps {
  title: string;
  description: string;
  iconName: string;
  points: number;
  earned: boolean;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({
  title,
  description,
  iconName,
  points,
  earned,
  earnedAt,
  size = "md",
}: AchievementBadgeProps) {
  // @ts-ignore - Dynamic icon
  const Icon = Icons[iconName] as LucideIcon || Icons.Star;

  const sizeClasses = {
    sm: "w-10 h-10 p-2",
    md: "w-14 h-14 p-3",
    lg: "w-20 h-20 p-4",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative rounded-full flex items-center justify-center transition-all duration-300",
              sizeClasses[size],
              earned
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-muted text-muted-foreground opacity-50 grayscale"
            )}
          >
            <Icon size={iconSizes[size]} />
            {earned && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm">
                <Icons.CheckCircle2 className="w-3 h-3 text-green-500" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-center p-3">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium">
            <span className="text-amber-500">+{points} XP</span>
            {earnedAt && (
              <span className="text-muted-foreground">
                • {new Date(earnedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
