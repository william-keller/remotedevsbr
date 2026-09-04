"use client";

import { useState, useCallback } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MoneyField = "usdHourly" | "usdWeekly" | "usdMonthly" | "usdYearly" | "brlHourly" | "brlWeekly" | "brlMonthly" | "brlYearly";

interface SalaryValues {
  usdHourly: number;
  usdWeekly: number;
  usdMonthly: number;
  usdYearly: number;
  brlHourly: number;
  brlWeekly: number;
  brlMonthly: number;
  brlYearly: number;
  hours: number;
  rate: number;
}

type MoneyValues = Omit<SalaryValues, "hours" | "rate">;

const safe = (divisor: number, value: number): number => (divisor === 0 ? 0 : value / divisor);

const round2 = (n: number): number => Math.round(n * 100) / 100;

const deriveFromYearly = (yearly: number, hours: number, rate: number): MoneyValues => {
  const usdYearly = yearly;
  const usdWeekly = yearly / 52;
  const usdMonthly = yearly / 12;
  const usdHourly = safe(hours, usdWeekly);
  return {
    usdHourly: round2(usdHourly),
    usdWeekly: round2(usdWeekly),
    usdMonthly: round2(usdMonthly),
    usdYearly: round2(usdYearly),
    brlHourly: round2(usdHourly * rate),
    brlWeekly: round2(usdWeekly * rate),
    brlMonthly: round2(usdMonthly * rate),
    brlYearly: round2(usdYearly * rate),
  };
};

const rootYearly = (anchor: MoneyField, value: number, hours: number, rate: number): number => {
  switch (anchor) {
    case "usdYearly":
      return value;
    case "usdWeekly":
      return value * 52;
    case "usdMonthly":
      return value * 12;
    case "usdHourly":
      return value * 52 * hours;
    case "brlYearly":
      return safe(rate, value);
    case "brlWeekly":
      return safe(rate, value) * 52;
    case "brlMonthly":
      return safe(rate, value) * 12;
    case "brlHourly":
      return safe(rate, value) * 52 * hours;
  }
};

const moneyFromAnchor = (anchor: MoneyField, value: number, hours: number, rate: number): MoneyValues => {
  const derived = deriveFromYearly(rootYearly(anchor, value, hours, rate), hours, rate);
  return { ...derived, [anchor]: round2(value) };
};

const initialValues: SalaryValues = {
  usdHourly: 120000 / (52 * 40),
  usdWeekly: 120000 / 52,
  usdMonthly: 120000 / 12,
  usdYearly: 120000,
  brlHourly: (120000 / (52 * 40)) * 5,
  brlWeekly: (120000 / 52) * 5,
  brlMonthly: (120000 / 12) * 5,
  brlYearly: 120000 * 5,
  hours: 40,
  rate: 5,
};

interface FieldProps {
  label: string;
  prefix: string;
  value: string;
  isAnchor: boolean;
  onChange: (raw: string) => void;
  onBlur: () => void;
}

