"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: "pt" | "en";
  subscription_status: "free" | "pro" | "canceled";
  english_level: string | null;
  stack: string[] | null;
  goals: string | null;
  bio: string | null;
  onboarded_at: string | null;
  current_job_title?: string | null;
  years_experience?: number | null;
  salary_expectation_usd?: number | null;
  remote_goals?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  visible_to_recruiters?: boolean | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isPro: boolean;
  needsOnboarding: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, locale, subscription_status, english_level, stack, goals, bio, onboarded_at, current_job_title, years_experience, salary_expectation_usd, remote_goals, github_url, linkedin_url, visible_to_recruiters")
      .eq("id", uid)
      .maybeSingle();
    setProfile((prof as Profile) ?? null);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => { loadProfile(sess.user.id); }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => { if (user) await loadProfile(user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, isAdmin,
        isPro: profile?.subscription_status === "pro",
        needsOnboarding: !!user && !!profile && !profile.onboarded_at,
        loading, refreshProfile, signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
