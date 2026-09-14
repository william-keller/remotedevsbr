import { NextResponse } from "next/server";

const FUNCTION_URL =
  "https://rnkwnefuwwfvsnhrcnjb.supabase.co/functions/v1/scrape-onstrider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[scrape-onstrider-cron] SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "Service role key missing" }, { status: 500 });
  }

  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error(
        `[scrape-onstrider-cron] function returned ${res.status}:`,
        raw
      );
      return NextResponse.json({ error: "Scrape failed" }, { status: 502 });
    }

    return new NextResponse(raw, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[scrape-onstrider-cron] function call failed:", message);
    return NextResponse.json({ error: "Scrape failed" }, { status: 502 });
  }
}