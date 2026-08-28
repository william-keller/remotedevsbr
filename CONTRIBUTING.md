# Contributing to RemoteDevsBR

Thanks for your interest. Please read the [README](README.md) first for setup and architecture, then follow the conventions below.

## Reporting security issues

Do not file a public issue for a vulnerability. Report it privately, see [SECURITY.md](SECURITY.md). You can use the GitHub Security Advisories flow or email the maintainer at kellerwilliam2011@gmail.com.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase values
supabase db push             # apply supabase/migrations/ to your project
npm run dev
```

For a fully local backend, `supabase start` runs Postgres, Auth, and the functions runtime locally.

## Project conventions

- **i18n is mandatory**: never hardcode user-facing strings. Add keys to both the `pt` and `en` dictionaries in `lib/i18n.tsx` and read them with `useI18n()`. The `/admin` pages are the only English-only exception.
- **No em dashes** anywhere: copy, comments, docs, commit messages. Use commas, colons, parentheses, or hyphens.
- **Comments**: do not add comments unless they are genuinely necessary.
- **Edge Functions live in `supabase/functions/`**: one Deno function per folder, shared helpers in `supabase/functions/_shared/`.
- **All LLM calls go through Supabase Edge Functions.** Never call an LLM provider directly from the browser or a Next.js server; API keys are stored in Supabase secrets and server-side only.
- **Security for functions is a hard requirement**:
  - Authenticated functions keep `verify_jwt = true` in `supabase/config.toml`.
  - Anonymous (top-of-funnel) functions must be protected server-side: IP-based rate limits (see `supabase/functions/_shared/rate_limit.ts`), payload validation, and JWT identity binding where applicable.
  - Any function that fetches arbitrary URLs (SSRF surface, e.g. `fetch-og`) must block private/reserved hosts and validate every redirect.
  - Webhooks (Stripe) must fail closed: require and verify signatures; never fall back to parsing unverified bodies.
  - Never log or commit secrets, service role keys, or real project refs. The real Supabase `project_id` is never committed; it lives only in the gitignored `supabase/config.local.toml`.

## Checks

```bash
npm run lint                 # eslint
deno check supabase/functions/<name>/index.ts   # typecheck an edge function
```

There is no automated test suite yet. If you introduce non-trivial logic, add tests alongside it.

## Submitting changes

1. Keep PRs small and focused on one concern.
2. Describe the change and, for user-facing work, note the i18n impact (pt/en).
3. Ensure `npm run lint` passes and edge functions typecheck.
4. Note in the PR description if the change affects `verify_jwt`, rate limits, or RLS policies.

## License

By contributing you agree that your contributions are licensed under the [GNU Affero General Public License v3.0](LICENSE).