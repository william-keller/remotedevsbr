// Site URL resolution for Edge Functions that build redirect URLs.
// Never trusts the client Origin header and never falls back to a
// hardcoded production domain. Fails fast when SITE_URL is not set.

export function requireSiteUrl(): string {
  const siteUrl = Deno.env.get("SITE_URL")?.trim().replace(/\/+$/, "");
  if (!siteUrl) {
    throw new Error(
      "SITE_URL is not configured. Set it as an edge function secret, e.g. supabase secrets set SITE_URL=https://your-domain.example"
    );
  }
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("SITE_URL must be an http(s) URL");
    }
    if (parsed.username || parsed.password) {
      throw new Error("SITE_URL must not contain credentials");
    }
    return parsed.origin;
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid SITE_URL";
    throw new Error(`Invalid SITE_URL: ${message}`);
  }
}

// Returns true only for safe same-site relative paths (e.g. "/pro?tab=billing").
export function isRelativePath(value: string): boolean {
  if (typeof value !== "string" || !value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/\\")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  return true;
}