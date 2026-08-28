// Shared IP-based rate limiter for unauthenticated public tools.
// Counts calls per client (hashed source IP) in a rolling window using the
// ai_rate_limits table. Fail closed: if the limit cannot be enforced the
// request is rejected.
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.95.0";

const TABLE = "ai_rate_limits";

export interface RateLimitResult {
  allowed: boolean;
  status: number;
  error?: string;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function hashClient(bucket: string, ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${bucket}:${ip}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function enforceRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
  admin?: SupabaseClient
): Promise<RateLimitResult> {
  const client =
    admin ??
    createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

  const clientKey = await hashClient(bucket, getClientIp(req));
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await client
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("client_key", clientKey)
    .gte("created_at", since);

  if (error) {
    console.error(`[rate_limit] count failed for ${bucket}:`, error.message);
    return { allowed: false, status: 500, error: "Rate limit check failed." };
  }

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      status: 429,
      error: "Too many requests, please try again later.",
    };
  }

  await client.from(TABLE).insert({ bucket, client_key: clientKey });

  if (Math.random() < 0.02) {
    const cutoff = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    (async () => {
      try {
        await client.from(TABLE).delete().lt("created_at", cutoff);
      } catch {
        // best-effort cleanup, ignore failures
      }
    })();
  }

  return { allowed: true, status: 200 };
}