"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import Link from "next/link";

import { RecruiterLayout } from "@/components/RecruiterLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Eye, MessageSquare, CreditCard } from "lucide-react";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [stats, setStats] = useState({ searches: 0, views: 0, interests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: p } = await supabase.from("recruiter_profiles").select("*").eq("user_id", user.id).single();
        if (p) {
          setProfile(p);
          const { data: s } = await supabase.from("recruiter_subscriptions").select("*").eq("recruiter_id", p.id).maybeSingle();
          setSub(s);
          
          const [{ count: searches }, { count: interests }] = await Promise.all([
             supabase.from("candidate_searches").select("*", { count: "exact" }).eq("recruiter_id", p.id),
             supabase.from("candidate_interests").select("*", { count: "exact" }).eq("recruiter_id", p.id),
          ]);
          setStats({ searches: searches || 0, views: 0, interests: interests || 0 });
        }
      } catch(e) {}
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <RecruiterLayout><div className="p-10">Loading...</div></RecruiterLayout>;

  return (
    <RecruiterLayout>
      <SEO
        title="Painel do Recrutador | RemoteDevs BR"
        description="Gerencie suas buscas e contatos com desenvolvedores brasileiros."
        canonicalPath="/recruiter/dashboard"
      />
      <div className="container py-10 space-y-8">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.company_name}</h1>
                <p className="text-muted-foreground mt-1">Here's an overview of your hiring activity.</p>
            </div>
            {sub?.plan === 'free' && (
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href="/recruiter/pricing"><CreditCard className="mr-2 h-4 w-4"/> Upgrade Plan</Link>
                </Button>
            )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center"><Search className="mr-2 h-4 w-4"/> Searches Performed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.searches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center"><Eye className="mr-2 h-4 w-4"/> Profiles Viewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.views}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center"><MessageSquare className="mr-2 h-4 w-4"/> Candidates Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.interests}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {sub?.candidate_contacts_remaining || 0} contacts remaining
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-400">Ready to find your next hire?</h2>
            <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80 mt-1 mb-4">Search through our database of pre-vetted remote Brazilian engineers.</p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/recruiter/search">Start Sourcing</Link>
            </Button>
        </div>
      </div>
    </RecruiterLayout>
  );
}
