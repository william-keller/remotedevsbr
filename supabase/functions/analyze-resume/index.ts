// Public AI Resume Analyzer - accepts PDF/text, returns partial preview, full report unlocked by email.
// Unauthenticated by design (top-of-funnel tool). Protected server-side via IP rate limiting,
// JWT-based identity binding when a session is present, and input/email validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { callAI, FREE_MODELS } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Try to parse JSON from raw text. Falls back to extracting from markdown code fences. */
function robustJsonParse(text: string): unknown | null {
  // Attempt 1: direct parse
  try { return JSON.parse(text); } catch { /* continue */ }
  // Attempt 2: extract from ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }
  // Attempt 3: find first { ... } or [ ... ] block
  const braceStart = text.indexOf("{");
  const bracketStart = text.indexOf("[");
  let start = -1;
  if (braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)) start = braceStart;
  else if (bracketStart >= 0) start = bracketStart;
  if (start >= 0) {
    const sub = text.slice(start);
    try { return JSON.parse(sub); } catch { /* give up */ }
  }
  return null;
}

/** Minimal schema check: ensure critical fields exist. */
function validatePartial(obj: any): boolean {
  return obj && typeof obj === "object" && typeof obj.overall_score === "number";
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Lightweight extraction via npm:pdf-parse (Deno npm specifier)
  try {
    // @ts-ignore deno npm
    const mod: any = await import("npm:pdf-parse@1.1.1");
    const pdfParse = mod.default ?? mod;
    const out = await pdfParse(bytes);
    return (out?.text ?? "").trim();
  } catch (e) {
    console.error("pdf-parse failed", e);
    return "";
  }
}

// Returns the authenticated user's id from the request JWT, or null for anonymous callers.
async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  return user?.id ?? null;
}

