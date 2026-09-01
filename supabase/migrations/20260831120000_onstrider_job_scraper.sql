-- Onstrider job scraper: support columns
-- external_id: stable source id from Onstrider for dedup/upsert + auto-deactivate.
-- english_level: minimum English level (e.g. B2, C1) from Onstrider listings.
begin;

alter table public.jobs add column if not exists external_id text;

create unique index if not exists jobs_external_id_key
  on public.jobs (external_id)
  where external_id is not null;

alter table public.jobs add column if not exists english_level text;

comment on column public.jobs.external_id is
  'Stable source identifier (e.g. Onstrider job id) used for dedup/upsert.';
comment on column public.jobs.english_level is
  'Minimum English level required (e.g. B2, C1).';

commit;
