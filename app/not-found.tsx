"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-md text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild className="mt-6">
        <Link href="/">{t("notFound.home")}</Link>
      </Button>
    </div>
  );
}
