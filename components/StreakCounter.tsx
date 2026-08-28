"use client";

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCounter({ streak, longestStreak, className }: StreakCounterProps) {
  const isActive = streak > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
        isActive 
          ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400"
          : "bg-muted border-border text-muted-foreground",
        className
      )}
    >
      <Flame 
        size={16} 
        className={cn(
          isActive ? "fill-orange-500 text-orange-500 animate-pulse" : "text-muted-foreground"
        )} 
      />
      <span>{streak} {streak === 1 ? 'day' : 'days'}</span>
    </div>
  );
}
