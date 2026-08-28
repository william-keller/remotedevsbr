// Fetches Open Graph metadata from a given URL
// Returns: { title, description, image, siteName }
// SSRF hardened: only public http(s) targets, no private/loopback/link-local IPs,
// no metadata endpoints, no non-standard ports, and redirects are re-validated.

import { enforceRateLimit } from "../_shared/rate_limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 8000;
const MAX_BYTES = 50 * 1024;

function isPrivateIp(ip: string): boolean {
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    if (a === 192 && (b === 18 || b === 19)) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
  if (/^fe[89ab]/.test(lower)) return true;
  if (/^f[cd][0-9a-f]{2}/.test(lower)) return true;
  if (/^ff[0-9a-f]/.test(lower)) return true;
  if (lower.startsWith("2001:db8") || lower.startsWith("64:ff9b:")) return true;
  return false;
}

async function resolveHost(host: string): Promise<string[]> {
  const out: string[] = [];
  for (const recordType of ["A", "AAAA"]) {
    try {
      const res: unknown = await Deno.resolveDns(host, recordType as "A");
      const items = Array.isArray(res) ? (res as unknown[]) : [res];
      for (const item of items) {
        if (typeof item === "string") out.push(item);
      }
    } catch {
      // no records of this type
    }
  }
  return out;
}

// Throws if the URL is not a safe public http(s) target.
async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error("Only standard ports are allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new Error("URL has no host");

  const isLiteral = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
  const ips = isLiteral ? [host] : await resolveHost(host);
  if (!ips.length) throw new Error("Could not resolve host");
  if (ips.some(isPrivateIp)) throw new Error("Private or internal addresses are not allowed");
}

function extractMeta(html: string, property: string): string {
  // Try og: property first, then name attribute
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractMetaByName(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function resolveUrl(base: string, value: string): string {
  if (!value) return "";
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rl = await enforceRateLimit(req, "fetch-og", 60, 60 * 60 * 1000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: rl.error }), {
        status: rl.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let current: URL;
    try {
      current = new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await assertPublicUrl(current);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unsafe URL";
      return new Response(JSON.stringify({ error: `Blocked URL: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = "";
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(current, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RemoteDevsBR/1.0; +https://remotedevsbr.com)",
            "Accept": "text/html",
          },
          signal: controller.signal,
          redirect: "manual",
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        response.body?.cancel().catch(() => {});
        if (!location) {
          return new Response(JSON.stringify({ error: "Redirect without location" }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        try {
          const next = new URL(location, current);
          await assertPublicUrl(next);
          current = next;
          continue;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unsafe redirect";
          return new Response(JSON.stringify({ error: `Blocked redirect: ${message}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (!response.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch URL (${response.status})` }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Read only the first ~50KB to find meta tags (they're always in <head>)
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let bytesRead = 0;
        while (bytesRead < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          bytesRead += value.length;
          // Stop early if we've passed </head>
          if (html.includes("</head>") || html.includes("</HEAD>")) break;
        }
        reader.cancel().catch(() => {});
      }
      break;
    }

    if (!html) {
      return new Response(JSON.stringify({ error: "Failed to read response body" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ogTitle = decodeHtmlEntities(extractMeta(html, "og:title"));
    const ogDescription = decodeHtmlEntities(extractMeta(html, "og:description"));
    const ogImage = resolveUrl(current.href, decodeHtmlEntities(extractMeta(html, "og:image")));
    const ogSiteName = decodeHtmlEntities(extractMeta(html, "og:site_name"));
    const metaDescription = decodeHtmlEntities(extractMetaByName(html, "description"));
    const pageTitle = decodeHtmlEntities(extractTitle(html));

    const result = {
      title: ogTitle || ogSiteName || pageTitle || "",
      description: ogDescription || metaDescription || "",
      image: ogImage || "",
      siteName: ogSiteName || "",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort");
    return new Response(
      JSON.stringify({ error: isTimeout ? "Request timed out" : `Failed to fetch metadata: ${message}` }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});