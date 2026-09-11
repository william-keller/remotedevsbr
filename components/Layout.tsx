"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sparkles, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useEngagement } from "@/hooks/useEngagement";
import { StreakCounter } from "@/components/StreakCounter";
import { CookieBanner } from "@/components/CookieBanner";
import { SecurityBadges } from "@/components/SecurityBadges";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { GitHubBadge } from "@/components/GitHubBadge";
import { DiscordBadge } from "@/components/DiscordBadge";

function FlagBR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} role="img" aria-label="Portugues">
      <rect width="36" height="24" rx="3" fill="#009739" />
      <polygon points="18,4 33,12 18,20 3,12" fill="#FEDD00" />
      <circle cx="18" cy="12" r="5" fill="#002776" />
    </svg>
  );
}

function FlagUS({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} role="img" aria-label="English">
      <rect width="36" height="24" rx="3" fill="#B22234" />
      {[0, 4, 8, 12, 16, 20].map((y) => (
        <rect key={y} y={y} width="36" height="2" fill="white" />
      ))}
      <rect width="14" height="12" rx="3" fill="#3C3B6E" />
    </svg>
  );
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  const { isEnabled } = useFeatureToggles();

  if (!isEnabled("is_english_lang_enabled")) return null;

  const next = locale === "pt" ? "en" : "pt";
  const Flag = locale === "pt" ? FlagBR : FlagUS;

  return (
    <button
      onClick={() => setLocale(next)}
      title={next === "en" ? "Switch to English" : "Mudar para Portugues"}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-background/60 transition hover:bg-muted ${compact ? "h-8 w-10" : "h-9 w-12"}`}
    >
      <Flag className="h-5 w-auto rounded-[2px] shadow-sm" />
    </button>
  );
}

function NavLink({ href, className, children, onClick }: { href: string; className: (props: { isActive: boolean }) => string; children: React.ReactNode, onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={className({ isActive })} onClick={onClick}>
      {children}
    </Link>
  );
}

const navItems = [
  { to: "/journey", key: "nav.journey", toggleKey: "navbar-show-journey" },
  { to: "/classes", key: "nav.classes", toggleKey: "navbar-show-classes" },
  { to: "/resources", key: "nav.resources", toggleKey: "navbar-show-resources" },
  { to: "/tools", key: "nav.tools", toggleKey: "navbar-show-tools" },
  { to: "/ebook", key: "nav.ebook" },
  { to: "/english", key: "nav.english", toggleKey: "navbar-show-english" },
  { to: "/mock-interview", key: "mockInterview.toolTitle", toggleKey: "navbar-show-mock-interview" },
  { to: "/jobs", key: "nav.jobs", toggleKey: "navbar-show-jobs" },
  { to: "/companies", key: "nav.companies", toggleKey: "navbar-show-companies" },
  { to: "/projects", key: "nav.projects", toggleKey: "navbar-show-projects" },
  { to: "/help", key: "nav.help", toggleKey: "navbar-show-help" },
];

export function Header() {
  const { t } = useI18n();
  const { user, profile, isAdmin, isPro, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { streak, longestStreak } = useEngagement();
  const [open, setOpen] = useState(false);
  const { isEnabled } = useFeatureToggles();

  const visibleNavItems = navItems.filter(n => !n.toggleKey || isEnabled(n.toggleKey));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-base sm:text-lg tracking-tight group">
          <img src="/logo-globe.svg" alt="RemoteDevsBR" width={32} height={32} className="h-8 w-8 object-contain transition-transform group-hover:scale-105" />
          <span>RemoteDevs<span className="text-primary">BR</span></span>
        </Link>

        <nav className="ml-6 hidden lg:flex items-center gap-1">
          {visibleNavItems.map(n => (
            <NavLink
              key={n.to} href={n.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }
            >{t(n.key)}</NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GitHubBadge />
          <DiscordBadge />
          <LangToggle compact />
          {user ? (
            <>
              <div className="hidden md:block">
                <StreakCounter streak={streak} longestStreak={longestStreak} />
              </div>
              <NotificationsBell />
              {!isPro && (
                <Button asChild size="sm" className="gradient-gold text-gold-foreground hover:opacity-90 hidden sm:inline-flex">
                  <Link href="/pro"><Sparkles className="h-4 w-4 mr-1" />{t("nav.upgrade")}</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-border">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback>{(profile?.full_name ?? "U").slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium truncate">{profile?.full_name ?? user.email}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {isPro ? <span className="text-gold font-semibold">PRO</span> : <span>{t("common.free")}</span>}
                      {isAdmin && <><span>•</span><ShieldCheck className="h-3 w-3" /> admin</>}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/dashboard">{t("nav.dashboard")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/profile">{t("nav.profile")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/achievements">{t("nav.achievements")}</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/applications">{t("dashboard.applications")}</Link></DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem asChild><Link href="/admin">{t("nav.admin")}</Link></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>{t("nav.signout")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              className="gradient-go text-primary-foreground hover:opacity-90"
              onClick={() => openAuthModal("signin")}
            >
              {t("nav.signin")}
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-1 mt-8">
                {visibleNavItems.map(n => (
                  <NavLink
                    key={n.to} href={n.to} onClick={() => setOpen(false)}
                    className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
                  >{t(n.key)}</NavLink>
                ))}
              </nav>
              <div className="mt-6 px-3">
                <LangToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  const { isEnabled } = useFeatureToggles();

  const coreLinks = [
    { href: "/", key: "nav.home" },
    { href: "/journey", key: "nav.journey", toggleKey: "navbar-show-journey" },
    { href: "/classes", key: "nav.classes", toggleKey: "navbar-show-classes" },
    { href: "/resources", key: "nav.resources", toggleKey: "navbar-show-resources" },
    { href: "/tools", key: "nav.tools", toggleKey: "navbar-show-tools" },
    { href: "/ebook", key: "nav.ebook" },
    { href: "/english", key: "nav.english", toggleKey: "navbar-show-english" },
    { href: "/mock-interview", key: "mockInterview.toolTitle", toggleKey: "navbar-show-mock-interview" },
    { href: "/jobs", key: "nav.jobs", toggleKey: "navbar-show-jobs" },
    { href: "/companies", key: "nav.companies", toggleKey: "navbar-show-companies" },
    { href: "/projects", key: "nav.projects", toggleKey: "navbar-show-projects" },
    { href: "/help", key: "nav.help", toggleKey: "navbar-show-help" },
    { href: "/pro", key: "nav.upgrade" },
    { href: "/analytics", label: "Open / metrics" },
  ];

  const visibleCoreLinks = coreLinks.filter(link => !link.toggleKey || isEnabled(link.toggleKey));

  const secondaryLinks = [
    { href: "/auth", key: "footer.signinSignup" },
    { href: "/privacy-policy", key: "privacy.title" },
    { href: "/terms", key: "terms.title" },
  ];
  const socialLinks = [
    { href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM, key: "social.instagram" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN, key: "social.linkedin" },
    { href: process.env.NEXT_PUBLIC_SOCIAL_WHATSAPP, key: "social.whatsapp" },
  ].filter((link): link is { href: string; key: string } => Boolean(link.href));

  return (
    <footer className="mt-24 border-t border-border bg-muted/20">
      <div className="container py-8 sm:py-10">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <p className="text-base font-semibold text-foreground">RemoteDevsBR</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <div className="pt-1">
              <LangToggle />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("footer.siteNavigation")}
            </p>
            <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {visibleCoreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {"label" in link ? link.label : t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("footer.accountAndLegal")}
            </p>
            <nav className="grid grid-cols-1 gap-1">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          {socialLinks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {t("footer.followUs")}
              </p>
              <nav className="grid grid-cols-1 gap-1">
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {t(link.key)}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>

        <SecurityBadges
          className="mt-6 pt-4 sm:mt-7"
          complianceLabel={t("security.lgpdCompliant")}
          encryptedLabel={t("security.encryptedData")}
        />

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RemoteDevsBR. {t("footer.rightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
