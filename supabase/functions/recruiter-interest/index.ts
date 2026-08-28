import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { notifyRecruiterInterest } from "../_shared/telegram.ts";

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
      .select("id, company_name")
      .eq("user_id", user.id)
      .single();

    if (!recruiter) throw new Error("Recruiter profile not found");

    // Check quota
    const { data: subscription } = await adminClient
      .from("recruiter_subscriptions")
      .select("id, plan, candidate_contacts_remaining")
      .eq("recruiter_id", recruiter.id)
      .single();

    if (!subscription || (subscription.plan !== "enterprise" && subscription.candidate_contacts_remaining <= 0)) {
       throw new Error("Contact quota exceeded. Please upgrade your plan.");
    }

    const { candidate_id, message } = await req.json();

    // Insert interest
    const { error: insertError } = await adminClient.from("candidate_interests").insert({
      recruiter_id: recruiter.id,
      candidate_id,
      message,
      status: "interested"
    });

    if (insertError) throw insertError;

    // Decrement quota if not enterprise
    if (subscription.plan !== "enterprise") {
      await adminClient.from("recruiter_subscriptions").update({
        candidate_contacts_remaining: subscription.candidate_contacts_remaining - 1
      }).eq("id", subscription.id);
    }

    // Send notification to candidate
    await adminClient.from("notifications").insert({
      user_id: candidate_id,
      type: "recruiter_interest",
      payload: {
        title: "New Recruiter Interest!",
        body: `${recruiter.company_name} is interested in your profile.`,
        recruiter_id: recruiter.id
      }
    });

    // Send Telegram alert
    await notifyRecruiterInterest({
      companyName: recruiter.company_name,
      candidateId: candidate_id,
      message: message || undefined,
    });

    // Also trigger activity for the candidate to potentially earn the "first_interest" achievement
    // In a real app we'd queue an async task for this
    await adminClient.from("activity_log").insert({
      user_id: candidate_id,
      action: "received_interest",
      metadata: { recruiter_id: recruiter.id }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
