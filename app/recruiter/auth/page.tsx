"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Building2, Briefcase } from "lucide-react";
import { RecruiterLayout } from "@/components/RecruiterLayout";
import { SEO } from "@/components/SEO";

export default function RecruiterAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Ensure they have a recruiter profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Check if profile exists, if not they probably used the candidate login
            const { data: rec } = await supabase.from("recruiter_profiles").select("id").eq("user_id", session.user.id).maybeSingle();
            if (!rec) {
                // Auto create bare minimum for now
                await supabase.from("recruiter_profiles").insert({ user_id: session.user.id, company_name: "My Company" });
            }
        }
        
        router.push("/recruiter/dashboard");
      } else {
        if (!acceptedTerms) {
          toast.error("Você precisa aceitar os Termos e Políticas.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { role: 'recruiter' }
            }
        });
        if (error) throw error;
        
        if (data.user) {
            // Let the DB trigger handle auth.users -> profiles
            // But we must also insert into recruiter_profiles
            await supabase.from("recruiter_profiles").insert({
                user_id: data.user.id,
                company_name: companyName
            });
            router.push("/recruiter/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RecruiterLayout>
      <SEO 
        title="Portal do Recrutador - Login | RemoteDevs BR" 
        description="Acesse o portal de recrutadores do RemoteDevs BR para encontrar desenvolvedores brasileiros qualificados."
        canonicalPath="/recruiter/auth"
      />
      <div className="container flex items-center justify-center min-h-[calc(100vh-64px)] py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Start hiring top Brazilian talent"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Access thousands of remote-ready engineers.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    placeholder="Acme Corp"
                    className="pl-9"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {!isLogin && (
              <div className="flex items-start space-x-2 pt-2 pb-2">
                <input 
                  type="checkbox" 
                  id="terms-recruiter" 
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="terms-recruiter" className="text-xs text-muted-foreground leading-snug font-normal">
                  Eu concordo com os <Link href="/terms" className="underline hover:text-foreground">Termos de Uso</Link> e a <Link href="/privacy-policy" className="underline hover:text-foreground">Política de Privacidade</Link>.
                </Label>
              </div>
            )}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Recruiter Account"}
            </Button>

            <div className="text-center text-sm mt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-600 hover:underline font-medium"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
          
          <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground pt-4">
              <div className="p-4 border rounded-lg bg-emerald-50/50">
                  <Users className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                  <p>10,000+ Pre-vetted candidates</p>
              </div>
              <div className="p-4 border rounded-lg bg-emerald-50/50">
                  <Briefcase className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                  <p>Hire 3x faster remotely</p>
              </div>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
}
