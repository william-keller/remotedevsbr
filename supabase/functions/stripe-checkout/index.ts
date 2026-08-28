import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { requireSiteUrl } from "../_shared/site_url.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user?.email) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { plan } = await req.json().catch(() => ({ plan: "monthly" }));

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = c.id;
    }

    const price = plan === "yearly"
      ? { unit_amount: 29000, recurring: { interval: "year" as const } }
      : { unit_amount: 2900, recurring: { interval: "month" as const } };

    const siteUrl = requireSiteUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: { name: plan === "yearly" ? "RemoteDevs Pro - Anual" : "RemoteDevs Pro - Mensal" },
          unit_amount: price.unit_amount,
          recurring: price.recurring,
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/pro?success=1`,
      cancel_url: `${siteUrl}/pro?canceled=1`,
      metadata: { user_id: user.id, plan },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-checkout error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
