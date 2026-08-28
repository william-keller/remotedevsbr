import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { requireSiteUrl, isRelativePath } from "../_shared/site_url.ts";

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
    if (!user.email) throw new Error("No email found");

    const { plan, return_url } = await req.json(); // 'professional' or 'enterprise'
    if (return_url !== undefined && !isRelativePath(return_url)) {
      throw new Error("return_url must be a relative path on the same site");
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");

    // 1. Find or create Stripe Customer
    let customerId = "";
    const searchRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${user.email}'`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const searchData = await searchRes.json();
    
    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      const createRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `email=${encodeURIComponent(user.email)}&metadata[user_id]=${user.id}&metadata[role]=recruiter`
      });
      const createData = await createRes.json();
      customerId = createData.id;
    }

    // 2. Define price (Placeholder prices, in real app use Stripe Price IDs)
    // We are passing raw amount data here for demonstration/simplicity
    const amount = plan === "enterprise" ? 49900 : 19900; // In cents BRL
    const planName = plan === "enterprise" ? "Recruiter Enterprise" : "Recruiter Professional";

    const siteUrl = requireSiteUrl();
    const successPath = return_url || "/recruiter/dashboard";
    const cancelPath = return_url || "/recruiter/pricing";

    // 3. Create Checkout Session
    const bodyParams = new URLSearchParams();
    bodyParams.append("customer", customerId);
    bodyParams.append("mode", "subscription");
    bodyParams.append("success_url", `${siteUrl}${successPath}?success=true`);
    bodyParams.append("cancel_url", `${siteUrl}${cancelPath}?canceled=true`);
    
    // Line item
    bodyParams.append("line_items[0][price_data][currency]", "brl");
    bodyParams.append("line_items[0][price_data][product_data][name]", planName);
    bodyParams.append("line_items[0][price_data][recurring][interval]", "month");
    bodyParams.append("line_items[0][price_data][unit_amount]", amount.toString());
    bodyParams.append("line_items[0][quantity]", "1");
    
    bodyParams.append("metadata[user_id]", user.id);
    bodyParams.append("metadata[plan]", plan);
    bodyParams.append("metadata[role]", "recruiter");

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });
    
    const sessionData = await sessionRes.json();
    if (sessionData.error) throw new Error(sessionData.error.message);

    return new Response(JSON.stringify({ url: sessionData.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