function json(data: unknown, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const { action } = body;

    // ---------- ACTION: analyze (creates a partial analysis) ----------
    if (action === "analyze") {
      const rl = await enforceRateLimit(req, "resume-analyze", 10, 60 * 60 * 1000, supabase);
      if (!rl.allowed) return json({ error: rl.error }, rl.status);

      const { file_base64, file_name, resume_text, user_id, target_role } = body;

      const authedUserId = await getAuthenticatedUserId(req);
      if (user_id && authedUserId && user_id !== authedUserId) return json({ error: "Forbidden" }, 403);

      let text = (resume_text ?? "").trim();
      if (!text && file_base64) {
        const bin = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
        text = await extractPdfText(bin);
      }
      if (!text || text.length < 80) {
        return json({ error: "Não consegui ler o conteúdo do currículo. Tente outro arquivo ou cole o texto." }, 400);
      }
      // Truncate
      text = text.slice(0, 18000);
      const roleHint = (target_role ?? "").trim();
      const userPayload = roleHint
        ? `Target role for this evaluation: ${roleHint}\n\n--- RESUME ---\n${text}`
        : text;

      const analyzePrompt = `You are a senior tech recruiter evaluating Brazilian developers for US remote roles (ATS and human review).

TASK: Analyze the resume below and return your evaluation.

RESPONSE FORMAT: Return a single valid JSON object. Do NOT wrap it in markdown code fences. Do NOT include any text before or after the JSON. The JSON must have exactly this structure:
{"overall_score":<int 0-100>,"english_signal":"low"|"medium"|"high","seniority_guess":"junior"|"mid"|"senior"|"staff","top_strengths":["...","...","..."],"top_gaps":["...","...","..."],"suggested_roles":["...","...","..."],"detected_stack":["..."],"category_scores":[{"id":"ats","score":<int>,"tip":"..."},{"id":"keywords","score":<int>,"tip":"..."},{"id":"formatting","score":<int>,"tip":"..."},{"id":"impact","score":<int>,"tip":"..."},{"id":"english","score":<int>,"tip":"..."},{"id":"role_fit","score":<int>,"tip":"..."}],"quick_win":"..."}

RULES:
- overall_score: integer 0-100
- english_signal: exactly one of "low", "medium", "high"
- seniority_guess: exactly one of "junior", "mid", "senior", "staff"
- top_strengths, top_gaps, suggested_roles: arrays of exactly 3 strings each
- detected_stack: array of strings
- category_scores: array of exactly 6 objects. Each must have "id" (one of "ats","keywords","formatting","impact","english","role_fit"), "score" (integer 0-100), and "tip" (string, max 90 chars)
- quick_win: one sentence, the highest-impact fix
${roleHint ? `Weight role_fit against the target role: "${roleHint}".` : "If no target role is given, score role_fit based on general US remote tech market fit."}
Be candid but constructive.`;
      const ai = await callAI(analyzePrompt, userPayload, { models: FREE_MODELS, json: true });
      if (!ai.ok) return json({ error: ai.error }, ai.status);

      let partial: any = robustJsonParse(ai.text);
      // Retry once if parse failed or schema invalid
      if (!partial || !validatePartial(partial)) {
        console.warn("analyze-resume: first parse failed, retrying", ai.text.slice(0, 200));
        const retry = await callAI(analyzePrompt, userPayload, { models: FREE_MODELS, json: true });
        if (retry.ok) partial = robustJsonParse(retry.text);
      }
      if (!partial || !validatePartial(partial)) {
        partial = { raw: ai.text, parse_error: "Model did not return valid JSON" };
      }

      if (roleHint) partial.target_role = roleHint;

      const { data: row, error } = await supabase.from("resume_analyses").insert({
        user_id: authedUserId,
        file_name: file_name ?? null,
        resume_text: text,
        partial,
      }).select("id").single();
      if (error) throw error;

      return json({ id: row.id, partial }, 200);
    }

    // ---------- ACTION: unlock (email gate → full report) ----------
    if (action === "unlock") {
      const rl = await enforceRateLimit(req, "resume-unlock", 20, 60 * 60 * 1000, supabase);
      if (!rl.allowed) return json({ error: rl.error }, rl.status);

      const { id, email } = body;
      if (!id || !email) return json({ error: "id e email são obrigatórios" }, 400);
      if (typeof email !== "string" || !EMAIL_RE.test(email)) return json({ error: "Email inválido" }, 400);

      const { data: row, error } = await supabase.from("resume_analyses").select("*").eq("id", id).maybeSingle();
      if (error || !row) throw new Error("Análise não encontrada");

      let full = row.full_report;
      if (!full) {
        const partialRole = (row.partial as { target_role?: string })?.target_role ?? "";
        const fullPayload = partialRole
          ? `Target role: ${partialRole}\n\n--- RESUME ---\n${row.resume_text ?? ""}`
          : (row.resume_text ?? "");
        const unlockPrompt = `You are a senior tech recruiter and career coach for Brazilian devs targeting US remote roles.

TASK: Produce a detailed, actionable report for this resume.

RESPONSE FORMAT: Return a single valid JSON object. Do NOT wrap it in markdown code fences. Do NOT include any text before or after the JSON. The JSON must have exactly this structure:
{"ats_score":<int 0-100>,"readiness_summary":"...","bullet_rewrites":[{"original":"...","improved":"..."}],"missing_keywords":["..."],"english_recommendations":["..."],"30_day_plan":["...","...","...","...","..."],"risk_flags":["..."],"formatting_issues":["..."],"role_fit_summary":"...","category_scores":[{"id":"ats","score":<int>,"tip":"..."},{"id":"keywords","score":<int>,"tip":"..."},{"id":"formatting","score":<int>,"tip":"..."},{"id":"impact","score":<int>,"tip":"..."},{"id":"english","score":<int>,"tip":"..."},{"id":"role_fit","score":<int>,"tip":"..."}]}

RULES:
- ats_score: integer 0-100
- readiness_summary: 2-3 sentences
- bullet_rewrites: array of up to 5 objects, each with "original" and "improved" strings
- missing_keywords: array of strings, prioritize US job-post language
- english_recommendations: array of strings
- 30_day_plan: array of exactly 5 concrete action strings
- risk_flags: array of short strings (red flags for ATS or recruiters)
- formatting_issues: array of up to 5 strings (layout/structure problems)
- role_fit_summary: 2 sentences on fit for target role, or general US remote fit if none
- category_scores: array of exactly 6 objects. Each must have "id" (one of "ats","keywords","formatting","impact","english","role_fit"), "score" (integer 0-100), and "tip" (string, max 90 chars)`;
        const ai = await callAI(unlockPrompt, fullPayload, { models: FREE_MODELS, json: true });
        if (!ai.ok) return json({ error: ai.error }, ai.status);
        full = robustJsonParse(ai.text);
        if (!full || typeof full !== "object" || !full.ats_score) {
          const retry = await callAI(unlockPrompt, fullPayload, { models: FREE_MODELS, json: true });
          if (retry.ok) full = robustJsonParse(retry.text);
        }
        if (!full || typeof full !== "object" || !full.ats_score) {
          full = { raw: ai.text, parse_error: "Model did not return valid JSON" };
        }
      }

      await supabase.from("resume_analyses").update({
        email, email_unlocked: true, full_report: full,
      }).eq("id", id);

      return json({ partial: row.partial, full }, 200);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("analyze-resume error", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});