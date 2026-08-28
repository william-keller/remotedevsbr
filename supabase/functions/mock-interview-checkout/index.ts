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
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "auth required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { package_id } = await req.json().catch(() => ({ package_id: null }));
    if (!package_id) {
      return new Response(JSON.stringify({ error: "package_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the package
    const { data: pkg, error: pkgErr } = await supabase
      .from("mock_interview_packages")
      .select("id, name_pt, name_en, session_count, price_cents, is_active")
      .eq("id", package_id)
      .single();

    if (pkgErr || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package is not available" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = c.id;
    }

    const siteUrl = requireSiteUrl();

    // Create one-time payment checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: {
            name: `Mock Interview - ${pkg.name_en} (${pkg.session_count}x 60min)`,
          },
          unit_amount: pkg.price_cents,
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/mock-interview?success=1`,
      cancel_url: `${siteUrl}/mock-interview?canceled=1`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        session_count: String(pkg.session_count),
        type: "mock_interview",
      },
    });

    // Create pending purchase record
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await adminClient.from("mock_interview_purchases").insert({
      user_id: user.id,
      package_id: pkg.id,
      stripe_checkout_session_id: session.id,
      sessions_total: pkg.session_count,
      sessions_used: 0,
      status: "pending",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("mock-interview-checkout error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
