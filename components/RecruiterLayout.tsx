"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Search, Building2, CreditCard, LogOut, Briefcase, Loader2 } from "lucide-react";
import { Footer } from "@/components/Layout";

const navItems = [
  { to: "/recruiter/dashboard", label: "recruiter.nav.dashboard", icon: <Building2 className="w-4 h-4" /> },
  { to: "/recruiter/search", label: "recruiter.nav.search", icon: <Search className="w-4 h-4" /> },
  { to: "/recruiter/pricing", label: "recruiter.nav.subscription", icon: <CreditCard className="w-4 h-4" /> },
];

export function RecruiterHeader() {
  const { user, profile, signOut } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-slate-900 text-slate-50">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/recruiter/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white shadow-glow">
            <Users className="h-4 w-4" />
          </span>
          <span>RemoteDevs<span className="text-emerald-400">BR</span> <span className="font-normal text-sm text-slate-400 ml-2">{t("recruiter.forRecruiters")}</span></span>
        </Link>

        <nav className="ml-8 hidden lg:flex items-center gap-6">
          {navItems.map(n => {
            const isActive = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to} href={n.to}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"}`}
              >
                {n.icon}
                {t(n.label)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
             <Link href="/">{t("recruiter.switchToDev")}</Link>
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-slate-700">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-slate-800 text-slate-300">{(profile?.full_name ?? "R").slice(0,1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium truncate">{profile?.full_name ?? user.email}</div>
                  <div className="text-xs text-muted-foreground">{t("recruiter.accountLabel")}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-red-500 focus:text-red-500 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/recruiter/auth">{t("recruiter.signinAs")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== "/recruiter/auth") {
      router.push("/recruiter/auth");
    }
  }, [user, loading, pathname, router]);

  if (loading && pathname !== "/recruiter/auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <RecruiterHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
