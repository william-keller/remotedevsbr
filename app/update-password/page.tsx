"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  password: z.string().min(6, "min 6").max(72),
});

export default function UpdatePassword() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // We could add extra checks here, but typically Supabase handles 
    // the password recovery token parsing automatically from the hash on load
    // and sets the user session.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session is found initially, listen for auth changes
        // This is needed because sometimes the session from the URL hash
        // takes a brief moment to be established by the client library
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            // Valid recovery session
          }
        });
        
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, []);

  const submit = async () => {
    const parsed = schema.safeParse({ password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      toast.success(t("auth.passwordUpdated"));
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={`${t("auth.updatePassword")} | RemoteDevs BR`} 
        description="Atualize sua senha."
        canonicalPath="/update-password"
      />
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold mb-1">{t("auth.updatePassword")}</h1>
          <p className="text-sm text-muted-foreground mb-6">RemoteDevsBR</p>
          
          <div className="space-y-4">
            <div>
              <Label>{t("auth.newPassword")}</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <Button 
              className="w-full gradient-go text-primary-foreground" 
              disabled={loading} 
              onClick={submit}
            >
              {t("auth.updatePassword")}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
