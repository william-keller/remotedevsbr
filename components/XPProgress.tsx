"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface XPProgressProps {
  xp: number;
  className?: string;
  showDetails?: boolean;
}

// XP Thresholds for leveling
const LEVELS = [
  { xp: 0, name: "Iniciante", color: "text-slate-500" },
  { xp: 100, name: "Explorador", color: "text-blue-500" },
  { xp: 300, name: "Profissional", color: "text-emerald-500" },
  { xp: 600, name: "Expert", color: "text-violet-500" },
  { xp: 1000, name: "Elite", color: "text-amber-500" },
];

export function XPProgress({ xp, className, showDetails = false }: XPProgressProps) {
  // Find current level
  let currentLevelIdx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      currentLevelIdx = i;
    }
  }

  const currentLevel = LEVELS[currentLevelIdx];
  const nextLevel = currentLevelIdx < LEVELS.length - 1 ? LEVELS[currentLevelIdx + 1] : null;
  
  const xpIntoLevel = nextLevel ? xp - currentLevel.xp : currentLevel.xp;
  const xpNeeded = nextLevel ? nextLevel.xp - currentLevel.xp : 1;
  const progressPercent = nextLevel ? (xpIntoLevel / xpNeeded) * 100 : 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between text-sm font-medium">
        <span className={cn("font-bold", currentLevel.color)}>
          Nível {currentLevelIdx + 1}: {currentLevel.name}
        </span>
        <span className="text-muted-foreground">
          {xp} XP {nextLevel && `/ ${nextLevel.xp}`}
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      {showDetails && nextLevel && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          +{nextLevel.xp - xp} XP para o nível {nextLevel.name}
        </p>
      )}
    </div>
  );
}
