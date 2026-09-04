import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const { action = "list", user_id, profile, subscription } = await req.json();

    if (action === "list") {
      const { data: recruiters, error: pErr } = await adminClient
        .from("recruiter_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const recruiterIds = (recruiters ?? []).map((r: { id: string }) => r.id);
      const subsById = new Map<string, any>();
      if (recruiterIds.length > 0) {
        const { data: subs } = await adminClient
          .from("recruiter_subscriptions")
          .select("*")
          .in("recruiter_id", recruiterIds);
        for (const s of subs ?? []) subsById.set(s.recruiter_id, s);
      }

      const profileRows = (recruiters ?? []).map((r: any) => r.user_id);
      const nameById = new Map<string, string>();
      if (profileRows.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, full_name")
          .in("id", profileRows);
        for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? "");
      }

      // Resolve auth emails (service role can only reach auth.users via the admin API)
      const emailById = new Map<string, string>();
      const allUsers: { id: string; email: string }[] = [];
      const { data: users, error: uErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (!uErr) {
        for (const u of users?.users ?? []) {
          emailById.set(u.id, u.email ?? "");
          allUsers.push({ id: u.id, email: u.email ?? "" });
        }
      }

      const result = (recruiters ?? []).map((r: any) => ({
        ...r,
        email: emailById.get(r.user_id) ?? null,
        name: nameById.get(r.user_id) ?? null,
        subscription: subsById.get(r.id) ?? null,
      }));

      return json({ success: true, recruiters: result, users: allUsers });
    }

    if (action === "upsert") {
      if (!user_id) return json({ error: "user_id is required" }, 400);
      if (!profile || !profile.company_name) {
        return json({ error: "profile.company_name is required" }, 400);
      }

      // Create or update the recruiter profile (keyed by unique user_id)
      const profilePayload: any = {
        company_name: profile.company_name,
        company_logo_url: profile.company_logo_url ?? null,
        company_website: profile.company_website ?? null,
        company_size: profile.company_size ?? null,
        industry: profile.industry ?? null,
        hiring_regions: profile.hiring_regions ?? [],
        roles_hiring: profile.roles_hiring ?? [],
        is_verified: profile.is_verified ?? false,
      };

      const { data: existing } = await adminClient
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();

      let recruiterId: string;
      if (existing) {
        const { error: upErr } = await adminClient
          .from("recruiter_profiles")
          .update(profilePayload)
          .eq("user_id", user_id);
        if (upErr) throw upErr;
        recruiterId = existing.id;
      } else {
        const { data: created, error: insErr } = await adminClient
          .from("recruiter_profiles")
          .insert({ user_id, ...profilePayload })
          .select("id")
          .single();
        if (insErr) throw insErr;
        recruiterId = created.id;
      }

      // Upsert subscription (recruiter_id is UNIQUE)
      const subPayload: any = {
        recruiter_id: recruiterId,
        plan: subscription?.plan ?? "free",
        status: subscription?.status ?? "active",
        candidate_views_remaining: subscription?.candidate_views_remaining ?? 0,
        candidate_contacts_remaining: subscription?.candidate_contacts_remaining ?? 0,
        stripe_subscription_id: subscription?.stripe_subscription_id ?? null,
      };
      if (subscription?.current_period_start) subPayload.current_period_start = subscription.current_period_start;
      if (subscription?.current_period_end) subPayload.current_period_end = subscription.current_period_end;

      const { error: subErr } = await adminClient
        .from("recruiter_subscriptions")
        .upsert(subPayload, { onConflict: "recruiter_id" });
      if (subErr) throw subErr;

      return json({ success: true, recruiterId, user_id });
    }

    if (action === "delete") {
      if (!user_id) return json({ error: "user_id is required" }, 400);
      const { error } = await adminClient
        .from("recruiter_profiles")
        .delete()
        .eq("user_id", user_id);
      if (error) throw error;
      return json({ success: true, user_id });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e: any) {
    console.error("[admin-recruiters] error:", e);
    return json({ error: e.message }, 500);
  }
});
