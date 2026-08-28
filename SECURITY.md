# Security Policy

Security matters here. This repository is public, and production does not share secrets with it, but the code itself (Next.js app, Supabase Edge Functions, migrations) must stay safe to self-host. We use coordinated private disclosure.

## Reporting a vulnerability

**Do not open a public GitHub issue or PR for a security vulnerability.**

Report privately through one of these channels:

1. **GitHub Security Advisories (preferred).** Use the "Report a vulnerability" button under the repository's Security tab. It creates a private report we can triage and collaborate on.
2. **Email.** kellerwilliam2011@gmail.com with a subject line starting with `SECURITY:`. There is no PGP key configured, so keep raw secrets out of the email body and follow up with details in the advisory if preferred.

Either way, automated duplicate scanning, credential leaks, and spam are out of scope.

### What to include

- Component affected: app route, Edge Function name (e.g. `analyze-resume`, `stripe-webhook`, `fetch-og`), or migration.
- Affected version, commit, or deployment.
- Steps to reproduce, including any tools or payloads (scrub any real secrets).
- Impact assessment and, if you have one, a suggested fix.

### What happens next

1. Maintainer acknowledges the report within 3 business days.
2. The issue is triaged, severity is assessed, and a fix plan is prepared.
3. A fix is developed on a private branch, released, and then disclosed (ideally within 90 days of the report, per GitHub's coordinated disclosure policy; faster for critical issues).
4. You will be credited publicly if you want to be.

## Scope

In scope:

- The Next.js application in this repository.
- The Supabase Edge Functions in `supabase/functions/`.
- The SQL migrations and RLS policies in `supabase/migrations/`.
- Self-hosted deployments of this repository.

The production site (remotedevsbr.com) is a separate deployment of this codebase. Issues that affect the code should be reported here; anything specific to that deployment's configuration can also go through the same private channels.

## Safe harbor

We will not pursue legal action against security researchers who investigate this project in good faith, report findings privately, avoid privacy violations and data destruction, and avoid disruption of production services. Respect the boundaries we set: if a test would affect production data or third-party systems, coordinate before performing it.

## Known hardening baseline

- Anonymous functions are rate limited per IP and validate inputs server-side.
- `fetch-og` blocks SSRF targets (private/reserved IPs, non-standard ports, unsafe redirects).
- Stripe webhook fails closed without a valid signature.
- JWT-authenticated functions must pass `verify_jwt = true`.
- Real Supabase project refs and secrets are never committed; `config.local.toml` and `.env.local` are gitignored.