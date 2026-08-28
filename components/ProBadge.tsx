"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function ProBadge({ pro }: { pro: boolean }) {
  if (!pro) return <span className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 bg-muted text-muted-foreground">Member</span>;
  return <span className="text-[10px] uppercase font-bold tracking-wider rounded px-1.5 py-0.5 gradient-gold text-gold-foreground">PRO</span>;
}

export function PaywallCard({ title }: { title?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-dashed border-gold/50 bg-gold/5 p-6 text-center">
      <Lock className="h-8 w-8 mx-auto text-gold mb-3" />
      <h3 className="font-semibold text-lg mb-1">{title || t("common.locked")}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t("pro.sub")}</p>
      <Button asChild className="gradient-gold text-gold-foreground"><Link href="/pro">{t("nav.upgrade")}</Link></Button>
    </div>
  );
}
