"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function resolveNotification(n: any, t: (k: string) => string): { title: string; description: string } {
  const p = n.payload ?? {};

  switch (n.type) {
    case "achievement_earned": {
      const title = p.title || t("notification.achievementUnlocked");
      const description = p.points ? `+${p.points} XP` : t("notification.achievementUnlocked");
      return { title, description };
    }
    case "recruiter_interest": {
      return {
        title: p.title || t("notification.recruiterInterest"),
        description: p.body || "",
      };
    }
    case "job_rejected": {
      const role = p.role ?? "";
      const company = p.companyName ?? "";
      const detail = [role, company].filter(Boolean).join(" @ ");
      return {
        title: t("notification.jobRejectedTitle"),
        description: detail || "",
      };
    }
    case "system_email": {
      return {
        title: p.title || t("notification.systemEmail"),
        description: p.body || "",
      };
    }
    case "project_submitted": {
      const project = p.project?.name ?? p.title ?? "";
      return {
        title: t("notification.projectSubmitted"),
        description: project || "",
      };
    }
    case "job_submitted": {
      const role = p.role ?? "";
      const company = p.companyName ?? "";
      const detail = [role, company].filter(Boolean).join(" @ ");
      return {
        title: t("notification.jobSubmitted"),
        description: detail || "",
      };
    }
    case "mock_interview_scheduled": {
      return {
        title: t("notification.mockInterviewScheduled"),
        description: p.date ?? "",
      };
    }
    case "welcome":
      return { title: t("notification.welcome"), description: "" };
    case "new_job":
      return {
        title: t("notification.newJob"),
        description: `${p.role ?? ""} @ ${p.company ?? ""}`.trim(),
      };
    case "application_status":
      return {
        title: t("notification.applicationStatus"),
        description: p.status ?? p.message ?? "",
      };
    case "subscription":
      return {
        title: t("notification.subscription"),
        description: p.message ?? "",
      };
    default: {
      // Tolerate inconsistent payload keys and never show raw snake_case.
      const title = p.title ?? p.message ?? titleCase(n.type);
      const description = p.body ?? p.status ?? "";
      return { title, description };
    }
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("notifs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;
  const unread = items.filter(i => !i.read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <DropdownMenu onOpenChange={(o) => o && markAllRead()}>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
          <span>{t("notification.title")}</span>
          <Link href="/dashboard" className="text-primary hover:underline">{t("notification.viewAll")}</Link>
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">{t("notification.empty")}</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map(n => {
              const { title, description } = resolveNotification(n, t);
              return (
                <li key={n.id} className={`px-3 py-2 text-sm ${!n.read ? "bg-muted/40" : ""}`}>
                  <p className="font-medium truncate">{title}</p>
                  {description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
