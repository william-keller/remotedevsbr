import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify recruiter
    const { data: recruiter } = await adminClient
      .from("recruiter_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!recruiter) throw new Error("Recruiter profile not found");

    // Get subscription tier
    const { data: subscription } = await adminClient
      .from("recruiter_subscriptions")
      .select("plan, candidate_views_remaining")
      .eq("recruiter_id", recruiter.id)
      .single();

    const plan = subscription?.plan || "free";
    const isFree = plan === "free";

    const { filters = {}, page = 1, page_size = 9 } = await req.json();

    const currentPage = Math.max(1, Math.floor(Number(page) || 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(page_size) || 9)));

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build search query
    let query = adminClient
      .from("profiles")
      .select("id, full_name, avatar_url, current_job_title, english_level, stack, years_experience, remote_goals, monthly_income_bucket", { count: "exact" })
      .eq("visible_to_recruiters", true);

    if (filters.stack && filters.stack.length > 0) {
      query = query.contains("stack", filters.stack);
    }
    if (filters.english_level) {
      query = query.eq("english_level", filters.english_level);
    }
    // Add more filters as needed...

    query = query.range(from, to);

    const { data: candidates, error, count } = await query;
    if (error) throw error;

    const total = count ?? 0;

    // Obfuscate data for free tier
    const results = candidates.map((c: any) => {
      if (plan === "free") {
        return {
          id: c.id,
          full_name: c.full_name ? c.full_name.split(' ')[0] + " ***" : "Candidate",
          current_job_title: c.current_job_title,
          stack: c.stack,
          english_level: c.english_level,
          is_blurred: true
        };
      }
      return c;
    });

    // Log search
    await adminClient.from("candidate_searches").insert({
      recruiter_id: recruiter.id,
      filters,
      results_count: results.length
    });

    return new Response(JSON.stringify({ 
      success: true, 
      candidates: results,
      plan,
      total,
      page: currentPage,
      page_size: pageSize,
      requires_subscription: isFree,
      message: isFree
        ? "You're on the free tier. Upgrade to a Professional or Enterprise plan to unlock full profiles and contact candidates."
        : null
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
