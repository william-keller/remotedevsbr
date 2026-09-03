import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { notifyOnboardingCompleted } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { action, metadata = {} } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Insert activity log
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action,
      metadata,
    });

    // 2. Fetch current profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("xp_points, current_streak, longest_streak, last_active_at")
      .eq("id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    // 3. Streak logic
    let newStreak = profile.current_streak || 0;
    let newLongest = profile.longest_streak || 0;
    
    if (profile.last_active_at) {
      const lastActive = new Date(profile.last_active_at);
      const now = new Date();
      const diffMs = now.getTime() - lastActive.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak += 1;
        if (newStreak > newLongest) newLongest = newStreak;
      } else if (diffDays > 1) {
        newStreak = 1; // Reset streak
      }
    } else {
      newStreak = 1;
      newLongest = 1;
    }

    // Update streak (last_active_at is handled by DB trigger on activity_log insert)
    await adminClient
      .from("profiles")
      .update({ current_streak: newStreak, longest_streak: newLongest })
      .eq("id", user.id);

    // 4. Achievement evaluation based on action
    const achievementsToCheck: string[] = [];
    if (action === "resume_analyzed") achievementsToCheck.push("resume_analyzed");
    if (action === "linkedin_tuned") achievementsToCheck.push("linkedin_tuned");
    if (action === "english_checked") achievementsToCheck.push("english_checked");
    if (action === "job_applied") achievementsToCheck.push("first_application");
    if (action === "pro_upgraded") achievementsToCheck.push("pro_member");
    if (action === "onboarding_completed") achievementsToCheck.push("onboarding_completed");
    if (newStreak >= 7) achievementsToCheck.push("7_day_streak");

    let newXpEarned = 0;
    const earnedAchievements = [];

    for (const key of achievementsToCheck) {
      // Check if they already have it
      const { data: existingUserAchievement } = await adminClient
        .from("user_achievements")
        .select(`id, achievements!inner(key)`)
        .eq("user_id", user.id)
        .eq("achievements.key", key)
        .maybeSingle();

      if (!existingUserAchievement) {
        // Fetch achievement definition
        const { data: achievement } = await adminClient
          .from("achievements")
          .select("id, points, title, icon")
          .eq("key", key)
          .single();

        if (achievement) {
          // Award it
          await adminClient.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });
          newXpEarned += achievement.points;
          earnedAchievements.push(achievement);
          
          // Send in-app notification
          await adminClient.from("notifications").insert({
            user_id: user.id,
            type: "achievement_earned",
            payload: { title: achievement.title, icon: achievement.icon, points: achievement.points }
          });
        }
      }
    }

    // Update XP if earned
    if (newXpEarned > 0) {
      await adminClient
        .from("profiles")
        .update({ xp_points: (profile.xp_points || 0) + newXpEarned })
        .eq("id", user.id);
    }

    // Notify admin on Telegram once a user completes onboarding
    if (action === "onboarding_completed") {
      await notifyOnboardingCompleted({
        userEmail: user.email ?? undefined,
        userId: user.id,
        answers: (metadata?.answers as Record<string, unknown>) ?? {},
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      xp_earned: newXpEarned,
      new_streak: newStreak,
      achievements: earnedAchievements
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
