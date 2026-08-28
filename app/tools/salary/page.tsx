"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";

export default function SalaryCalc() {
  const { t } = useI18n();
  const [annual, setAnnual] = useState(120000);
  const [hours, setHours] = useState(40);
  const [rate, setRate] = useState(5);

  const calc = useMemo(() => {
    const yearly = annual;
    const monthly = annual / 12;
    const weekly = annual / 52;
    const hourly = weekly / hours;
    const brlMonthly = monthly * rate;
    return { yearly, monthly, weekly, hourly, brlMonthly };
  }, [annual, hours, rate]);

  const Box = ({ label, value, prefix = "$" }: any) => (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{prefix}{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
    </div>
  );

  return (
    <AppLayout>
      <SEO 
        title="Calculadora Salarial para Devs Remotos | RemoteDevs BR" 
        description="Calcule sua faixa salarial ideal para trabalho remoto em dólar com base na sua senioridade e stack."
        canonicalPath="/tools/salary"
      />
      <div className="container max-w-4xl py-10">
        <h1 className="text-4xl font-bold">{t("salary.title")}</h1>
        <p className="text-muted-foreground mt-2 mb-8">Compare cenários e veja o que fecha pra você.</p>
        <div className="grid md:grid-cols-3 gap-4 rounded-xl border bg-card p-6 mb-8">
          <div><Label>{t("salary.annual")}</Label><Input type="number" value={annual} onChange={e=>setAnnual(+e.target.value)} /></div>
          <div><Label>{t("salary.hours")}</Label><Input type="number" value={hours} onChange={e=>setHours(+e.target.value)} /></div>
          <div><Label>{t("salary.brl")}</Label><Input type="number" step="0.01" value={rate} onChange={e=>setRate(+e.target.value)} /></div>
        </div>
        <h2 className="text-xl font-bold mb-3">{t("salary.results")}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Box label={t("salary.hourly")} value={calc.hourly} />
          <Box label={t("salary.weekly")} value={calc.weekly} />
          <Box label={t("salary.monthly")} value={calc.monthly} />
          <Box label={t("salary.yearly")} value={calc.yearly} />
          <Box label={t("salary.brlMonthly")} value={calc.brlMonthly} prefix="R$ " />
        </div>
      </div>
    </AppLayout>
  );
}
