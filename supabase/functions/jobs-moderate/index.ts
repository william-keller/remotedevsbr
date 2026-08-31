import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { notifyJobRejected } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Authenticate the caller
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 2. Require an admin role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { jobId, action } = await req.json();
    if (!jobId) return json({ error: "jobId is required" }, 400);
    if (action !== "approve" && action !== "reject") {
      return json({ error: "action must be 'approve' or 'reject'" }, 400);
    }

    // 3. Fetch the job (to know the submitter and build notifications)
    const { data: job, error: fetchError } = await adminClient
      .from("jobs")
      .select("id, role, company_name, submitted_by, status")
      .eq("id", jobId)
      .single();
    if (fetchError || !job) return json({ error: "Job not found" }, 404);

    if (action === "approve") {
      const { error: updateError } = await adminClient
        .from("jobs")
        .update({ status: "published", is_active: true, published_at: new Date().toISOString() })
        .eq("id", jobId);
      if (updateError) throw updateError;
    } else {
      const { error: updateError } = await adminClient
        .from("jobs")
        .update({ status: "rejected", is_active: false })
        .eq("id", jobId);
      if (updateError) throw updateError;

      // Notify the submitter in-app and via Telegram
      if (job.submitted_by) {
        await adminClient.from("notifications").insert({
          user_id: job.submitted_by,
          type: "job_rejected",
          payload: {
            role: job.role,
            companyName: job.company_name,
            jobId: job.id,
          },
        });
      }
      await notifyJobRejected({
        role: job.role,
        companyName: job.company_name,
        userId: job.submitted_by ?? undefined,
      });
    }

    return json({ success: true, jobId, status: action === "approve" ? "published" : "rejected" }, 200);
  } catch (e: any) {
    console.error("[jobs-moderate] error:", e);
    return json({ error: e.message }, 500);
  }
});
