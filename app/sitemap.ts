import fs from "node:fs/promises";
import path from "node:path";
import type { MetadataRoute } from "next";
import { COVER_LETTER_EXAMPLES } from "@/lib/cover-letter-content";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.example").replace(/\/+$/, "");
const APP_DIR = path.join(process.cwd(), "app");

const PRIORITY_OVERRIDES: Record<string, number> = {
  "/analyze": 0.95,
  "/tools/cover-letter": 0.92,
  "/tools/cover-letter/templates": 0.85,
  "/tools/cover-letter/examples": 0.85,
  "/jobs": 0.9,
};

const EXCLUDED_PATHS = new Set([
  "/[...not-found]",
  "/admin",
  "/admin/candidates",
  "/dashboard",
  "/applications",
  "/profile",
  "/onboarding",
  "/english-check",
  "/pro",
  "/tools/resume",
  "/tools/linkedin",
  "/recruiter/dashboard",
  "/recruiter/search",
  "/recruiter/candidate",
]);

function normalizeRoute(route: string): string {
  if (!route || route === "/") {
    return "";
  }
  return route.replace(/\/+/g, "/").replace(/\/$/, "");
}

function isRoutePublic(route: string): boolean {
  if (!route) {
    return true;
  }
  if (EXCLUDED_PATHS.has(route)) {
    return false;
  }
  const segments = route.split("/").filter(Boolean);
  return !segments.some(
    (segment) =>
      segment.startsWith("[") || // dynamic/catch-all segments
      segment.startsWith("_") || // internal/private folders
      (segment.startsWith("(") && segment.endsWith(")")), // route groups
  );
}

async function collectPageRoutes(dir: string, baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const routes: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await collectPageRoutes(absolutePath, baseDir)));
      continue;
    }

    if (entry.name !== "page.tsx" && entry.name !== "page.ts") {
      continue;
    }

    const relativeDir = path.relative(baseDir, path.dirname(absolutePath));
    const route = normalizeRoute(`/${relativeDir.replace(/\\/g, "/")}`);

    if (isRoutePublic(route)) {
      routes.push(route);
    }
  }

  return routes;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const discoveredRoutes = await collectPageRoutes(APP_DIR, APP_DIR);
  
  // Add dynamic examples manually
  COVER_LETTER_EXAMPLES.forEach((ex) => {
    discoveredRoutes.push(`/tools/cover-letter/examples/${ex.slug}`);
  });

  const uniqueRoutes = Array.from(new Set(discoveredRoutes)).sort((a, b) =>
    a.localeCompare(b),
  );

  const staticRoutes: MetadataRoute.Sitemap = uniqueRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/analyze" ? "daily" : "weekly",
    priority: PRIORITY_OVERRIDES[route] ?? (route === "" ? 1 : 0.7),
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return staticRoutes;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/jobs?select=slug,posted_at&is_active=eq.true&status=eq.published`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 900 },
      },
    );
    const jobs = (await response.json()) as { slug: string; posted_at: string }[];

    const jobRoutes: MetadataRoute.Sitemap = jobs
      .filter((job) => !!job.slug)
      .map((job) => ({
        url: `${BASE_URL}/jobs/${job.slug}`,
        lastModified: job.posted_at ? new Date(job.posted_at) : now,
        changeFrequency: "daily",
        priority: 0.8,
      }));

    return [...staticRoutes, ...jobRoutes];
  } catch {
    return staticRoutes;
  }
}
