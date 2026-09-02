// Onstrider Job Scraper
//
// Scheduled (daily) edge function that authenticates against Onstrider's Clerk
// login, pulls its active partner referral job listings, and syncs them into our
// public `jobs` board. Jobs are auto-published (trusted source), deduplicated by
// Onstrider id (stored in `external_id`), and deactivated when they disappear
// from the source.
//
// Run manually for testing: POST to the function URL (with a Bearer JWT).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  notifyOnstriderScrape,
  notifyOnstriderScrapeFailed,
} from "../_shared/telegram.ts";
import { enforceRateLimit } from "../_shared/rate_limit.ts";

const SOURCE = "onstrider";
const DEFAULT_COMPANY = "Onstrider";
const REFERRER_SLUG = "williamkeller";
const REFERRER_QUERY = "?referral=william_2mzwlv";
const CLERK_SIGN_IN_URL = "https://clerk.onstrider.com/v1/client/sign_ins";
const CLERK_ORIGIN = "https://app.onstrider.com";
const JOB_LISTINGS_URL =
  "https://app.onstrider.com/api/referrals/job-listings?status=Active";

const BROWSER_HEADERS = {
  Origin: CLERK_ORIGIN,
  Referer: "https://app.onstrider.com/job-board",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

const EMPTY_SALARY = {
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
} as const;

// ---------------------------------------------------------------------------
// Parsers (deterministic string parsing of Onstrider label fields)
// ---------------------------------------------------------------------------

function parseAmount(token: string): number {
  const value = parseFloat(token.replace(/,/g, ""));
  if (token.toLowerCase().includes("k")) return value * 1000;
  return value;
}

function parseSalary(
  label?: string,
): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "year" | "month" | "week" | "day" | "hour" | null;
} {
  const raw = (label ?? "").trim();
  if (!raw || /negotiable|negotiation|oji|undisclosed/i.test(raw)) {
    return EMPTY_SALARY;
  }

  const range = raw.match(
    /([\d.,]+\s*k?)\s*(?:-|–|to)\s*([\d.,]+\s*k?)/i,
  );
  const currency =
    raw.match(/\b([A-Z]{3})\b/i)?.[1]?.toUpperCase() ?? null;

  let period: "year" | "month" | "week" | "day" | "hour" | null = null;
  const unitMatch = raw.match(/\/(per\s+)?(year|yr|month|mo|week|wk|day|hour|hr)/i);
  if (unitMatch) {
    const unit = unitMatch[2].toLowerCase();
    if (unit === "yr" || unit === "year") period = "year";
    else if (unit === "mo" || unit === "month") period = "month";
    else if (unit === "wk" || unit === "week") period = "week";
    else if (unit === "day") period = "day";
    else if (unit === "hr" || unit === "hour") period = "hour";
  }

  if (!range) {
    const single = raw.match(/([\d.,]+\s*k?)/);
    if (!single) return { ...EMPTY_SALARY, salaryCurrency: currency, salaryPeriod: period };
    const amount = parseAmount(single[1]);
    return {
      salaryMin: amount,
      salaryMax: amount,
      salaryCurrency: currency ?? "USD",
      salaryPeriod: period ?? "month",
    };
  }

  return {
    salaryMin: parseAmount(range[1]),
    salaryMax: parseAmount(range[2]),
    salaryCurrency: currency ?? "USD",
    salaryPeriod: period ?? "month",
  };
}

function parseSeniority(
  minimumExperienceLabel?: string,
): {
  seniorityLevel: "intern" | "junior" | "mid" | "senior" | "lead" | null;
  seniority: string | null;
} {
  const raw = (minimumExperienceLabel ?? "").trim();
  if (!raw) return { seniorityLevel: null, seniority: null };

  const yearMatch = raw.match(/(\d+)/);
  const lowerBound = yearMatch ? parseInt(yearMatch[1], 10) : null;

  if (lowerBound === null) return { seniorityLevel: null, seniority: raw };

  const seniorityLevel: "intern" | "junior" | "mid" | "senior" | "lead" =
    lowerBound <= 1 ? "junior" : lowerBound <= 3 ? "mid" : "senior";

  return { seniorityLevel, seniority: raw };
}

