import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-01-27.acacia" });
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user?.email) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    let isPro = false;
    let periodEnd: number | null = null;
    let plan: string | null = null;
    let subId: string | null = null;

    if (customerId) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      const sub = subs.data[0];
      if (sub) {
        isPro = true;
        periodEnd = sub.current_period_end;
        plan = sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
        subId = sub.id;
      }
    }

    await admin.from("profiles").update({ subscription_status: isPro ? "pro" : "free" }).eq("id", user.id);
    await admin.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subId,
      status: isPro ? "pro" : "free",
      plan,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ isPro, plan, current_period_end: periodEnd }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("check-subscription error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
