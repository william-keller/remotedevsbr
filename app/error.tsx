"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  const homeHref =
    user && pathname?.startsWith("/recruiter") ? "/recruiter/dashboard" : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 text-center">
      <h1 className="text-2xl font-bold">{t("error.title")}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t("error.description")}</p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">{error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>{t("error.retry")}</Button>
        <Button asChild variant="outline">
          <Link href={homeHref}>{t("error.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
