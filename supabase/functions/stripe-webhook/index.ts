import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import {
  notifyMockInterviewPurchased,
  notifyProSubscription,
} from "../_shared/telegram.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-01-27.acacia" });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function setStatus(email: string, customerId: string, sub: Stripe.Subscription | null) {
  const { data: u } = await admin.auth.admin.listUsers();
  const user = u.users.find((x) => x.email === email);
  if (!user) return;
  const isPro = !!sub && sub.status === "active";
  const plan = sub?.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
  await admin.from("profiles").update({ subscription_status: isPro ? "pro" : "free" }).eq("id", user.id);
  await admin.from("subscribers").upsert({
    user_id: user.id,
    email,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id ?? null,
    status: isPro ? "pro" : "free",
    plan: isPro ? plan : null,
    current_period_end: sub ? new Date(sub.current_period_end * 1000).toISOString() : null,
  }, { onConflict: "user_id" });

  if (isPro) {
    await notifyProSubscription({ userEmail: email, plan });
  }
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secret || !sig) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature header");
    return new Response("missing signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e: any) {
    console.error("webhook signature failed", e.message);
    return new Response(`signature error: ${e.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const meta = s.metadata ?? {};

      // Handle mock-interview one-time payments
      if (meta.type === "mock_interview" && s.id) {
        await admin
          .from("mock_interview_purchases")
          .update({ status: "paid", stripe_payment_intent_id: s.payment_intent as string ?? null })
          .eq("stripe_checkout_session_id", s.id)
          .eq("status", "pending");
        console.log("mock-interview purchase confirmed", s.id);

        const customerEmail = s.customer_details?.email || s.customer_email || undefined;
        await notifyMockInterviewPurchased({
          packageName: meta.package_name || "Mock Interview Package",
          sessionCount: meta.session_count || 1,
          userEmail: customerEmail,
          amountCents: s.amount_total ?? undefined,
        });
      } else if (s.subscription && s.customer) {
        // Existing subscription flow
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        const cust = await stripe.customers.retrieve(s.customer as string) as Stripe.Customer;
        if (cust.email) await setStatus(cust.email, cust.id, sub);
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object as Stripe.Subscription;
      const cust = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
      if (cust.email) await setStatus(cust.email, cust.id, event.type === "customer.subscription.deleted" ? null : sub);
    }
  } catch (e: any) {
    console.error("webhook handler error", e);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
