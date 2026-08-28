// AI tools edge function - resume builder + LinkedIn tuner.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { callAI } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { kind, payload } = body;
    if (!["resume", "linkedin"].includes(kind)) {
      return new Response(JSON.stringify({ error: "Invalid kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let system = "";
    let user = "";

    if (kind === "resume") {
      system = `You are an expert tech recruiter and resume writer for Brazilian developers applying to US remote roles. Produce a clean, ATS-optimized resume in plain text (no markdown headers, simple sections). Use strong action verbs, quantify impact, and match the target role's keywords. Output should be in English regardless of input language. Keep to one page worth of content.`;
      user = `Target role: ${payload.target_role || "Software Engineer"}
Summary: ${payload.summary || ""}
Experience (raw):
${payload.experience || ""}
Skills: ${payload.skills || ""}
Education: ${payload.education || ""}

Write the full resume now.`;
    } else {
      system = `You are a LinkedIn coach for Brazilian developers targeting US remote roles. Given a current headline and about, return: (1) 3 improved headline options, (2) a rewritten About section in English, (3) a 5-item checklist of what to fix on the profile. Be concise and specific.`;
      user = `Target role: ${payload.target_role || ""}
Current headline: ${payload.headline || ""}
Current about:
${payload.about || ""}`;
    }

    const ai = await callAI(system, user, { models: ["google/gemma-4-31b-it:free", "minimax/minimax-m3:free"] });
    if (!ai.ok) {
      return new Response(JSON.stringify({ error: ai.error }), { status: ai.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ text: ai.text }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
