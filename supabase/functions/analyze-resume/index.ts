// Public AI Resume Analyzer - accepts PDF/text, returns partial preview, full report unlocked by email.
// Unauthenticated by design (top-of-funnel tool). Protected server-side via IP rate limiting,
// JWT-based identity binding when a session is present, and input/email validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

      const ai = await callAI(
        `You are a senior tech recruiter evaluating Brazilian developers for US remote roles (ATS + human review). Return STRICT JSON with:
- overall_score (0-100 integer)
- english_signal ("low"|"medium"|"high")
- seniority_guess ("junior"|"mid"|"senior"|"staff")
- top_strengths (array of 3 short strings)
- top_gaps (array of 3 short strings)
- suggested_roles (array of 3 short strings)
- detected_stack (array of strings)
- category_scores (array of exactly 6 objects, each: id one of "ats","keywords","formatting","impact","english","role_fit"; score 0-100 integer; tip max 90 chars)
- quick_win (one sentence: highest-impact fix)
Be candid but constructive.${roleHint ? " Weight role_fit against the target role provided." : " If no target role, score role_fit based on general US remote tech market fit."}`,
        userPayload,
        { model: "google/gemma-4-31b-it:free", json: true },
      );
      if (!ai.ok) return json({ error: ai.error }, ai.status);
      let partial: any = {};
      try { partial = JSON.parse(ai.text); } catch { partial = { raw: ai.text }; }

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
        const ai = await callAI(
          `You are a senior tech recruiter and career coach for Brazilian devs targeting US remote roles. Produce STRICT JSON with:
- ats_score (0-100)
- readiness_summary (2-3 sentences)
- bullet_rewrites (array of {original, improved} up to 5 items)
- missing_keywords (array of strings, prioritize US job-post language)
- english_recommendations (array of strings)
- 30_day_plan (array of 5 concrete actions)
- risk_flags (array of short strings: red flags for ATS or recruiters)
- formatting_issues (array of up to 5 strings: layout/structure problems)
- role_fit_summary (2 sentences on fit for target role, or general US remote fit if none)
- category_scores (same 6 ids as partial: ats, keywords, formatting, impact, english, role_fit - refine scores with tips)`,
          fullPayload,
          { model: "google/gemma-4-31b-it:free", json: true },
        );
        if (!ai.ok) return json({ error: ai.error }, ai.status);
        try { full = JSON.parse(ai.text); } catch { full = { raw: ai.text }; }
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