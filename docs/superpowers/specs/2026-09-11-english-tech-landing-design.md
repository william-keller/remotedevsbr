# English for Tech Landing Page (`/english`) Design

Date: 2026-09-11
Status: Approved

## Goal

A commercial landing page launching the RemoteDevsBR English vertical: professional English for tech professionals who want to work globally. Positioned as "English for Tech", not a traditional language school. Primary commercial focus: the 12-month CAREER plan.

## Architecture

- Route `/english`: `app/english/page.tsx` (server, `buildMetadata` + JSON-LD `Course`) renders client composition `app/english/english-page.tsx` (Suspense-wrapped, ebook pattern).
- Modular sections under `app/english/components/`: hero, pain-points, differentials, career-score, ai-practice, missions, plans, schedule, squad, flexibility, comparison, testimonials, faq, final-cta, lead-modal, sticky-cta.
- Centralized commercial config in `lib/english/config.ts`: brand constants, pricing, cancellation rules, schedule. Pure helpers: `englishTotal()` (4.237), `penaltyPerMonth()` (35.80), `cancellationPenalty(monthsRemaining)` (286.40 at month 4, 0 at month 12). All prices/penalties render from these.
- Copy (headlines, cards, FAQ, lists) via flat `english.*` i18n keys (pt + en) assembled in components, same as the ebook page.

## Conversion hierarchy

1. CAREER = featured plan: "Mais escolhido" badge, gold accent, strongest CTA, shows `R$ 299 first + 11x R$ 358`, computed total R$ 4.237.
2. START = entry/anchoring card (compact).
3. GLOBAL = premium anchoring card (compact).
4. TEAM = separate corporate block below.
CTAs open the shared lead modal prefilled with the chosen `interest_type` (`career|start|global|squad|team`). Sticky mobile CTA bar (Career) shows on small screens after the hero; page bottom padding accounts for safe-area.

## Lead capture

- Migration `20260911120000_english_program.sql`: table `english_program_leads` (id, interest_type CHECK, full_name, email, whatsapp, current_level, schedule_preference, created_at), RLS enabled, no client policies.
- Edge function `english-lead` (POST): CORS, `enforceRateLimit` (20/min), validate payload, insert via service-role client, Telegram via new `notifyEnglishLead` in `_shared/telegram.ts`.
- `LeadModal` fields: name, email, whatsapp (optional), current level (select), schedule preference (optional). Sonner toasts; success state with WhatsApp follow-up link. Real labels/ARIA.

## Analytics (GTM dataLayer)

`lib/track.ts` `trackEvent(name, params)`; `english_cta_click`, `english_plan_click{plan}`, `english_squad_click`, `english_team_click`, `english_form_start`, `english_form_submit{plan}`, `english_scroll{depth}` (25/50/75/100, `use-scroll-depth` hook). Supports visit -> lead and visit -> Career CTA -> lead funnels.

## Sections & order

Hero (tech/startup look, CSS-only visual card: live session mock + Career Score chip), pain points (5 quotes + resolve line), differentials ("Não ensinamos inglês de apostila..." 6 cards), Career Score (62/100, 7 subscores, 62->71->79->86, labeled product representation), AI Practice (5 prompt chat cards), Career Missions (5 English-mission cards; mission copy stays English in both locales), Plans, Schedule (Seg+Qua / Ter+Qui track cards, time pills grouped manha/tarde/noite), Squad ("Monte sua turma", 5 benefits), Flexibility ("Programa anual", "Pause, não abandone" 60-day pause explicitly labeled a product proposal, plus transparent Contract & Cancellation block splitting promotional R$ 299 vs contractual R$ 358 with computed examples), Comparison (tradicional vs Global Tech Career, 6 rows), Testimonials (ships with empty array; renders nothing until real testimonials exist), FAQ (12 items incl. cancellation math), Final CTA + sticky mobile CTA.

## Security / integrity

No invented testimonials, enrollment numbers, salaries, partner logos, or certifications. No checkout/subscription wiring in this iteration. No "definitive" assessment methodology claim. No em dashes in copy. All user-facing text i18n'd (pt + en); brand/product names are constants.

## Verification

`npx tsc --noEmit`; `npx eslint` on changed dirs; `npx next build`; manual checks: computed prices/penalties, schedule pills, Career visual dominance incl. mobile, cancellation copy, modal focus/escape, contrast, sticky bar behavior, safe-area insets.

Deploy order: apply migration -> deploy `english-lead` edge function -> frontend.