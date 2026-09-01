# Onstrider Job Scraper: Design

Date: 2026-08-31
Status: Approved

## Summary

A daily cron scraper that imports jobs from Onstrider's partner referral job board
(`https://app.onstrider.com/job-board`) into our public `/jobs` board. Users click the
Onstrider referral (affiliate) link when applying, routing clicks through our partner
account. Jobs are auto-published (trusted source), deduplicated by source id, and dropped
off the board (deactivated) when they disappear from Onstrider.

## Architecture

A single Supabase Edge Function, `scrape-onstrider` (Deno, `Deno.serve`), scheduled daily
via pg_cron / the Supabase Dashboard (the same mechanism as `process-engagement-emails`).
No headless browser: it authenticates over HTTP and pulls the internal JSON API directly.

Per-run flow:

1. **Login**: `POST https://clerk.onstrider.com/v1/client/sign_ins` with form
   `identifier`, `password`, `strategy=password`. Extract
   `client.last_active_token.jwt` as the Bearer token.
2. **Fetch**: `GET https://app.onstrider.com/api/referrals/job-listings?status=Active`
   with `Authorization: Bearer <jwt>` and browser-like referer/user-agent headers.
3. **Normalize**: map each `items[]` entry into `jobs` columns (see Parsing).
4. **Upsert**: insert or update rows deduplicated on a new `external_id` column,
   `source='onstrider'`, `status='published'`, `is_active=true`,
   `apply_url = referralUrl`.
5. **Deactivate**: set `is_active=false` on any previously imported Onstrider job
   (`source='onstrider'`) whose source id is absent from this run.
6. **Report**: return `{ ok, inserted, updated, deactivated, fetched }`; send a Telegram
   summary on success and an alert on failure.

### Configuration

- `verify_jwt = false` (cron calls it, not a user session): add
  `[functions.scrape-onstrider] verify_jwt = false` to `supabase/config.toml`.
- Env secrets (Supabase Edge Function secrets): `ONSTRIDER_EMAIL`, `ONSTRIDER_PASSWORD`.
- Telegram via existing `_shared/telegram.ts` helpers (`TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_CHAT_ID`), consistent with the rest of the platform.

## Data model (migration)

New migration adds two columns to `public.jobs`:

```sql
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_external_id_key
  ON public.jobs(external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS english_level text;
```

- `external_id`: the Onstrider `item.id` (stable UUID); partial unique index enforces one
  row per source job and is the upsert key. Existing/manual jobs keep `NULL`.
- `english_level`: the API's `minEnglishLevel` (B2, C1, ...). Useful for filtering and to
  mirror what `recruiter-search` cares about.

### Sync semantics (Onstrider-scoped only, `source='onstrider'`)

- id not in DB -> insert as published + active.
- id already present -> update (refresh title/salary/stack/apply_url, keep active).
- absent from this run -> `is_active=false` (off the public board, kept in DB).

## Field mapping (API item -> jobs column)

| API field             | jobs column                          |
|-----------------------|--------------------------------------|
| `id`                  | `external_id`                        |
| `title`               | `role`, `title`                      |
| `referralUrl`         | `apply_url` (the affiliate link)     |
| `compensationLabel`   | salary_min/max/currency/period       |
| `minEnglishLevel`     | `english_level`                      |
| `minimumExperienceLabel` | `seniority_level`                 |
| `contractDetailsLabel`| `job_type` (+ location_type remote)  |
| `requiredSkillsLabel` | `stack[]`                            |
| `bonus`, `priority`   | captured in logs; not stored now     |
| (n/a)                 | `location_type='remote'`, `location='Remote'`, `region_scope='worldwide'` |
| (n/a)                 | `slug` generated from title + external_id hash |

`source = 'onstrider'` on insert.

## Parsing rules

All parsers are deterministic string parsers; no AI.

- **Salary** (`compensationLabel`, e.g. `3.5k-5k USD/month`): regex for min/max/currency
  and `per` unit; expand `k` (*1000); map unit to `salary_period`. Null if no amount.
- **English level**: store raw string.
- **Seniority** (`minimumExperienceLabel`, e.g. `7+ years of exp.`, `5 to 8 years of
  exp.`): extract years -> map to `intern/junior/mid/senior/lead` (e.g. 0-2 junior,
  3-5 mid, 6+ senior). Coarse mapping is acceptable.
- **Job type** (`contractDetailsLabel`, e.g. `Long-term · 40h/week`): `Long-term`/`Full`
  -> `full_time`, `Short-term`/`Contract` -> `contract`, `Part` -> `part_time`,
  `Freelance` -> `freelance`.
- **Stack**: split `requiredSkillsLabel` on commas.
- **Location**: always remote (`location_type='remote'`).
- **posted_at**: now() on insert; kept stable on update unless a deactivated job
  re-appears (then refreshed).

## Error handling & monitoring

- Login, fetch, normalise, and DB sync are isolated with try/catch; failures throw and
  surface as a non-2xx response.
- On failure send a Telegram alert (add an `onstriderScrapeFailed` helper to
  `_shared/telegram.ts`).
- Reuse `enforceRateLimit` from `_shared/rate_limit.ts` (per-run guard) so an accidental
  double-trigger does not hammer Onstrider.

## Cron setup (dashboard action, not repo code)

Documented in the PR: Supabase Dashboard -> Database -> Cron Jobs -> add a daily schedule
that HTTP-POSTs to the deployed function URL. Provide the schedule + URL in the PR notes.

## Scope guards (YAGNI)

- No UI changes; scraped jobs appear on the existing board automatically.
- No separate affiliate logic; `apply_url` is Onstrider's referral link.
- No pagination yet (sample shows a single flat `items` array); add if the API pages.
- Credentials are never committed; they live only as Supabase secrets.

## Verification

- `npm run typecheck`, lint on changed files, and a `supabase functions` deploy.
- Manual dry-run of login + fetch during a local/edge test before first cron commit.
