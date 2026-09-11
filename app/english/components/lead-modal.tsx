"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ENGLISH_BRAND, type EnglishInterest, type EnglishLevel } from "@/lib/english/config";
import { trackEnglishFormStart, trackEnglishFormSubmit } from "@/lib/track";

const PLAN_LABEL_KEY: Record<EnglishInterest, string> = {
  career: "english.form.plan.career",
  start: "english.form.plan.start",
  global: "english.form.plan.global",
  squad: "english.form.plan.squad",
  team: "english.form.plan.team",
};

const TITLE_KEYS: Record<EnglishInterest, string> = {
  career: "english.form.title",
  start: "english.form.title",
  global: "english.form.title",
  squad: "english.form.title.squad",
  team: "english.form.title.team",
};

const LEVEL_KEYS: { value: EnglishLevel; key: string }[] = [
  { value: "beginner", key: "english.form.level.beginner" },
  { value: "intermediate", key: "english.form.level.intermediate" },
  { value: "upper_intermediate", key: "english.form.level.upper_intermediate" },
  { value: "advanced", key: "english.form.level.advanced" },
  { value: "unsure", key: "english.form.level.unsure" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadModal({
  open,
  onOpenChange,
  interest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interest: EnglishInterest;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("unsure");
  const [schedule, setSchedule] = useState("any");
  const [errors, setErrors] = useState<{ name?: boolean; email?: boolean }>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      trackEnglishFormStart(interest);
    }
  }, [open, interest]);

  const whatsappUrl = process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP;

  const validate = (): boolean => {
    const next = {
      name: fullName.trim().length < 2,
      email: !EMAIL_RE.test(email.trim()),
    };
    setErrors(next);
    return !next.name && !next.email;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    const body = {
      interest_type: interest,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim() || null,
      current_level: level,
      schedule_preference:
        schedule === "any" ? null : schedule === "a" ? "Segunda + Quarta" : "Terca + Quinta",
    };
    try {
      const { error } = await supabase.functions.invoke("english-lead", { body });
      if (error) throw error;
      trackEnglishFormSubmit(interest);
      setDone(true);
    } catch {
      toast.error(t("english.form.error"));
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t(TITLE_KEYS[interest])}</DialogTitle>
          <p className="mt-1 inline-flex w-fit items-center rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-xs font-semibold text-gold">
            {t(PLAN_LABEL_KEY[interest])}
          </p>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="mt-4 leading-relaxed text-muted-foreground">{t("english.form.success")}</p>
            {whatsappUrl && (
              <Button asChild className="mt-6 w-full">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  {t("english.form.waCta")}
                </a>
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="lead-name" className="text-sm">
                {t("english.form.name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lead-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                aria-invalid={errors.name}
                autoComplete="name"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{t("english.form.required")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-email" className="text-sm">
                {t("english.form.email")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {email.trim() ? t("english.form.invalidEmail") : t("english.form.required")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-whatsapp" className="text-sm">
                {t("english.form.whatsapp")}
              </Label>
              <Input
                id="lead-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={t("english.form.whatsappHint")}
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-level" className="text-sm">
                {t("english.form.level")}
              </Label>
              <select
                id="lead-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as EnglishLevel)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {LEVEL_KEYS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {t(l.key)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-schedule" className="text-sm">
                {t("english.form.schedule")}
              </Label>
              <select
                id="lead-schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="any">{t("english.form.schedAny")}</option>
                <option value="a">{t("english.form.schedA")}</option>
                <option value="b">{t("english.form.schedB")}</option>
              </select>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="w-full gradient-gold text-gold-foreground"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? t("english.form.sending") : t("english.form.submit")}
            </Button>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {ENGLISH_BRAND.programName} ·{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
                {t("english.form.privacy")}
              </Link>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}