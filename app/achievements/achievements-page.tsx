"use client";

import { useEngagement } from "@/hooks/useEngagement";
import { AchievementBadge } from "@/components/AchievementBadge";
import { XPProgress } from "@/components/XPProgress";
import { StreakCounter } from "@/components/StreakCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame, Star, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/Layout";
import { RequireAuth } from "@/components/Guards";
import { useI18n } from "@/lib/i18n";

function AchievementsContent() {
  const { xp, streak, longestStreak, achievements, userAchievements, loading } = useEngagement();
  const { t } = useI18n();

  const isEarned = (id: string) => {
    return userAchievements.some((ua) => ua.achievement_id === id);
  };

  const getEarnedAt = (id: string) => {
    const ua = userAchievements.find((ua) => ua.achievement_id === id);
    return ua?.earned_at;
  };

  const categories = [
    { id: "profile", label: t("achievements.catProfile"), icon: <Target className="w-5 h-5" /> },
    { id: "tools", label: t("achievements.catTools"), icon: <Star className="w-5 h-5" /> },
    { id: "career", label: t("achievements.catCareer"), icon: <Trophy className="w-5 h-5" /> },
    { id: "engagement", label: t("achievements.catEngagement"), icon: <Flame className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in">
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="text-amber-500" />
              {t("achievements.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("achievements.subtitle")}
            </p>
          </div>
          
          <StreakCounter streak={streak} longestStreak={longestStreak} className="px-4 py-2" />
        </div>

        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              {t("achievements.xpTitle")}
            </CardTitle>
            <CardDescription>
              {t("achievements.xpDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <XPProgress xp={xp} showDetails className="max-w-2xl" />
          </CardContent>
        </Card>

        <div className="grid gap-8">
          {categories.map((category) => {
            const categoryAchievements = achievements.filter(a => a.category === category.id);
            if (categoryAchievements.length === 0) return null;
            
            const earnedCount = categoryAchievements.filter(a => isEarned(a.id)).length;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {category.icon}
                    {category.label}
                  </h2>
                  <span className="text-sm text-muted-foreground font-medium">
                    {earnedCount} / {categoryAchievements.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryAchievements.map((achievement) => (
                    <Card key={achievement.id} className={cn("transition-all", isEarned(achievement.id) ? "border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10" : "opacity-80")}>
                      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <AchievementBadge 
                          title={achievement.title}
                          description={achievement.description}
                          iconName={achievement.icon}
                          points={achievement.points}
                          earned={isEarned(achievement.id)}
                          earnedAt={getEarnedAt(achievement.id)}
                          size="lg"
                        />
                        <div>
                          <p className="font-semibold">{achievement.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{achievement.description}</p>
                        </div>
                        <span className={cn("text-xs font-bold mt-auto", isEarned(achievement.id) ? "text-amber-500" : "text-muted-foreground")}>
                          {achievement.points} XP
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export function Achievements() {
  return (
    <RequireAuth>
      <AchievementsContent />
    </RequireAuth>
  );
}
