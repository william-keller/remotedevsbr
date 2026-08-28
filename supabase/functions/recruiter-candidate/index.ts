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

    // Get subscription plan
    const { data: subscription } = await adminClient
      .from("recruiter_subscriptions")
      .select("plan, candidate_views_remaining")
      .eq("recruiter_id", recruiter.id)
      .single();

    const plan = subscription?.plan || "free";

    const { candidate_id } = await req.json();
    if (!candidate_id) throw new Error("candidate_id is required");

    // Fetch candidate
    const { data: candidate, error } = await adminClient
      .from("profiles")
      .select("id, full_name, avatar_url, current_job_title, english_level, stack, years_experience, remote_goals, visible_to_recruiters")
      .eq("id", candidate_id)
      .eq("visible_to_recruiters", true)
      .single();

    if (error || !candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obfuscate for free tier
    let result = { ...candidate };
    if (plan === "free") {
      result = {
        id: candidate.id,
        full_name: candidate.full_name ? candidate.full_name.split(" ")[0] + " ***" : "Candidate",
        avatar_url: null, // Omit to prevent reverse image search
        current_job_title: candidate.current_job_title,
        english_level: candidate.english_level,
        stack: candidate.stack,
        years_experience: candidate.years_experience,
        remote_goals: "Upgrade to Professional or Enterprise to unlock contact details, goals, and full profile.",
        visible_to_recruiters: true,
        is_blurred: true,
      };
    } else {
      (result as any).is_blurred = false;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      candidate: result,
      plan 
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
