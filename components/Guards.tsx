"use client";

import { usePathname, redirect } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  const pathname = usePathname();
  
  if (loading) return <div className="container py-20 text-center text-muted-foreground">…</div>;
  if (!user) {
    redirect("/auth");
  }
  if (needsOnboarding && pathname !== "/onboarding") {
    redirect("/onboarding");
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return <div className="container py-20 text-center text-muted-foreground">…</div>;
  if (!user) {
    redirect("/auth");
  }
  if (!isAdmin) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
