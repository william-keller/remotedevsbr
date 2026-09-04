"use client";

import { useState, useCallback } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";

type MoneyField = "hourly" | "weekly" | "monthly" | "yearly" | "brlMonthly";

interface SalaryValues {
  hourly: number;
  weekly: number;
  monthly: number;
  yearly: number;
  brlMonthly: number;
  hours: number;
  rate: number;
}

const safe = (divisor: number, value: number): number => (divisor === 0 ? 0 : value / divisor);

const round2 = (n: number): number => Math.round(n * 100) / 100;

const moneyFromAnchor = (anchor: MoneyField, value: number, hours: number, rate: number, current: SalaryValues): SalaryValues => {
  const v = value;
  if (anchor === "hourly") {
    const yearly = v * 52 * hours;
    const weekly = yearly / 52;
    const monthly = yearly / 12;
    return { ...current, hourly: round2(v), yearly: round2(yearly), weekly: round2(weekly), monthly: round2(monthly), brlMonthly: round2(monthly * rate) };
  }
  if (anchor === "weekly") {
    const yearly = v * 52;
    const monthly = yearly / 12;
    return { ...current, weekly: round2(v), yearly: round2(yearly), monthly: round2(monthly), hourly: round2(safe(hours, yearly / 52)), brlMonthly: round2(monthly * rate) };
  }
  if (anchor === "monthly") {
    const yearly = v * 12;
    const weekly = yearly / 52;
    return { ...current, monthly: round2(v), yearly: round2(yearly), weekly: round2(weekly), hourly: round2(safe(hours, weekly)), brlMonthly: round2(v * rate) };
  }
  if (anchor === "brlMonthly") {
    const monthly = safe(rate, v);
    const yearly = monthly * 12;
    const weekly = yearly / 52;
    return { ...current, brlMonthly: round2(v), monthly: round2(monthly), yearly: round2(yearly), weekly: round2(weekly), hourly: round2(safe(hours, weekly)) };
  }
  const weekly = v / 52;
  const monthly = v / 12;
  return { ...current, yearly: round2(v), weekly: round2(weekly), monthly: round2(monthly), hourly: round2(safe(hours, weekly)), brlMonthly: round2(monthly * rate) };
};

const initialValues: SalaryValues = {
  hourly: 120000 / (52 * 40),
  weekly: 120000 / 52,
  monthly: 120000 / 12,
  yearly: 120000,
  brlMonthly: (120000 / 12) * 5,
  hours: 40,
  rate: 5,
};

export default function SalaryCalc() {
  const { t } = useI18n();
  const [values, setValues] = useState<SalaryValues>(initialValues);
  const [anchor, setAnchor] = useState<MoneyField | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<MoneyField, string>>>({});

  const setMoney = useCallback((field: MoneyField, raw: string) => {
    setDrafts((d) => ({ ...d, [field]: raw }));
    const v = Number(raw);
    if (Number.isNaN(v)) return;
    setAnchor(field);
    setValues((cur) => moneyFromAnchor(field, v, cur.hours, cur.rate, cur));
  }, []);

  const setHours = useCallback((raw: string) => {
    const h = Number(raw);
    if (Number.isNaN(h)) return;
    setValues((cur) => ({ ...cur, hours: h, hourly: round2(safe(h, cur.weekly)) }));
  }, []);

  const setRate = useCallback((raw: string) => {
    const r = Number(raw);
    if (Number.isNaN(r)) return;
    setValues((cur) => ({ ...cur, rate: r, brlMonthly: round2(cur.monthly * r) }));
  }, []);

  const moneyFields: { key: MoneyField; label: string; prefix: string }[] = [
    { key: "hourly", label: t("salary.hourly"), prefix: "$" },
    { key: "weekly", label: t("salary.weekly"), prefix: "$" },
    { key: "monthly", label: t("salary.monthly"), prefix: "$" },
    { key: "yearly", label: t("salary.yearly"), prefix: "$" },
    { key: "brlMonthly", label: t("salary.brlMonthly"), prefix: "R$" },
  ];

  return (
    <AppLayout>
      <SEO
        title="Calculadora Salarial para Devs Remotos | RemoteDevs BR"
        description="Calcule sua faixa salarial ideal para trabalho remoto em dólar com base na sua senioridade e stack."
        canonicalPath="/tools/salary"
      />
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
        <h2 className="text-xl font-bold mb-3">{t("salary.results")}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-xl border bg-card p-6">
          {moneyFields.map(({ key, label, prefix }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>
                <Input
                  type="number"
                  step="0.01"
                  className={`pl-8 ${anchor === key ? "ring-2 ring-primary" : ""}`}
                  value={drafts[key] ?? values[key].toFixed(2)}
                  onChange={(e) => setMoney(key, e.target.value)}
                  onBlur={() =>
                    setDrafts((d) => {
                      const next = { ...d };
                      delete next[key];
                      return next;
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}