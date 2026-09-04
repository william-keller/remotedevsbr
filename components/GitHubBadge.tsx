"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const REPO = "william-keller/remotedevsbr";
const REPO_URL = `https://github.com/${REPO}`;
const STORAGE_KEY = "rdbr_github_stars";
const CACHE_TTL_MS = 5 * 60 * 1000; // refetch after 5 minutes

let memoryCache: { value: number; expiresAt: number } | null = null;

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.value !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      Date.now() >= parsed.expiresAt
    ) {
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function store(value: number) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // ignore storage failures (e.g. private mode)
  }
}

export function GitHubBadge() {
  const { t } = useI18n();
  const [stars, setStars] = useState<number | null>(() =>
    memoryCache && Date.now() < memoryCache.expiresAt ? memoryCache.value : readStored()
  );

  useEffect(() => {
    if (stars !== null) return;
    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (cancelled) return;
        const count = data?.stargazers_count ?? null;
        if (count === null || typeof count !== "number") return;
        memoryCache = { value: count, expiresAt: Date.now() + CACHE_TTL_MS };
        store(count);
        setStars(count);
      })
      .catch(() => {
        // Network or rate-limit failure: leave the count hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [stars]);

  useEffect(() => {
    if (stars === null) return;
    const timer = setTimeout(() => setStars(null), CACHE_TTL_MS);
    return () => clearTimeout(timer);
  }, [stars]);

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={t("social.githubAria")}
      className="hidden sm:inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
      </svg>
      {stars !== null && <span className="min-w-8 text-right tabular-nums">{stars}</span>}
    </a>
  );
}
