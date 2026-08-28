"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AppLayout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RequireAuth } from "@/components/Guards";
import {
  CalendarDays, Clock, ChevronLeft, ChevronRight, Loader2, User, ShoppingCart,
} from "lucide-react";
import { format, addDays, startOfDay, isSameDay, isAfter } from "date-fns";

type Slot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  interviewer_id: string;
  interviewer_name?: string;
  interviewer_specialties?: string[];
};

type Purchase = {
  id: string;
  sessions_total: number;
  sessions_used: number;
};

function Inner() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [credits, setCredits] = useState(0);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Load credits
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("mock_interview_purchases")
        .select("id, sessions_total, sessions_used")
        .eq("user_id", user.id)
        .eq("status", "paid");
      const p = (data ?? []) as Purchase[];
      setPurchases(p);
      const total = p.reduce((sum, x) => sum + (x.sessions_total - x.sessions_used), 0);
      setCredits(total);
    };
    load();
  }, [user]);

  // Load available slots
  useEffect(() => {
    const load = async () => {
      const fromDate = format(weekStart, "yyyy-MM-dd");
      const toDate = format(addDays(weekStart, 13), "yyyy-MM-dd");
      const { data } = await supabase
        .from("mock_interview_availability")
        .select("id, date, start_time, end_time, interviewer_id")
        .eq("is_available", true)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (data && data.length > 0) {
        // Fetch interviewer names
        const interviewerIds = [...new Set(data.map((s: any) => s.interviewer_id))];
        const { data: interviewers } = await supabase
          .from("mock_interview_interviewers")
          .select("id, name, specialties")
          .in("id", interviewerIds);

        const interviewerMap = new Map(
          (interviewers ?? []).map((i: any) => [i.id, { name: i.name, specialties: i.specialties }])
        );

        setSlots(
          (data as any[]).map((s) => ({
            ...s,
            interviewer_name: interviewerMap.get(s.interviewer_id)?.name ?? "TBD",
            interviewer_specialties: interviewerMap.get(s.interviewer_id)?.specialties ?? [],
          }))
        );
      } else {
        setSlots([]);
      }
    };
    load();
  }, [weekStart]);

  // Get dates with slots
  const datesWithSlots = [...new Set(slots.map((s) => s.date))];

  // Slots for selected date
  const daySlots = slots.filter((s) => s.date === format(selectedDate, "yyyy-MM-dd"));

  // 14-day range for the mini calendar
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

  const confirmBooking = async () => {
    if (!selectedSlot || !user) return;

    // Find a purchase with remaining credits
    const purchase = purchases.find((p) => p.sessions_total - p.sessions_used > 0);
    if (!purchase) {
      toast.error(t("mockInterview.book.noCredits"));
      return;
    }

    setConfirming(true);
    try {
      // Create the appointment
      const { error: apptErr } = await supabase.from("mock_interview_appointments").insert({
        user_id: user.id,
        purchase_id: purchase.id,
        availability_id: selectedSlot.id,
        interviewer_id: selectedSlot.interviewer_id,
        scheduled_date: selectedSlot.date,
        scheduled_start: selectedSlot.start_time,
        scheduled_end: selectedSlot.end_time,
        status: "scheduled",
      });
      if (apptErr) throw apptErr;

      // Increment sessions_used
      const { error: updErr } = await supabase
        .from("mock_interview_purchases")
        .update({ sessions_used: purchase.sessions_used + 1 })
        .eq("id", purchase.id);
      if (updErr) throw updErr;

      // Mark slot as unavailable
      await supabase
        .from("mock_interview_availability")
        .update({ is_available: false })
        .eq("id", selectedSlot.id);

      // Dispatch Telegram notification
      supabase.functions.invoke("send-notification", {
        body: {
          type: "mock_interview_scheduled",
          user_id: user.id,
          payload: {
            date: selectedSlot.date,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            interviewer_name: selectedSlot.interviewer_name,
            user_email: user.email,
            user_id: user.id,
          },
        },
      }).catch((err) => console.error("Failed to dispatch booking notification:", err));

      toast.success(t("mockInterview.book.success"));
      setSelectedSlot(null);
      setCredits((c) => c - 1);
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === purchase.id ? { ...p, sessions_used: p.sessions_used + 1 } : p
        )
      );
      // Remove slot from list
      setSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id));
    } catch (e: any) {
      toast.error(e.message ?? "Booking failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title={t("mockInterview.book.title") + " | RemoteDevs BR"}
        description={t("mockInterview.seoDesc")}
        canonicalPath="/mock-interview/book"
      />
      <div className="container max-w-4xl py-10">
        <h1 className="text-3xl font-bold">{t("mockInterview.book.title")}</h1>

        {/* Credits banner */}
        <div className="mt-6 rounded-xl border bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("mockInterview.book.credits")}</p>
              <p className="text-2xl font-bold">{credits}</p>
            </div>
          </div>
          {credits === 0 && (
            <Button asChild variant="outline">
              <Link href="/mock-interview">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("mockInterview.profile.buyMore")}
              </Link>
            </Button>
          )}
        </div>

        {credits === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-muted-foreground mb-4">{t("mockInterview.book.noCredits")}</p>
            <Button asChild className="gradient-go text-primary-foreground">
              <Link href="/mock-interview">{t("mockInterview.profile.buyMore")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Mini calendar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">{t("mockInterview.book.selectDate")}</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const prev = addDays(weekStart, -14);
                      if (isAfter(prev, addDays(new Date(), -1)) || isSameDay(prev, startOfDay(new Date()))) {
                        setWeekStart(prev);
                      }
                    }}
                    disabled={isSameDay(weekStart, startOfDay(new Date()))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setWeekStart(addDays(weekStart, 14))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const hasSlots = datesWithSlots.includes(dateStr);
                  const isSelected = isSameDay(day, selectedDate);
                  const isPast = day < startOfDay(new Date());
                  return (
                    <button
                      key={dateStr}
                      disabled={isPast || !hasSlots}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center gap-0.5 rounded-xl p-2 text-sm transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : hasSlots
                            ? "bg-card border hover:border-primary/40 hover:shadow-sm cursor-pointer"
                            : "opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-medium">
                        {format(day, "EEE")}
                      </span>
                      <span className="text-base font-bold">{format(day, "d")}</span>
                      <span className="text-[10px]">{format(day, "MMM")}</span>
                      {hasSlots && (
                        <div className={`h-1 w-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div>
              <h2 className="font-semibold text-lg mb-4">{t("mockInterview.book.selectSlot")}</h2>
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center rounded-xl border bg-card">
                  {t("mockInterview.book.noSlots")}
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
                        selectedSlot?.id === slot.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" />
                          {slot.interviewer_name}
                          {slot.interviewer_specialties && slot.interviewer_specialties.length > 0 && (
                            <span className="text-[10px] opacity-70">
                              {" "}({slot.interviewer_specialties.slice(0, 2).join(", ")})
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm */}
            {selectedSlot && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
                <h3 className="font-semibold text-lg mb-3">{t("mockInterview.book.confirmTitle")}</h3>
                <div className="grid sm:grid-cols-3 gap-4 text-sm mb-5">
                  <div>
                    <p className="text-muted-foreground text-xs">{t("mockInterview.book.selectDate")}</p>
                    <p className="font-medium">{format(new Date(selectedSlot.date + "T00:00:00"), "PPP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Horario</p>
                    <p className="font-medium">{selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("mockInterview.book.interviewer")}</p>
                    <p className="font-medium">{selectedSlot.interviewer_name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={confirmBooking}
                    disabled={confirming}
                    className="gradient-go text-primary-foreground"
                  >
                    {confirming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t("mockInterview.book.confirmBtn")}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function BookMockInterview() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
