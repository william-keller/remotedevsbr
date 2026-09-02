"use client";

import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { AppLayout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Bar, BarChart, XAxis, YAxis } from "recharts";

type SeriesPoint = { date: string; value: number };
type DailyPoint = { date: string; added: number };

type AnalyticsData = {
  generated_at: string;
  catalogue: { jobs: number; companies: number; side_projects: number };
  members: {
    total: number;
    onboarded: number;
    pro_subscribers: number;
    total_xp: number;
    cumulative: SeriesPoint[];
  };
  growth: {
    jobs_daily: DailyPoint[];
    analyses_daily: DailyPoint[];
    members_daily: DailyPoint[];
  };
  funnel: { resume_analyses: number; applications: number };
  recruiter: { companies: number; searches: number; interests: number };
  engagement: {
    achievements_earned: number;
    completed_lessons: number;
    achievements_series: SeriesPoint[];
  };
};

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">
          {formatNumber(Number(value))}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  height = "h-64",
  children,
}: {
  title: string;
  height?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={`${height}`}>{children}</CardContent>
    </Card>
  );
}

function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mt-14 space-y-1">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">{kicker}</div>
      <h2 className="text-2xl font-bold">{title}</h2>
      {sub ? <p className="text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("public-analytics")
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError) {
          setError(fnError.message ?? "Failed to load analytics");
          return;
        }
        setData(data as AnalyticsData);
        if (!data) setError("No analytics data returned");
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load analytics");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const green = "hsl(142 72% 35%)";
  const greenDark = "hsl(142 80% 50%)";
  const gold = "hsl(35 90% 50%)";
  const goldLight = "hsl(42 95% 55%)";
  const teal = "hsl(186 60% 40%)";
  const tealDark = "hsl(186 70% 55%)";

  const membersConfig = {
    members: { label: "Members", theme: { light: green, dark: greenDark } },
  };
  const jobsConfig = {
    added: { label: "Jobs added", theme: { light: goldLight, dark: gold } },
  };
  const analysesConfig = {
    added: { label: "Analyses", theme: { light: teal, dark: tealDark } },
  };
  const achConfig = {
    value: { label: "Achievements", theme: { light: goldLight, dark: gold } },
  };

  return (
    <AppLayout>
      <SEO
        title="Open — RemoteDevsBR numbers, live"
        description="RemoteDevsBR's platform metrics, live. Jobs, developers, free tool usage (resume analysis), recruiter traction, and growth."
        canonicalPath="/analytics"
      />
      <div className="container py-10 md:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Open</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">All our numbers, live.</h1>
          <p className="mt-4 text-muted-foreground">
            RemoteDevsBR is building the fastest path for Brazilian developers to land remote roles.
            Here are the platform metrics that matter: the jobs we surface, the developers we serve, the free
            tools they use, and the recruiters who reach them. Every figure is pulled live from the product
            itself, not a rounded snapshot.
          </p>
        </div>

        {error ? (
          <div className="mt-10 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : !data ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Open jobs" value={data.catalogue.jobs} />
              <StatCard label="Hiring companies" value={data.catalogue.companies} />
              <StatCard label="Community projects" value={data.catalogue.side_projects} />
              <StatCard label="Resume analyses run" value={data.funnel.resume_analyses} />
            </div>

            <SectionHeading
              kicker="Developers"
              title="The community"
              sub="Registered developer members, how many complete onboarding, and the ones on a paid plan."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Registered developers" value={data.members.total} />
              <StatCard label="Completed onboarding" value={data.members.onboarded} />
              <StatCard label="Pro subscribers" value={data.members.pro_subscribers} />
              <StatCard label="Combined XP earned" value={data.members.total_xp} />
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Cumulative registered developers">
                <ChartContainer config={membersConfig} className="h-64">
                  <AreaChart data={data.members.cumulative} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillMembers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-members)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-members)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                    <YAxis width={48} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-members)"
                      fill="url(#fillMembers)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Members added per day">
                <ChartContainer config={membersConfig} className="h-64">
                  <BarChart data={data.growth.members_daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                    <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="added" fill="var(--color-members)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
            </div>

            <SectionHeading
              kicker="Free tools"
              title="The funnel"
              sub="Our free AI resume analyzer is the top of the funnel. These are the analyses it has run, and the applications developers have gone on to log."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Resume analyses" value={data.funnel.resume_analyses} />
              <StatCard label="Applications logged" value={data.funnel.applications} />
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Resume analyses run per day">
                <ChartContainer config={analysesConfig} className="h-64">
                  <BarChart data={data.growth.analyses_daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                    <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="added" fill="var(--color-added)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Jobs added per day">
                <ChartContainer config={jobsConfig} className="h-64">
                  <BarChart data={data.growth.jobs_daily} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                    <YAxis width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="added" fill="var(--color-added)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ChartCard>
            </div>

            <SectionHeading
              kicker="Recruiters"
              title="Employer side"
              sub="Recruiting teams searching our talent pool, and the interests they have sent to developers."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Recruiting companies" value={data.recruiter.companies} />
              <StatCard label="Candidate searches" value={data.recruiter.searches} />
              <StatCard label="Interests sent" value={data.recruiter.interests} />
              <StatCard label="Achievements earned" value={data.engagement.achievements_earned} />
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Cumulative achievements earned">
                <ChartContainer config={achConfig} className="h-64">
                  <AreaChart data={data.engagement.achievements_series} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillAch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
                    <YAxis width={40} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="value" type="monotone" stroke="var(--color-value)" fill="url(#fillAch)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Learning">
                <div className="flex h-64 flex-col items-start justify-center">
                  <div className="text-sm font-medium text-muted-foreground">Completed lessons</div>
                  <div className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
                    {formatNumber(data.engagement.completed_lessons)}
                  </div>
                </div>
              </ChartCard>
            </div>

            <div className="mt-14 rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Where do these numbers come from?</p>
              <p className="mt-2">
                Straight from the RemoteDevsBR database at request time. Each figure is a single aggregate total
                across the product tables, and no individual member, resume, application, or recruiter row is ever
                exposed. Totals refresh live and are cached for a few minutes server-side.
              </p>
              <p className="mt-3">
                Updated:{" "}
                <span className="font-medium text-foreground">
                  {data.generated_at ? new Date(data.generated_at).toLocaleString("en-US") : "n/a"}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
