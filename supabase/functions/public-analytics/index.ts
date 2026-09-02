// Public Analytics
//
// Aggregates platform-wide metrics and returns them as public JSON so the
// /analytics page can show live numbers (and cumulative growth series) without
// exposing any personal data. Runs with the service-role key under the hood,
// so it can count across tables that anonymous RLS would otherwise lock down.
// verify_jwt = false: the endpoint is intentionally callable by anyone.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceRateLimit } from "../_shared/rate_limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
};

// Bucket ISO date strings (YYYY-MM-DD) into a cumulative map keyed by date.
// `rows` must be an array of objects carrying a `created_at` column.
function buildCumulativeSeries(rows: Array<{ created_at: string | null }>): Array<{
  date: string;
  value: number;
}> {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (!row.created_at) continue;
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const sorted = [...byDay.keys()].sort();
  const out: Array<{ date: string; value: number }> = [];
  let running = 0;
  for (const day of sorted) {
    running += byDay.get(day) ?? 0;
    out.push({ date: day, value: running });
  }
  return out;
}

// Same as above but returns daily additions (non-cumulative) before the running total.
function buildDailySeries(rows: Array<{ created_at: string | null }>): Array<{
  date: string;
  added: number;
}> {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (!row.created_at) continue;
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const sorted = [...byDay.keys()].sort();
  return sorted.map((day) => ({ date: day, added: byDay.get(day) ?? 0 }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rl = await enforceRateLimit(req, "public-analytics", 60, 60 * 60 * 1000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: rl.error }), {
        status: rl.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const memberRows = await client.from("profiles").select("created_at, onboarded_at, subscription_status, xp_points");
    const jobRows = await client.from("jobs").select("created_at").eq("status", "published").eq("is_active", true);
    const analysisRows = await client.from("resume_analyses").select("created_at");
    const applicationRows = await client.from("applications").select("created_at");
    const projectRows = await client.from("side_projects").select("created_at").eq("status", "approved");
    const recruiterRows = await client.from("recruiter_profiles").select("created_at");
    const searchRows = await client.from("candidate_searches").select("created_at");
    const interestRows = await client.from("candidate_interests").select("created_at");
    const achievementEarnRows = await client.from("user_achievements").select("earned_at");
    const classRows = await client.from("class_progress").select("completed");
    const companyRows = await client.from("companies").select("id");

    if (
      memberRows.error || jobRows.error || analysisRows.error || applicationRows.error
      || projectRows.error || recruiterRows.error || searchRows.error || interestRows.error
      || achievementEarnRows.error || classRows.error || companyRows.error
    ) {
      return new Response(JSON.stringify({ error: "Failed to aggregate analytics" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberRowsArr = memberRows.data ?? [];
    const jobRowsArr = (jobRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const analysisRowsArr = (analysisRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const applicationRowsArr = (applicationRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const projectRowsArr = (projectRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const recruiterRowsArr = (recruiterRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const searchRowsArr = (searchRows.data ?? []).map((r) => ({ created_at: r.created_at }));
    const interestRowsArr = (interestRows.data ?? []).map((r) => ({ created_at: r.created_at }));

    const memberCreated = memberRowsArr.map((r) => ({ created_at: r.created_at }));
    const onboarded = memberRowsArr.filter((r) => r.onboarded_at).length;
    const proMembers = memberRowsArr.filter(
      (r) => r.subscription_status === "pro",
    ).length;
    const totalXp = memberRowsArr.reduce((acc, r) => acc + (r.xp_points ?? 0), 0);

    const achievementEarned = (achievementEarnRows.data ?? [])
      .map((r) => ({ created_at: r.earned_at }))
      .filter((r) => r.created_at);
    const completedLessons = (classRows.data ?? []).filter((r) => r.completed).length;

    const result = {
      generated_at: new Date().toISOString(),
      catalogue: {
        jobs: jobRowsArr.length,
        companies: companyRows.data?.length ?? 0,
        side_projects: projectRowsArr.length,
      },
      members: {
        total: memberRowsArr.length,
        onboarded,
        pro_subscribers: proMembers,
        total_xp: totalXp,
        cumulative: buildCumulativeSeries(memberCreated),
      },
      growth: {
        jobs_daily: buildDailySeries(jobRowsArr),
        analyses_daily: buildDailySeries(analysisRowsArr),
        members_daily: buildDailySeries(memberCreated),
      },
      funnel: {
        resume_analyses: analysisRowsArr.length,
        applications: applicationRowsArr.length,
      },
      recruiter: {
        companies: recruiterRowsArr.length,
        searches: searchRowsArr.length,
        interests: interestRowsArr.length,
      },
      engagement: {
        achievements_earned: achievementEarned.length,
        completed_lessons: completedLessons,
        achievements_series: buildCumulativeSeries(achievementEarned),
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
