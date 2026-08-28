"use client";

import { useState } from "react";
import Link from "next/link";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { AppLayout } from "@/components/Layout";
import { toast } from "sonner";
import { z } from "zod";
import { SEO } from "@/components/SEO";

const schema = z.object({
  email: z.string().email(),
});

export default function ResetPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success(t("auth.resetLinkSent"));
    } catch (e: any) {
      toast.error(e.message ?? "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={`${t("auth.resetPassword")} | RemoteDevs BR`} 
        description="Recupere o acesso à sua conta."
        canonicalPath="/reset-password"
      />
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold mb-1">{t("auth.resetPassword")}</h1>
          <p className="text-sm text-muted-foreground mb-6">RemoteDevsBR</p>
          
          {!sent ? (
            <div className="space-y-4">
              <div>
                <Label>{t("auth.email")}</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="seu@email.com"
                />
              </div>
              <Button 
                className="w-full gradient-go text-primary-foreground" 
                disabled={loading} 
                onClick={submit}
              >
                {t("auth.sendResetLink")}
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-md text-sm text-center">
              {t("auth.resetLinkSent")}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            <Link href="/auth" className="hover:underline">← {t("common.back")}</Link>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