function Field({ label, prefix, value, isAnchor, onChange, onBlur }: FieldProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
        <Input
          type="number"
          step="0.01"
          className={`pl-8 ${isAnchor ? "ring-2 ring-primary" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

export function SalaryPage() {
  const { t } = useI18n();
  const [values, setValues] = useState<SalaryValues>(initialValues);
  const [anchor, setAnchor] = useState<MoneyField | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<MoneyField, string>>>({});

  const setMoney = useCallback((field: MoneyField, raw: string) => {
    setDrafts((d) => ({ ...d, [field]: raw }));
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    setAnchor(field);
    setValues((cur) => ({ ...cur, ...moneyFromAnchor(field, v, cur.hours, cur.rate) }));
  }, []);

  const setHours = useCallback((raw: string) => {
    const h = Number(raw);
    if (Number.isNaN(h)) return;
    setValues((cur) => {
      const usdHourly = round2(safe(h, cur.usdWeekly));
      return { ...cur, hours: h, usdHourly, brlHourly: round2(usdHourly * cur.rate) };
    });
  }, []);

  const setRate = useCallback((raw: string) => {
    const r = Number(raw);
    if (Number.isNaN(r)) return;
    setValues((cur) => ({
      ...cur,
      rate: r,
      brlHourly: round2(cur.usdHourly * r),
      brlWeekly: round2(cur.usdWeekly * r),
      brlMonthly: round2(cur.usdMonthly * r),
      brlYearly: round2(cur.usdYearly * r),
    }));
  }, []);

  const clearDraft = useCallback((field: MoneyField) => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[field];
      return next;
    });
  }, []);

  return (
    <AppLayout>
      <div className="container max-w-4xl py-10">
        <h1 className="text-4xl font-bold">{t("salary.title")}</h1>
        <p className="text-muted-foreground mt-2 mb-8">{t("salary.hint")}</p>
        <div className="grid md:grid-cols-2 gap-4 rounded-xl border bg-card p-6 mb-8">
          <div>
            <Label>{t("salary.hours")}</Label>
            <Input type="number" value={values.hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <Label>{t("salary.brl")}</Label>
            <Input type="number" step="0.01" value={values.rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-3">{t("salary.usdResults")}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border bg-card p-6 mb-8">
          <Field
            label={t("salary.hourly")}
            prefix="$"
            value={drafts.usdHourly ?? values.usdHourly.toFixed(2)}
            isAnchor={anchor === "usdHourly"}
            onChange={(raw) => setMoney("usdHourly", raw)}
            onBlur={() => clearDraft("usdHourly")}
          />
          <Field
            label={t("salary.weekly")}
            prefix="$"
            value={drafts.usdWeekly ?? values.usdWeekly.toFixed(2)}
            isAnchor={anchor === "usdWeekly"}
            onChange={(raw) => setMoney("usdWeekly", raw)}
            onBlur={() => clearDraft("usdWeekly")}
          />
          <Field
            label={t("salary.monthly")}
            prefix="$"
            value={drafts.usdMonthly ?? values.usdMonthly.toFixed(2)}
            isAnchor={anchor === "usdMonthly"}
            onChange={(raw) => setMoney("usdMonthly", raw)}
            onBlur={() => clearDraft("usdMonthly")}
          />
          <Field
            label={t("salary.yearly")}
            prefix="$"
            value={drafts.usdYearly ?? values.usdYearly.toFixed(2)}
            isAnchor={anchor === "usdYearly"}
            onChange={(raw) => setMoney("usdYearly", raw)}
            onBlur={() => clearDraft("usdYearly")}
          />
        </div>
        <h2 className="text-xl font-bold mb-3">{t("salary.brlResults")}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border bg-card p-6">
          <Field
            label={t("salary.hourly")}
            prefix="R$"
            value={drafts.brlHourly ?? values.brlHourly.toFixed(2)}
            isAnchor={anchor === "brlHourly"}
            onChange={(raw) => setMoney("brlHourly", raw)}
            onBlur={() => clearDraft("brlHourly")}
          />
          <Field
            label={t("salary.weekly")}
            prefix="R$"
            value={drafts.brlWeekly ?? values.brlWeekly.toFixed(2)}
            isAnchor={anchor === "brlWeekly"}
            onChange={(raw) => setMoney("brlWeekly", raw)}
            onBlur={() => clearDraft("brlWeekly")}
          />
          <Field
            label={t("salary.monthly")}
            prefix="R$"
            value={drafts.brlMonthly ?? values.brlMonthly.toFixed(2)}
            isAnchor={anchor === "brlMonthly"}
            onChange={(raw) => setMoney("brlMonthly", raw)}
            onBlur={() => clearDraft("brlMonthly")}
          />
          <Field
            label={t("salary.yearly")}
            prefix="R$"
            value={drafts.brlYearly ?? values.brlYearly.toFixed(2)}
            isAnchor={anchor === "brlYearly"}
            onChange={(raw) => setMoney("brlYearly", raw)}
            onBlur={() => clearDraft("brlYearly")}
          />
        </div>
      </div>
    </AppLayout>
  );
}