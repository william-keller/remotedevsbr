-- Onstrider scraper: enrich jobs with per-listing detail fields.
alter table public.jobs add column if not exists industry text;
alter table public.jobs add column if not exists role_category text;

comment on column public.jobs.industry is
  'Industry sector reported by Onstrider (e.g. Enterprise software). Populated from the per-listing detail endpoint.';
comment on column public.jobs.role_category is
  'Onstrider role category, distinct from the job title (e.g. title "LiDAR Specialist", role category "Data Analyst").';
