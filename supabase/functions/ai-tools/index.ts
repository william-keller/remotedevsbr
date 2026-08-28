// AI tools edge function - resume builder + LinkedIn tuner via Lovable AI Gateway.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { kind, payload } = await req.json();
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

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached, try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ text }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
