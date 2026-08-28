import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
}

export interface UserAchievement {
  achievement_id: string;
  earned_at: string;
}

export function useEngagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEngagementData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Fetch profile engagement stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_points, current_streak, longest_streak')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setXp(profile.xp_points || 0);
        setStreak(profile.current_streak || 0);
        setLongestStreak(profile.longest_streak || 0);
      }

      // 2. Fetch all possible achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true });
        
      if (allAchievements) {
        setAchievements(allAchievements);
      }

      // 3. Fetch user's earned achievements
      const { data: earned } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', user.id);
        
      if (earned) {
        setUserAchievements(earned);
      }
    } catch (err) {
      console.error("Failed to load engagement data", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEngagementData();
  }, [fetchEngagementData]);

  const trackActivity = async (action: string, metadata: any = {}) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke("track-activity", {
        body: { action, metadata }
      });
      
      if (error) throw error;
      
      // Update local state if needed
      if (data) {
        if (data.new_streak !== undefined && data.new_streak !== streak) {
          setStreak(data.new_streak);
        }
        
        if (data.xp_earned > 0) {
          setXp(prev => prev + data.xp_earned);
        }
        
        // Show toasts for new achievements
        if (data.achievements && data.achievements.length > 0) {
          data.achievements.forEach((ach: any) => {
            toast({
              title: "Achievement Unlocked! 🏆",
              description: `You earned '${ach.title}' (+${ach.points} XP)`,
            });
          });
          // Refresh list to show new badges
          fetchEngagementData();
        }
      }
      
      return data;
    } catch (err) {
      console.error("Failed to track activity", err);
      return null;
    }
  };

  return {
    xp,
    streak,
    longestStreak,
    achievements,
    userAchievements,
    loading,
    trackActivity,
    refresh: fetchEngagementData
  };
}