function parseJobType(
  contractDetailsLabel?: string,
): "full_time" | "part_time" | "contract" | "freelance" | "internship" {
  const raw = (contractDetailsLabel ?? "").toLowerCase();
  if (/freelance/i.test(raw)) return "freelance";
  if (/part.?time/i.test(raw)) return "part_time";
  if (/short.?term|contract|project/i.test(raw)) return "contract";
  if (/intern/i.test(raw)) return "internship";
  return "full_time";
}

function parseStack(requiredSkillsLabel?: string): string[] {
  return (requiredSkillsLabel ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function makeSlug(role: string, externalId: string): string {
  const suffix = externalId.slice(0, 6);
  return `${toSlug(role)}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Onstrider API calls
// ---------------------------------------------------------------------------

interface OnstriderSession {
  jwt: string;
  cookies: string;
}

function extractSetCookies(res: Response): string[] {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ?? "").split(",");

  return raw
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.split(";")[0])
    .filter((c) => c.includes("="));
}

async function getSessionToken(
  sessionId: string,
  clientCookie: string,
): Promise<string | null> {
  const url = `https://clerk.onstrider.com/v1/client/sessions/${sessionId}/tokens/token-with-email`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        Cookie: clientCookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "",
    });
    if (!res.ok) {
      console.log(
        `[scrape-onstrider] token-with-email request failed (${res.status}): ${await res.text()}`,
      );
      return null;
    }
    const data = await res.json();
    return typeof data?.jwt === "string" && data.jwt ? data.jwt : null;
  } catch (err: any) {
    console.warn(`[scrape-onstrider] token-with-email request error: ${err.message}`);
    return null;
  }
}

