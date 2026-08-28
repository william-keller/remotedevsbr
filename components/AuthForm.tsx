"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecurityBadges } from "@/components/SecurityBadges";
import { GoogleIcon, LinkedInIcon } from "@/components/SocialBrandIcons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthMode = "signin" | "signup";

const isSignupDisabled =
  process.env.NEXT_PUBLIC_SIGNUP_DISABLED === "true";

export function AuthForm({
  initialMode = "signin",
  onSuccess,
  showBackLink = true,
}: {
  initialMode?: AuthMode;
  onSuccess?: () => void;
  showBackLink?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(),
        password: z.string().min(6, t("auth.passwordMin")).max(72),
        full_name: z.string().trim().min(1).max(80).optional(),
      }),
    [t],
  );

  // If signup is disabled and initial mode was signup, default to signin
  const [tab, setTab] = useState<AuthMode>(
    isSignupDisabled && initialMode === "signup" ? "signin" : initialMode,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const submit = async (mode: AuthMode) => {
    if (mode === "signup" && isSignupDisabled) {
      toast.error(t("auth.signupDisabledBlocked"));
      return;
    }

    if (mode === "signup" && !acceptedTerms) {
      toast.error(t("auth.mustAcceptTerms"));
      return;
    }

    const parsed = schema.safeParse({
      email,
      password,
      full_name: mode === "signup" ? name : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("auth.genericError"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      onSuccess?.();
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e?.message ?? t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const socialSignIn = async (provider: "google" | "linkedin_oidc") => {
    if (tab === "signup" && isSignupDisabled) {
      toast.error(t("auth.signupDisabledBlocked"));
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-1">{t("auth.title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">RemoteDevsBR</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as AuthMode)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
          <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="space-y-3 mt-6">
          <div>
            <Label>{t("auth.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{t("auth.password")}</Label>
              <Link href="/reset-password" className="text-xs text-muted-foreground hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button
            className="w-full gradient-go text-primary-foreground"
            disabled={loading}
            onClick={() => submit("signin")}
          >
            {t("auth.signin")}
          </Button>
        </TabsContent>

        <TabsContent value="signup" className="mt-6">
          <div className="relative">
            {/* Actual signup form - blurred when disabled */}
            <div className={isSignupDisabled ? "pointer-events-none select-none blur-[2px] opacity-40 space-y-3" : "space-y-3"}>
              <div>
                <Label>{t("auth.fullName")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>{t("auth.email")}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>{t("auth.password")}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="flex items-start space-x-2 pt-2 pb-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="terms" className="text-xs text-muted-foreground leading-snug font-normal">
                  {t("auth.termsPrefix")}{" "}
                  <Link href="/terms" className="underline hover:text-foreground">
                    {t("auth.termsLink")}
                  </Link>{" "}
                  {t("auth.termsAnd")}{" "}
                  <Link href="/privacy-policy" className="underline hover:text-foreground">
                    {t("auth.privacyLink")}
                  </Link>
                  .
                </Label>
              </div>

              <Button
                className="w-full gradient-go text-primary-foreground"
                disabled={loading}
                onClick={() => submit("signup")}
              >
                {t("auth.signup")}
              </Button>
            </div>

            {/* Invite-only overlay */}
            {isSignupDisabled && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm border border-border/50">
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <div className="rounded-full bg-amber-500/15 p-3">
                    <Lock className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("auth.signupDisabledTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                    {t("auth.signupDisabledSub")}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t("auth.signupDisabledHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px bg-border flex-1" />
        {t("auth.or")}
        <div className="h-px bg-border flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="w-full gap-2 bg-background"
          onClick={() => socialSignIn("google")}
        >
          <GoogleIcon className="h-5 w-5 shrink-0" />
          <span>{t("auth.googleBrand")}</span>
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 bg-background"
          onClick={() => socialSignIn("linkedin_oidc")}
        >
          <LinkedInIcon className="h-5 w-5 shrink-0" />
          <span>{t("auth.linkedinBrand")}</span>
        </Button>
      </div>
      <SecurityBadges
        complianceLabel={t("security.lgpdCompliant")}
        encryptedLabel={t("security.encryptedData")}
      />

      {showBackLink && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          <Link href="/" className="hover:underline">
            ← {t("common.back")}
          </Link>
        </p>
      )}
    </>
  );
}


