"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/tools/cover-letter", labelKey: "coverLetter.nav.generator", exact: true },
  { href: "/tools/cover-letter/templates", labelKey: "coverLetter.nav.templates", exact: false },
  { href: "/tools/cover-letter/examples", labelKey: "coverLetter.nav.examples", exact: false },
] as const;

export function CoverLetterSubnav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      className="flex flex-wrap items-center gap-2 mb-8 p-1 rounded-lg border bg-muted/40 w-fit"
      aria-label={t("coverLetter.nav.aria")}
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
            isActive(link.href, link.exact)
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {t(link.labelKey)}
        </Link>
      ))}
      <span className="text-muted-foreground/50 px-1 hidden sm:inline">|</span>
      <Link
        href="/analyze"
        className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {t("coverLetter.nav.atsCheck")}
      </Link>
    </nav>
  );
}
