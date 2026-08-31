import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JobPayload = {
  jobId?: string;
  companyName: string;
  companyWebsite?: string | null;
  role: string;
  seniorityLevel?: string | null;
  jobType?: string | null;
  locationType?: string | null;
  locationLabel?: string | null;
  regionScope?: string | null;
  countryCodes?: string[] | null;
  timezoneRegions?: string[] | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  applyUrl: string;
  stack?: string[] | null;
  description?: string | null;
  perks?: string[] | null;
  source?: string | null;
  isFeatured?: boolean;
  isHot?: boolean;
};

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    if (!user) throw new Error("Unauthorized");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload = (await req.json()) as JobPayload;
    if (!payload.companyName?.trim()) throw new Error("companyName is required");
    if (!payload.role?.trim()) throw new Error("role is required");
    if (!payload.applyUrl?.trim()) throw new Error("applyUrl is required");

    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .upsert(
        {
          name: payload.companyName.trim(),
          slug: toSlug(payload.companyName.trim()),
          website: payload.companyWebsite ?? null,
          list_type: "golden",
          hiring: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (companyError) throw companyError;

    const slugBase = toSlug(`${payload.role}-${payload.companyName}`);

    // Determine the resulting moderation status. New submissions and resubmits
    // of pending/rejected jobs stay "pending" for admin review. Edits to an
    // already-published job (owner correcting an approved listing) stay
    // "published".
    let existingStatus: string | null = null;
    if (payload.jobId) {
      const { data: existing } = await adminClient
        .from("jobs")
        .select("status")
        .eq("id", payload.jobId)
        .eq("submitted_by", user.id)
        .single();
      existingStatus = existing?.status ?? null;
    }

    const isEditOfPublished =
      payload.jobId && (existingStatus === "published" || existingStatus === "archived");

    const jobStatus = isEditOfPublished ? "published" : "pending";
    const nowIso = new Date().toISOString();

    const jobRecord = {
      submitted_by: user.id,
      source: payload.source?.trim() || "member",
      company_id: company.id,
      company_name: payload.companyName.trim(),
      role: payload.role.trim(),
      title: payload.role.trim(),
      slug: payload.jobId ? undefined : `${slugBase}-${crypto.randomUUID().slice(0, 6)}`,
      seniority_level: payload.seniorityLevel || null,
      seniority: payload.seniorityLevel || null,
      job_type: payload.jobType || "full_time",
      location_type: payload.locationType || "remote",
      location: payload.locationLabel || "Remote",
      region_scope: payload.regionScope || null,
      country_codes: payload.countryCodes ?? null,
      timezone_regions: payload.timezoneRegions ?? null,
      salary_min: payload.salaryMin ?? null,
      salary_max: payload.salaryMax ?? null,
      salary_currency: payload.salaryCurrency || "USD",
      salary_period: payload.salaryPeriod || "year",
      comp_min: payload.salaryMin ?? null,
      comp_max: payload.salaryMax ?? null,
      comp_currency: payload.salaryCurrency || "USD",
      apply_url: payload.applyUrl.trim(),
      stack: payload.stack ?? null,
      description: payload.description ?? null,
      status: jobStatus,
      is_active: isEditOfPublished,
      published_at: isEditOfPublished ? (existingStatus === "archived" ? nowIso : undefined) : undefined,
      posted_at: nowIso,
      is_featured: !!payload.isFeatured,
      is_hot: !!payload.isHot,
    };

    let jobId = payload.jobId;
    if (jobId) {
      const { error: updateError } = await adminClient
        .from("jobs")
        .update(jobRecord)
        .eq("id", jobId)
        .eq("submitted_by", user.id);
      if (updateError) throw updateError;
    } else {
      const { data: created, error: createError } = await adminClient
        .from("jobs")
        .insert(jobRecord)
        .select("id")
        .single();
      if (createError) throw createError;
      jobId = created.id;
    }

    const perkSlugs = (payload.perks ?? []).map((p) => p.trim()).filter(Boolean);
    if (perkSlugs.length > 0) {
      const { data: perkRows } = await adminClient
        .from("job_perks")
        .select("id, slug")
        .in("slug", perkSlugs);

      if (perkRows?.length) {
        await adminClient.from("job_perk_map").delete().eq("job_id", jobId);
        await adminClient.from("job_perk_map").insert(
          perkRows.map((perk) => ({
            job_id: jobId,
            perk_id: perk.id,
          })),
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        status: jobStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
