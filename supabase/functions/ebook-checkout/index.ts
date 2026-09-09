import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { requireSiteUrl } from "../_shared/site_url.ts";

const EBOOK_PRICES: Record<string, { currency: string; unit_amount: number }> = {
  brl: { currency: "brl", unit_amount: 6790 },
  usd: { currency: "usd", unit_amount: 1900 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

    const { currency, email } = await req.json().catch(() => ({ currency: null, email: null }));
    const price = EBOOK_PRICES[currency] ?? EBOOK_PRICES.brl;

    const siteUrl = requireSiteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: price.currency,
            product_data: {
              name: "LinkedIn Performance Playbook",
              description: "Versão completa em pt-BR + EN",
            },
            unit_amount: price.unit_amount,
          },
          quantity: 1,
        },
      ],
      ...(typeof email === "string" && email.trim() ? { customer_email: email.trim() } : {}),
      success_url: `${siteUrl}/ebook?success=1`,
      cancel_url: `${siteUrl}/ebook?canceled=1`,
      metadata: {
        type: "ebook",
        currency: price.currency,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ebook-checkout error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});