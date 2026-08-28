<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may all differ from your training data. Before writing Next.js code, prefer checking the project's actual `app/` router structure and installed Next version docs. If `node_modules/` is present locally, you may also consult the bundled docs under `node_modules/next/dist/docs/`.
<!-- END:nextjs-agent-rules -->
# AI Agents & Token Architecture

RemoteDevsBR relies heavily on Large Language Models (LLMs) to power the "Free Tools" tier (which acts as the top of our funnel) and to power the forthcoming AI-driven candidate matching engine.

This document outlines the architecture, prompts, and token management strategies used for these agents.

## 1. Resume Analyzer Agent

The core growth engine for the platform. Developers upload a PDF, we extract the text, and an LLM processes it into structured feedback.

**Location:** `supabase/functions/analyze-resume/`

**Provider:** OpenAI-compatible chat completions endpoint via `_shared/ai.ts` (defaults to OpenRouter at `https://openrouter.ai/api/v1`). Configured with the `OPENAI_API_KEY` and optional `OPENAI_BASE_URL` edge secrets.

**Model Choice (current):** Google Gemini Flash via OpenRouter. `google/gemini-2.5-flash` for analyze-resume and cover-letter; `google/gemini-3-flash-preview` for ai-tools.
* **Why Flash?** Speed and cost-efficiency. Resume analysis requires reading ~1,000-2,000 tokens of raw text and generating a few hundred tokens of structured JSON.

**Token Flow:**
1. **Input (Prompt + Payload):** ~1,500 - 3,000 tokens depending on resume length.
2. **Output (JSON):** ~400 - 600 tokens containing:
   * `overall_score` (0-100)
   * `top_strengths` (Array of strings)
   * `top_gaps` (Array of strings)
   * `suggested_roles` (Array of strings)
   * `detailed_feedback` (Long-form string masked behind an email gate)

**Prompt Strategy:**
We use a zero-shot prompt with strict JSON schema enforcement to ensure the output maps cleanly to our React frontend state and Postgres tables.

## 2. Token & Cost Economics

Because the Resume Analyzer is a **Free Tool** used to drive top-of-funnel acquisition, managing token costs is paramount.

* **Cost Optimization:** We use a Flash-tier model via OpenRouter to keep latency and per-request costs low. Avoid hardcoding cost-per-resume assumptions in product logic; treat pricing as a deploy-time/config concern that can change with provider/model.
* **Gate Strategy:** While the compute is free, the *value* of the full report is high. We present the user with the partial analysis (`overall_score` + `top_strengths`), but require them to create an account and complete their profile to unlock the `detailed_feedback`. This converts cheap LLM tokens into high-value structured profile data.

## 3. Future Agent: Recruiter Matchmaker (Phase 6)

The upcoming Phase 6 of the strategic sequence involves building an AI-driven matching engine.

**Goal:** Allow recruiters to describe their ideal candidate in natural language (e.g., "I need a Senior React dev who knows AWS and has fluent English, preferably with Fintech experience").

**Proposed Architecture:**
1. **Embeddings Agent:** Converts candidate stack, goals, and bio into vector embeddings stored in Postgres using `pgvector`.
2. **Retrieval-Augmented Generation (RAG):** When a recruiter searches:
   * The query is embedded.
   * Supabase performs a vector similarity search to retrieve the top 50 candidates.
   * An LLM (Flash-tier by default, Pro-tier if needed) synthesizes the top 5 matches, providing a brief explanation for *why* they are a good fit.

**Token Considerations for Matching:**
* Candidate data must be pre-summarized before embedding to reduce dimensionality and noise.
* Real-time generation for recruiters can afford higher latency/cost models if needed (since recruiters are paying subscribers), but RAG with Flash is likely sufficient.

## 4. Edge Function Security & Best Practices

* **No direct client-to-LLM calls:** All AI requests route through Supabase Edge Functions. The `OPENAI_API_KEY` is securely stored in Supabase Vault/Secrets and is never exposed to the frontend.
* **Rate Limiting:** We currently rate-limit resume uploads per anonymous session to prevent abuse of the API key.
* **JSON Validation:** LLM responses are parsed and sanitized before being inserted into the `resume_analyses` table to prevent injection or schema-breaking errors on the frontend.

