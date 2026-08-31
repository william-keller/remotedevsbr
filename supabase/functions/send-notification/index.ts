// Notification dispatcher - handles in-app notifications and admin Telegram alerts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {
  notifyProjectSubmitted,
  notifyMockInterviewBooked,
  notifyJobSubmitted,
} from "../_shared/telegram.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Authenticate via the caller's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) return json({ error: "Unauthorized" }, 401);

    const { type, user_id, payload = {} } = await req.json();

    // 2. Bind identity: never allow targeting another user
    if (user_id && user_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }
    const userId = user.id;
    const userEmail = user.email ?? undefined;

    // 3. Rate limit per authenticated user (notifications table has an index on user_id, created_at)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countError } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if (countError) throw countError;
    if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      return json({ error: "Too many notification requests, try again in a moment." }, 429);
    }

    // 4. Whitelisted event types with payload validation
    switch (type) {
      case "project_submitted": {
        if (typeof payload.title !== "string" || !payload.title.trim()) {
          return json({ error: "project_submitted requires a non-empty payload.title" }, 400);
        }

        await admin.from("notifications").insert({ user_id: userId, type, payload });

        await notifyProjectSubmitted({
          title: payload.title,
          tagline: typeof payload.tagline === "string" ? payload.tagline : undefined,
          url: typeof payload.url === "string" ? payload.url : undefined,
          stack: Array.isArray(payload.stack)
            ? payload.stack.filter((s: unknown): s is string => typeof s === "string")
            : undefined,
          userEmail,
          userId,
        });
        break;
      }

      case "job_submitted": {
        if (
          typeof payload.role !== "string" || !payload.role.trim() ||
          typeof payload.companyName !== "string" || !payload.companyName.trim()
        ) {
          return json({ error: "job_submitted requires payload.role and payload.companyName" }, 400);
        }

        await admin.from("notifications").insert({ user_id: userId, type, payload });

        await notifyJobSubmitted({
          role: payload.role,
          companyName: payload.companyName,
          location: typeof payload.location === "string" ? payload.location : undefined,
          workFormat: typeof payload.workFormat === "string" ? payload.workFormat : undefined,
          seniority: typeof payload.seniority === "string" ? payload.seniority : undefined,
          jobType: typeof payload.jobType === "string" ? payload.jobType : undefined,
          salary: typeof payload.salary === "string" ? payload.salary : undefined,
          stack: Array.isArray(payload.stack)
            ? payload.stack.filter((s: unknown): s is string => typeof s === "string")
            : undefined,
          applyUrl: typeof payload.applyUrl === "string" ? payload.applyUrl : undefined,
          userEmail,
          userId,
        });
        break;
      }

      case "mock_interview_scheduled": {
        if (typeof payload.date !== "string" || !payload.date) {
          return json({ error: "mock_interview_scheduled requires payload.date" }, 400);
        }

        await admin.from("notifications").insert({ user_id: userId, type, payload });

        await notifyMockInterviewBooked({
          date: payload.date,
          startTime: typeof payload.start_time === "string" ? payload.start_time : "00:00",
          endTime: typeof payload.end_time === "string" ? payload.end_time : "00:00",
          interviewerName: typeof payload.interviewer_name === "string" ? payload.interviewer_name : undefined,
          userEmail,
          userId,
        });
        break;
      }

      default:
        return json({ error: "Unsupported notification type" }, 400);
    }

    return json({ ok: true }, 200);
  } catch (e: any) {
    console.error("[send-notification] error:", e);
    return json({ error: e.message }, 500);
  }
});