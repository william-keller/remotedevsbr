// Centralized commercial configuration for the English for Tech landing page.
// All prices, contract rules and schedule data live here so they can be tuned
// without touching component copy. Brand names are constants so the school can
// be renamed later without a refactor.

export type EnglishInterest = "career" | "start" | "global" | "squad" | "team";

export type EnglishLevel =
  | "beginner"
  | "intermediate"
  | "upper_intermediate"
  | "advanced"
  | "unsure";

export const ENGLISH_BRAND = {
  // Change this single constant to give the school its own name later.
  subBrand: "English for Tech",
  programName: "Global Tech Career Program",
} as const;

export const ENGLISH_PRICING = {
  start: {
    monthly: 199,
  },
  career: {
    firstInstallment: 299,
    monthlyInstallment: 358,
    remainingInstallments: 11,
    contractMonths: 12,
  },
  global: {
    monthly: 599,
  },
  // Cancellation: the penalty is a % of the remaining installments, applied
  // against the contractual reference monthly fee, not the promotional one.
  cancellation: {
    penaltyRate: 0.1,
  },
} as const;

// Total program value: first installment + remaining installments.
export function englishTotal(): number {
  const c = ENGLISH_PRICING.career;
  return c.firstInstallment + c.monthlyInstallment * c.remainingInstallments; // 299 + 11x358 = 4237
}

// Monthly cancellation penalty: 10% of the reference monthly fee (358 x 0.1).
export function penaltyPerMonth(): number {
  const c = ENGLISH_PRICING.career;
  const perMonth = c.monthlyInstallment * ENGLISH_PRICING.cancellation.penaltyRate;
  return Math.round(perMonth * 100) / 100; // 35.80
}

// Cancellation penalty for a given number of remaining contract months.
export function cancellationPenalty(monthsRemaining: number): number {
  return Math.round(penaltyPerMonth() * monthsRemaining * 100) / 100;
}

export const ENGLISH_SCHEDULE = {
  tracks: [
    { id: "a" as const, labelKey: "english.schedule.trackA" }, // Segunda + Quarta
    { id: "b" as const, labelKey: "english.schedule.trackB" }, // Terça + Quinta
  ],
  slots: {
    morning: ["07:00", "08:00"],
    afternoon: ["16:00", "17:00"],
    evening: ["18:00", "19:00", "20:00", "21:00"],
  },
  durationMinutes: 50,
  weeklyFrequency: 2,
  maxClassSize: 4,
} as const;

// Mobile-first layout is handled wholly in Tailwind classes at the components;
// this config only captures data (prices, times, contract rules).