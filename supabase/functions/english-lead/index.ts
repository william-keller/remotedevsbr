// English program lead capture edge function.
// Accepts anonymous interest submissions from the /english landing page,
// rate-limits by IP, inserts into english_program_leads (service role), and
// alerts the team on Telegram. RLS blocks clients from reading rows back.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceRateLimit } from "../_shared/rate_limit.ts";
import { notifyEnglishLead } from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTEREST_TYPES = ["career", "start", "global", "squad", "team"];
const LEVELS = ["beginner", "intermediate", "upper_intermediate", "advanced", "unsure"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const rate = await enforceRateLimit(req, "english_lead", 20, 60_000);
  if (!rate.allowed) return json({ error: rate.error }, rate.status);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const interestType = String(body.interest_type ?? "").trim();
  const fullName = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const whatsapp = String(body.whatsapp ?? "").trim() || null;
  const currentLevel = String(body.current_level ?? "").trim();
  const schedulePreference = String(body.schedule_preference ?? "").trim() || null;

  if (!INTEREST_TYPES.includes(interestType)) {
    return json({ error: "Invalid interest_type." }, 400);
  }
  if (fullName.length < 2) {
    return json({ error: "full_name is required." }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: "email is invalid." }, 400);
  }
  if (!LEVELS.includes(currentLevel)) {
    return json({ error: "Invalid current_level." }, 400);
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error } = await adminClient.from("english_program_leads").insert({
    interest_type: interestType,
    full_name: fullName,
    email,
    whatsapp,
    current_level: currentLevel,
    schedule_preference: schedulePreference,
  });

  if (error) {
    console.error("[english-lead] insert failed:", error.message);
    return json({ error: "Could not register the lead." }, 500);
  }

  await notifyEnglishLead({
    fullName,
    email,
    whatsapp: whatsapp ?? undefined,
    interestType,
    currentLevel,
    schedulePreference: schedulePreference ?? undefined,
  });

  return json({ success: true });
});