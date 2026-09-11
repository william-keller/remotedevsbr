"use client";

import { Suspense, useState } from "react";

import { AppLayout } from "@/components/Layout";
import { type EnglishInterest } from "@/lib/english/config";
import {
  Hero,
  PainPoints,
  Differentials,
  CareerScore,
  AiPractice,
  Missions,
  Plans,
  Schedule,
  Squad,
  Flexibility,
  Comparison,
  Testimonials,
  Faq,
  FinalCta,
} from "./components/sections";
import { LeadModal } from "./components/lead-modal";
import { StickyCta } from "./components/sticky-cta";
import { useScrollDepth } from "@/lib/english/use-scroll-depth";
import { trackEnglishCta } from "@/lib/track";

function Inner() {
  useScrollDepth();
  const [modal, setModal] = useState<{ open: boolean; interest: EnglishInterest }>({
    open: false,
    interest: "career",
  });
  const [session, setSession] = useState(0);

  const openLead = (interest: EnglishInterest) => {
    trackEnglishCta(interest);
    setSession((s) => s + 1);
    setModal({ open: true, interest });
  };

  return (
    <AppLayout>
      <Hero onCta={openLead} />
      <PainPoints />
      <Differentials />
      <CareerScore />
      <AiPractice />
      <Missions />
      <Plans onCta={openLead} />
      <Schedule />
      <Squad onCta={openLead} />
      <Flexibility />
      <Comparison />
      <Testimonials />
      <Faq />
      <FinalCta onCta={openLead} />

      <LeadModal
        key={session}
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        interest={modal.interest}
      />
      <StickyCta onCta={openLead} />
    </AppLayout>
  );
}

export function EnglishPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}