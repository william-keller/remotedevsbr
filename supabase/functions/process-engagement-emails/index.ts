import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isServiceRoleRequest(req: Request): boolean {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const payload = JSON.parse(atob(base64));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!isServiceRoleRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Find pending emails due to be sent
    const { data: pendingEmails, error: fetchError } = await adminClient
      .from("engagement_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processedIds = [];

    // 2. Process each email (Placeholder for actual email sending like Resend)
    for (const email of pendingEmails) {
      // In a real implementation:
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send({ ... });
      
      console.log(`[Email Mock] Sending template '${email.template}' to user_id ${email.user_id}`);
      
      // We will also dispatch an in-app notification just to show it works
      await adminClient.from("notifications").insert({
        user_id: email.user_id,
        type: "system_email",
        payload: { 
          title: `Email Sent: ${email.template}`, 
          body: "Check your inbox for new tips and insights!"
        }
      });

      // Mark as sent
      await adminClient
        .from("engagement_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email.id);
        
      processedIds.push(email.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_count: processedIds.length,
      processed_ids: processedIds
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
