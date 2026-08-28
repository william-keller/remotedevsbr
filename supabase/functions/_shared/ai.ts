// Shared OpenAI-compatible chat completions client for the free AI tools.
// Provider-agnostic: any compatible endpoint works. Set OPENAI_API_KEY and,
// optionally, OPENAI_BASE_URL (defaults to OpenRouter).
export interface CallAIOptions {
  model: string;
  json?: boolean;
}

export type CallAIResult =
  | { ok: true; text: string }
  | { ok: false; error: string; status: number };

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const APP_TITLE = "RemoteDevsBR";
const REQUEST_TIMEOUT_MS = 60_000;

export async function callAI(
  system: string,
  user: string,
  opts: CallAIOptions
): Promise<CallAIResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const baseUrl = (Deno.env.get("OPENAI_BASE_URL") ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const siteUrl = Deno.env.get("SITE_URL")?.trim().replace(/\/+$/, "");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  headers["X-Title"] = APP_TITLE;

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (resp.status === 429) {
    return { ok: false, error: "Rate limit reached, try again in a moment.", status: 429 };
  }
  if (resp.status === 402) {
    return { ok: false, error: "AI credits exhausted, add credits to continue.", status: 402 };
  }
  if (!resp.ok) {
    const detail = await resp.text();
    console.error("chat completions error", resp.status, detail);
    return { ok: false, error: "AI request failed", status: 500 };
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { ok: true, text };
}