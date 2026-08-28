"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsBell() {
  const { user } = useAuth();
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

  const label = (n: any) => {
    if (n.type === "welcome") return "Bem-vindo à RemoteDevsBR!";
    if (n.type === "new_job") return `Nova vaga: ${n.payload?.role ?? ""} @ ${n.payload?.company ?? ""}`;
    if (n.type === "application_status") return `Candidatura atualizada: ${n.payload?.status ?? ""}`;
    if (n.type === "subscription") return n.payload?.message ?? "Assinatura atualizada";
    return n.type;
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
          <span>Notificações</span>
          <Link href="/dashboard" className="text-primary hover:underline">Ver tudo</Link>
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nada por aqui ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map(n => (
              <li key={n.id} className={`px-3 py-2 text-sm ${!n.read ? "bg-muted/40" : ""}`}>
                <p className="font-medium truncate">{label(n)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
