// Public AI cover letter generator - Brazilian devs targeting US remote roles.
// Unauthenticated by design (top-of-funnel tool). Protected server-side via IP
// rate limiting, JWT-based identity binding when a session is present, and validation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { callAI as callOpenAIRoute, FREE_MODELS } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BANNED_PHRASES = [
  "passionate about",
  "results-driven",
  "synergy",
  "leverage",
  "rockstar",
  "ninja",
  "guru",
  "think outside the box",
  "hit the ground running",
  "go-getter",
  "team player",
  "detail-oriented",
  "self-starter",
  "dynamic",
  "proven track record of success",
  "excited to apply",
  "perfect fit",
  "unique opportunity",
];

function findCliches(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
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

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function runAI(system: string, user: string) {
  const ai = await callOpenAIRoute(system, user, { models: FREE_MODELS, json: true });
  if (!ai.ok) {
    return { error: ai.error, status: ai.status };
  }
  const raw = ai.text ?? "{}";
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { data: { letter: raw, matched_keywords: [], missing_keywords: [], keyword_coverage: 0 } };
  }
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

    if (action === "generate") {
      const rl = await enforceRateLimit(req, "cover-generate", 10, 60 * 60 * 1000, supabase);
      if (!rl.allowed) return json({ error: rl.error }, rl.status);

      const {
        target_role,
        job_description,
        resume_text,
        tone = "confident",
        language = "en",
        template_id,
        user_id,
      } = body;

      const authedUserId = await getAuthenticatedUserId(req);
      if (user_id && authedUserId && user_id !== authedUserId) return json({ error: "Forbidden" }, 403);

      const role = (target_role ?? "").trim() || "Software Engineer";
      const jd = (job_description ?? "").trim();
      const resume = (resume_text ?? "").trim();

      if (jd.length < 40) {
        return json({ error: "Job description too short (min ~40 chars)." }, 400);
      }
      if (resume.length < 80) {
        return json({ error: "Resume/experience text too short (min ~80 chars)." }, 400);
      }

      const langInstruction =
        language === "pt"
          ? "Write the cover letter in Brazilian Portuguese (professional tone for international companies)."
          : "Write the cover letter in US English for US remote hiring managers.";

      const toneMap: Record<string, string> = {
        formal: "formal and respectful",
        confident: "confident and direct",
        concise: "very concise - short sentences, no fluff",
      };
      const toneHint = toneMap[tone] ?? toneMap.confident;

      const system = `You are an expert US tech recruiter helping Brazilian developers write cover letters for US remote roles.
${langInstruction}
Tone: ${toneHint}.
Structure: 4 paragraphs - (1) role + intent + one hook, (2) quantified achievement tied to JD, (3) company/JD alignment, (4) close with availability/timezone overlap for US teams.
Length: 250-400 words.
Rules: NO clichés (${BANNED_PHRASES.slice(0, 12).join(", ")}). Use specific metrics. Weave job-description keywords naturally.
Return STRICT JSON:
{
  "letter": "full cover letter plain text with paragraph breaks using \\n\\n",
  "matched_keywords": ["up to 12 strings found in letter from JD"],
  "missing_keywords": ["up to 8 important JD terms NOT used yet"],
  "keyword_coverage": 0-100 integer
}`;

      const user = `Target role: ${role}
Template style: ${template_id || "classic"}
--- JOB DESCRIPTION ---
${jd.slice(0, 8000)}
--- CANDIDATE RESUME / EXPERIENCE ---
${resume.slice(0, 12000)}`;

      const ai = await runAI(system, user);
      if (ai.error) {
        return json({ error: ai.error }, ai.status ?? 500);
      }

      const letter = String(ai.data?.letter ?? "").trim();
      const matched = Array.isArray(ai.data?.matched_keywords) ? ai.data.matched_keywords : [];
      const missing = Array.isArray(ai.data?.missing_keywords) ? ai.data.missing_keywords : [];
      const coverage = Number(ai.data?.keyword_coverage) || 0;
      const wordCount = letter.split(/\s+/).filter(Boolean).length;
      const cliches = findCliches(letter);

      const keyword_meta = { matched_keywords: matched, missing_keywords: missing, keyword_coverage: coverage, cliches_found: cliches, word_count: wordCount };

      const { data: row, error: insErr } = await supabase
        .from("cover_letters")
        .insert({
          user_id: authedUserId,
          target_role: role,
          job_description: jd.slice(0, 8000),
          resume_snippet: resume.slice(0, 4000),
          tone,
          language,
          template_id: template_id ?? null,
          generated_text: letter,
          keyword_meta,
        })
        .select("id")
        .single();

      if (insErr) console.error("cover_letters insert", insErr);

      return json(
        {
          id: row?.id ?? null,
          letter,
          matched_keywords: matched,
          missing_keywords: missing,
          keyword_coverage: coverage,
          word_count: wordCount,
          cliches_found: cliches,
        },
        200
      );
    }

    if (action === "csat") {
      const { id, rating, comment } = body;
      if (!id || !rating) {
        return json({ error: "Missing id or rating" }, 400);
      }
      await supabase
        .from("cover_letters")
        .update({ csat_rating: rating, csat_comment: comment ?? null })
        .eq("id", id);
      return json({ ok: true }, 200);
    }

    if (action === "unlock") {
      const rl = await enforceRateLimit(req, "cover-unlock", 20, 60 * 60 * 1000, supabase);
      if (!rl.allowed) return json({ error: rl.error }, rl.status);

      const { id, email } = body;
      if (!id || !email) {
        return json({ error: "Missing id or email" }, 400);
      }
      if (typeof email !== "string" || !EMAIL_RE.test(email)) return json({ error: "Invalid email" }, 400);
      await supabase
        .from("cover_letters")
        .update({ email })
        .eq("id", id);
      return json({ ok: true }, 200);
    }

    if (action === "analyze-letter") {
      const rl = await enforceRateLimit(req, "cover-analyze-letter", 20, 60 * 60 * 1000, supabase);
      if (!rl.allowed) return json({ error: rl.error }, rl.status);

      const { job_description, target_role, cover_letter, language = "en" } = body;
      const jd = (job_description ?? "").trim();
      const letterText = (cover_letter ?? "").trim();

      if (!letterText) {
        return json({ error: "Cover letter text is empty." }, 400);
      }

      const langInstruction =
        language === "pt"
          ? "Provide suggestions in Brazilian Portuguese."
          : "Provide suggestions in US English.";

      const system = `You are a tech recruiter reviewing a candidate's cover letter for a US remote role.
Evaluate the cover letter against the target role and job description.
Identify keywords matched, missing keywords, cliché phrases used, word count, and provide exactly 3 actionable suggestions for improvement.
${langInstruction}
Return STRICT JSON format:
{
  "keyword_coverage": 0-100,
  "matched_keywords": ["list of up to 12 keywords used"],
  "missing_keywords": ["list of up to 8 important missing keywords from JD"],
  "cliches_found": ["any clichés found"],
  "word_count": number,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const userPrompt = `Target role: ${target_role || "Software Engineer"}
--- JOB DESCRIPTION ---
${jd.slice(0, 8000)}
--- COVER LETTER TO REVIEW ---
${letterText.slice(0, 6000)}`;

      const ai = await runAI(system, userPrompt);
      if (ai.error) {
        return json({ error: ai.error }, ai.status ?? 500);
      }

      const cliches = findCliches(letterText);
      const matched = Array.isArray(ai.data?.matched_keywords) ? ai.data.matched_keywords : [];
      const missing = Array.isArray(ai.data?.missing_keywords) ? ai.data.missing_keywords : [];
      const coverage = Number(ai.data?.keyword_coverage) || 0;
      const wordCount = letterText.split(/\s+/).filter(Boolean).length;
      const suggestions = Array.isArray(ai.data?.suggestions) ? ai.data.suggestions : [];

      return json(
        {
          matched_keywords: matched,
          missing_keywords: missing,
          keyword_coverage: coverage,
          word_count: wordCount,
          cliches_found: cliches,
          suggestions,
        },
        200
      );
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("cover-letter error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});