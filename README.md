# RemoteDevsBR

RemoteDevsBR helps Brazilian developers land remote jobs and helps recruiters find them. It combines a free AI Resume Analyzer with a gamified career journey, a recruiter-facing search platform, and a growth loop that turns LLM-backed free tools into high-quality candidate profiles.

> Production (remotedevsbr.com) is a separate deployment of this project. This repository is the canonical source and includes no production secrets: keys, project refs, and credentials are never committed here.

## Product

- **Free AI Resume Analyzer** (`/analyze`): upload a PDF or paste a resume, get an overall score, top strengths, and suggested roles instantly. The detailed report is gated behind a free account, converting LLM tokens into structured profile data.
- **Career journey** (`/journey`) and **achievements** (`/achievements`): a gamified checklist with XP, streaks, and badges to keep developers progressing.
- **Profile builder** (`/profile`): developers build a recruiter-visible profile (stack, English level, seniority, goals, bio).
- **Cover Letter tool** (`/tools/cover-letter`): generate and tune cover letters with AI.
- **Recruiter platform** (`/recruiter/...`): candidate search with advanced filtering, blurred results for lower tiers, contact quotas, and Stripe-powered Professional/Enterprise subscriptions.
- **Content directories** (`/jobs`, `/companies`, `/classes`, `/resources`): job, company, class, and resource listings plus OG-preview fetching.
- **Mock interviews** (`/mock-interview`): paid mock interview bookings via Stripe checkout.
- **i18n**: all user-facing copy ships in both `pt` (Portuguese) and `en` (English) via `lib/i18n.tsx`.

## Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19, Tailwind CSS 4
- **Backend:** Supabase (Postgres, Auth, Edge Functions) on Deno
- **AI:** Lovable AI Gateway (Gemini Flash models), called only from Edge Functions
- **Payments:** Stripe (checkout sessions, billing portal, webhooks)
- **Auth:** Supabase Auth (email/password), recruiter flow under `/recruiter/auth`

## Repository layout

```
app/                        Next.js routes (developer + /recruiter frontends)
components/                 React components
integrations/supabase/      Generated supabase-js client + Database types
lib/i18n.tsx                pt/en dictionaries
supabase/
  config.toml               Edge function settings (verify_jwt, etc.)
  config.local.toml         Local-only overrides, gitignored, never commit
  functions/                Deno Edge Functions (resume analysis, payments, ...)
  migrations/               SQL migrations (schema + RLS)
```

## Self-hosting

### 1. Prerequisites