async function login(): Promise<OnstriderSession> {
  const email = Deno.env.get("ONSTRIDER_EMAIL");
  const password = Deno.env.get("ONSTRIDER_PASSWORD");
  if (!email || !password) {
    throw new Error("ONSTRIDER_EMAIL and ONSTRIDER_PASSWORD secrets are required.");
  }

  const body = new URLSearchParams({
    identifier: email,
    password,
    strategy: "password",
  });

  const res = await fetch(CLERK_SIGN_IN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...BROWSER_HEADERS,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Onstrider login failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const jwt = data?.client?.sessions?.[0]?.last_active_token?.jwt;
  if (!jwt) {
    throw new Error("Onstrider login succeeded but no session JWT was returned.");
  }

  const cookies = extractSetCookies(res);

  // Clerk's BFF flow issues a fresh session token with the email claim
  // required by Onstrider's API auth. Fetch it via the token-with-email
  // endpoint (matching the real browser flow) and prefer it over
  // last_active_token.
  const clientCookie = cookies.find((c) => c.startsWith("__client=")) ?? "";
  const sessionId = data?.client?.sessions?.[0]?.id;
  let authJwt = jwt;
  if (sessionId && clientCookie) {
    const freshToken = await getSessionToken(sessionId, clientCookie);
    if (freshToken) authJwt = freshToken;
    else console.warn("[scrape-onstrider] token-with-email unavailable; falling back to last_active_token");
  }

  // Ensure the session JWT is available as the Clerk __session cookie.
  const hasSessionCookie = cookies.some((c) => c.startsWith("__session="));
  if (!hasSessionCookie) {
    cookies.push(`__session=${authJwt}`);
  }
  // Referral attribution cookies observed in the working browser request.
  if (!cookies.some((c) => c.startsWith("referrer_slug="))) {
    cookies.push(`referrer_slug=${REFERRER_SLUG}`);
  }
  if (!cookies.some((c) => c.startsWith("QueryString="))) {
    cookies.push(`QueryString=${REFERRER_QUERY}`);
  }

  return { jwt: authJwt, cookies: cookies.join("; ") };
}

async function fetchJobs(session: OnstriderSession): Promise<any[]> {
  const headers: Record<string, string> = {
    ...BROWSER_HEADERS,
  };
  if (session.jwt) headers.Authorization = `Bearer ${session.jwt}`;
  if (session.cookies) {
    headers.Cookie = `${
      headers.Cookie ? `${headers.Cookie}; ` : ""
    }${session.cookies}`;
  }

  const res = await fetch(JOB_LISTINGS_URL, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Onstrider job fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

async function syncJobs(
  client: any,
  items: any[],
): Promise<{ inserted: number; updated: number; deactivated: number; fetched: number }> {
  const fetched = items.length;

  const { data: existingRows, error: selectError } = await client
    .from("jobs")
    .select("id, external_id, posted_at")
    .eq("source", SOURCE)
    .not("external_id", "is", null);

  if (selectError) throw selectError;

  const existingByExternal: Record<string, { id: string; posted_at: string }> = {};
  for (const row of existingRows ?? []) {
    if (row.external_id) existingByExternal[row.external_id] = row;
  }

  const nowIso = new Date().toISOString();
  const seenExternal = new Set<string>();

  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const externalId = item?.id;
    if (!externalId) continue;
    seenExternal.add(externalId);

    const title = (item.title ?? "").trim();
    if (!title) continue;

    const salary = parseSalary(item.compensationLabel);
    const seniority = parseSeniority(item.minimumExperienceLabel);
    const companyName =
      item?.company?.name?.trim() ??
      item?.companyName?.trim() ??
      DEFAULT_COMPANY;

    const base = {
      source: SOURCE,
      external_id: externalId,
      company_name: companyName,
      role: title,
      title,
      seniority_level: seniority.seniorityLevel,
      seniority: seniority.seniority,
      english_level: (item.minEnglishLevel ?? "").trim() || null,
      job_type: parseJobType(item.contractDetailsLabel),
      location_type: "remote",
      location: "Remote",
      region_scope: "worldwide",
      salary_min: salary.salaryMin,
      salary_max: salary.salaryMax,
      salary_currency: salary.salaryCurrency,
      salary_period: salary.salaryPeriod,
      comp_min: salary.salaryMin,
      comp_max: salary.salaryMax,
      comp_currency: salary.salaryCurrency,
      apply_url: (item.referralUrl ?? "").trim(),
      stack: parseStack(item.requiredSkillsLabel),
      is_hot: (item.priority ?? "").trim().toLowerCase() === "high",
    } as const;

    const existing = existingByExternal[externalId];

    if (existing) {
      const { error: updateError } = await client
        .from("jobs")
        .update(base)
        .eq("id", existing.id);
      if (updateError) throw updateError;
      updated += 1;
    } else {
      const { error: insertError } = await client.from("jobs").insert({
        ...base,
        slug: makeSlug(title, externalId),
        status: "published",
        is_active: true,
        posted_at: nowIso,
        published_at: nowIso,
        is_featured: false,
        is_verified_company: false,
      });
      if (insertError) throw insertError;
      inserted += 1;
    }
  }

  let deactivated = 0;
  const toDeactivate = Object.keys(existingByExternal).filter(
    (ext) => !seenExternal.has(ext),
  );
  if (toDeactivate.length > 0) {
    const { error: deactivateError } = await client
      .from("jobs")
      .update({ is_active: false, published_at: null })
      .eq("source", SOURCE)
      .in("external_id", toDeactivate);
    if (deactivateError) throw deactivateError;
    deactivated = toDeactivate.length;
  }

  return { inserted, updated, deactivated, fetched };
}

// ---------------------------------------------------------------------------
// Server entrypoint
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204 });
  }

  try {
    const rate = await enforceRateLimit(req, "scrape-onstrider", 10, 24 * 60 * 60 * 1000);
    if (!rate.allowed) {
      return new Response(JSON.stringify({ error: rate.error }), {
        status: rate.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const session = await login();
    const items = await fetchJobs(session);
    const result = await syncJobs(client, items);

    try {
      await notifyOnstriderScrape(result);
    } catch (err: any) {
      console.warn("[scrape-onstrider] Telegram success notify failed:", err.message);
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = error?.message ?? "Unknown error";
    try {
      await notifyOnstriderScrapeFailed(message);
    } catch (notifyErr: any) {
      console.warn("[scrape-onstrider] Telegram failure notify failed:", notifyErr.message);
    }
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