---

## 5. Project Map (Routes & Endpoints)

This serves as a quick-reference map for all major touchpoints within the architecture.

### Developer Frontend Routes
* `/` - Landing Page & Top-of-Funnel pitch.
* `/auth` - Signup/Login flow.
* `/dashboard` - Overview of Remote Readiness, XP, Streaks, and AI analysis.
* `/profile` - Profile builder, including recruiter visibility toggle.
* `/journey` - The gamified step-by-step career acceleration checklist.
* `/achievements` - Gamification page displaying earned badges and XP progress.
* `/analyze` (or `/tools/resume`) - The free AI Resume Analyzer tool.
* `/jobs`, `/companies`, `/classes`, `/resources` - Content and resource directories.

### Recruiter Frontend Routes
* `/recruiter/auth` - Dedicated onboarding/login for company reps.
* `/recruiter/dashboard` - Analytics on recruiter activity (searches, views, contacts).
* `/recruiter/search` - Advanced candidate filtering (stack, English, seniority).
* `/recruiter/candidate/[id]` - Deep-dive candidate view & messaging interface (implemented under `/recruiter/candidate/[id]`).
* `/recruiter/pricing` - Stripe checkout for Professional/Enterprise tiers.

### Supabase Edge Functions (API)
* `analyze-resume` (POST) - Takes a PDF or text, extracts text if needed, calls the shared OpenAI-compatible helper (Gemini Flash via OpenRouter), stores `resume_analyses`, and returns partial + gated full report.
* `ai-tools` (POST) - Resume builder + LinkedIn tuner via OpenRouter through the shared OpenAI-compatible helper (currently configured as `google/gemini-3-flash-preview`).
* `track-activity` (POST) - Logs user actions, updates daily streaks, and checks for newly unlocked achievements.
* `process-engagement-emails` (CRON) - Background job that emails users about lost streaks or incomplete profiles.
* `recruiter-search` (POST) - Queries the `profiles` table. Returns full or obfuscated (blurred) data depending on the recruiter's subscription tier.
* `recruiter-candidate` (POST) - Fetches a candidate profile. Returns full or obfuscated (blurred) data depending on the recruiter's subscription tier.
* `recruiter-interest` (POST) - Deducts contact quotas, records intent, and triggers email notifications to candidates.
* `check-subscription` (POST) - Verifies subscription state for gated recruiter features.
* `stripe-recruiter-checkout` (POST) - Creates a Stripe Checkout Session for recruiter subscriptions.
* `stripe-checkout` (POST) - Creates a general Stripe Checkout Session (non-recruiter flows).
* `stripe-portal` (POST) - Creates a Stripe billing portal session.
* `stripe-webhook` (POST) - Handles async Stripe events to upgrade/downgrade user and recruiter subscriptions in the database.
* `send-notification` (POST) - Sends product notifications (email/other providers depending on implementation).
* `delete-user` (POST) - Deletes the calling user's own account and associated data (self-service, authenticated; scoped to `auth.uid()`).

---

## 6. Internationalization (i18n) Rules

All frontend text presented to the user **must** be internationalized. We support `pt` (Portuguese) and `en` (English).

**Guidelines for new pages/components:**
* Do not hardcode strings in components (e.g., `<h1>Termos</h1>`).
* Use the custom i18n implementation located at `lib/i18n.tsx`.
* Add new translation keys to both `pt` and `en` dictionaries inside `lib/i18n.tsx`.
* Use the `useI18n()` hook to retrieve the `t` function: `const { t } = useI18n();`
* Example usage: `<h1>{t("page.title")}</h1>`
* **Exception:** The entire admin page (`/admin`) is English-only and does not require internationalization. You can hardcode English strings directly in admin components.


## 7. Writing Style

Do not use the em dash character (`—`, U+2014) anywhere in this project: user-facing copy, i18n strings, comments, docs, commit messages, or agent responses.

Use commas, colons, parentheses, or hyphens (`-`) instead. Example: write "Speed and cost: resume analysis needs..." not "Speed and cost — resume analysis needs..."