- Node.js 20.9+ (23.x recommended)
- npm
- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction) `^2.116.0` (install as a dev dependency via `npm install`)
- A Supabase project: either [hosted Supabase](https://supabase.com) or a self-hosted instance running locally
- `deno` (optional, for typechecking Edge Functions with `deno check`)

### 2. Frontend

```bash
npm install
cp .env.example .env.local   # fill in your values, see table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page, auth, dashboard, tools, and recruiter flows all work against the Supabase project configured in `.env.local`.

### 3. Database schema

```bash
supabase db push             # apply supabase/migrations/ to your project
```

To spin up a fully local Supabase stack instead of a hosted project:

```bash
supabase start               # local Postgres, Auth, and functions runtime
```

`supabase start` and other local commands take `project_id` from `supabase/config.toml` (placeholder value) unless overridden by a gitignored `supabase/config.local.toml`.

### 4. Edge Functions

Functions are deployed individually:

```bash
supabase functions deploy analyze-resume
supabase functions deploy cover-letter
```

Set function secrets (required for AI and payments):

```bash
supabase secrets set OPENAI_API_KEY=... STRIPE_SECRET_KEY=... TELEGRAM_BOT_TOKEN=...
```

Hosted Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at runtime; for local runs the CLI provides them too. CRON functions (e.g. `process-engagement-emails`) are scheduled from the Supabase dashboard.

## Environment variables

### Frontend (`app/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (safe for the browser) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public site origin, e.g. `https://your-domain.com` (canonical/OG URLs, sitemap, payment redirects) |
| `NEXT_PUBLIC_SIGNUP_DISABLED` | No | Set to `true` to disable public signup |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM` | No | Footer Instagram link |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | No | Footer LinkedIn link |
| `NEXT_PUBLIC_SOCIAL_WHATSAPP` | No | Footer WhatsApp link |

### Edge Function secrets (`supabase secrets set`)

| Variable | Used by | Required |
| --- | --- | --- |
| `SUPABASE_URL` | all functions | Yes, injected by Supabase |
| `SUPABASE_ANON_KEY` | authenticated functions | Yes, injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side data access | Yes, injected by Supabase |
| `OPENAI_API_KEY` | `analyze-resume`, `cover-letter`, `ai-tools` | For AI tools |
| `OPENAI_BASE_URL` | `analyze-resume`, `cover-letter`, `ai-tools` | Optional, defaults to `https://openrouter.ai/api/v1` |
| `STRIPE_SECRET_KEY` | `stripe-*` functions, `check-subscription` | For payments |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | For payments |
| `TELEGRAM_BOT_TOKEN` | `send-notification` | For notifications |
| `TELEGRAM_CHAT_ID` | `send-notification` | For notifications |
| `RESEND_API_KEY` | `process-engagement-emails` | For email campaigns |
| `SITE_URL` | `stripe-checkout`, `stripe-portal`, `mock-interview-checkout`, `stripe-recruiter-checkout` | Required, payment redirects |

## Security notes for custom deployments

- Keep `service_role` and Stripe secret keys server-side only; never expose them in `.env.local` or the browser.
- Never commit your real Supabase project ref or keys. Use the placeholder in `supabase/config.toml` and a gitignored `supabase/config.local.toml` for local overrides.
- Anonymous endpoints (`analyze-resume`, `cover-letter`, `fetch-og`) are intentionally unauthenticated but protected server-side with IP-based rate limits, SSRF validation, and JWT identity binding where applicable.

## Legal pages, privacy, and compliance for self-hosters

The bundled `/privacy-policy` and `/terms` pages are product-specific copy for the maintainer's production deployment. They reference RemoteDevs BR and `privacidade@remotedevsbr.com`, and are written around Brazilian law (LGPD) and this product's recruiter features. They are published here as a reference for what a policy should cover, not as a template you can publish as your own.

If you self-host:

- **Publish your own legal pages.** Replace the `privacy.*` and `terms.*` translation keys in `lib/i18n.tsx` (both `pt` and `en`) with your own legally reviewed policies, your own contact details, your own entity name, and the law(s) and jurisdiction that apply to you. Do not ship the RemoteDevs BR-branded copy.
- **Enter into your own data processing agreements (DPAs).** As the operator of your deployment, you are the data controller and must sign agreements with the processors you use. This repository processes personal data through at least:
  - **Supabase** (hosting, database, auth, edge functions), Supabase's DPA applies at their terms page
  - **Stripe** (payments), Stripe's DPA applies via their account agreement
  - **Lovable AI Gateway** (LLM inference; user resumes and cover letters are sent to their model API), apply their processing terms before enabling AI tools
- **Know what data leaves your deployment.** User-uploaded resumes and generated cover letters are sent to the LLM provider (Lovable) during analysis. Payment details go to Stripe. Review and disclose this in your own privacy policy, and get consent where your regime requires it.
- **This file and this repository are not legal advice.** Have your own policies and agreements reviewed by a qualified professional.

## Contributing to i18n strings

Never hardcode user-facing strings in components. Add keys to both the `pt` and `en` dictionaries in `lib/i18n.tsx` and read them with `useI18n()`. The admin pages under `/admin` are English-only by exception.

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE). If you self-host or modify this software and provide it over a network, the AGPL obligations apply.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and checks. All participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately, never via public issues: see [SECURITY.md](SECURITY.md).