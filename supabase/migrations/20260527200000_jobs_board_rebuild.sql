-- RemoteOK-style jobs board rebuild foundation
-- Note: mock/dev stage, so schema can evolve aggressively.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE public.job_status AS ENUM ('draft', 'pending', 'published', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE public.job_type AS ENUM ('full_time', 'part_time', 'contract', 'freelance', 'internship');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salary_period') THEN
    CREATE TYPE public.salary_period AS ENUM ('year', 'month', 'week', 'day', 'hour');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type') THEN
    CREATE TYPE public.location_type AS ENUM ('remote', 'hybrid', 'onsite');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_seniority') THEN
    CREATE TYPE public.job_seniority AS ENUM ('intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead');
  END IF;
END$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS hq_country text,
  ADD COLUMN IF NOT EXISTS size_band text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS remote_policy text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

UPDATE public.companies
SET slug = COALESCE(slug, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_key ON public.companies(slug);

CREATE TABLE IF NOT EXISTS public.job_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_perks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS seniority_level public.job_seniority,
  ADD COLUMN IF NOT EXISTS job_type public.job_type NOT NULL DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS status public.job_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS salary_min numeric(12,2),
  ADD COLUMN IF NOT EXISTS salary_max numeric(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS salary_period public.salary_period DEFAULT 'year',
  ADD COLUMN IF NOT EXISTS location_type public.location_type NOT NULL DEFAULT 'remote',
  ADD COLUMN IF NOT EXISTS region_scope text,
  ADD COLUMN IF NOT EXISTS country_codes text[],
  ADD COLUMN IF NOT EXISTS timezone_regions text[],
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS apply_mode text DEFAULT 'external_url',
  ADD COLUMN IF NOT EXISTS benefits_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applications_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified_company boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.jobs
SET
  title = COALESCE(title, role),
  slug = COALESCE(slug, lower(regexp_replace(COALESCE(role, 'job') || '-' || substr(id::text, 1, 8), '[^a-zA-Z0-9]+', '-', 'g'))),
  salary_min = COALESCE(salary_min, comp_min),
  salary_max = COALESCE(salary_max, comp_max),
  salary_currency = COALESCE(salary_currency, comp_currency, 'USD'),
  published_at = COALESCE(published_at, posted_at),
  company_id = COALESCE(company_id, (
    SELECT c.id
    FROM public.companies c
    WHERE lower(c.name) = lower(jobs.company_name)
    LIMIT 1
  ));

ALTER TABLE public.jobs
  ALTER COLUMN title SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_slug_key ON public.jobs(slug);
CREATE INDEX IF NOT EXISTS jobs_status_active_idx ON public.jobs(status, is_active);
CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON public.jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS jobs_salary_idx ON public.jobs(salary_min DESC, salary_max DESC);
CREATE INDEX IF NOT EXISTS jobs_company_id_idx ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS jobs_country_codes_gin ON public.jobs USING gin(country_codes);
CREATE INDEX IF NOT EXISTS jobs_timezone_regions_gin ON public.jobs USING gin(timezone_regions);
CREATE INDEX IF NOT EXISTS jobs_stack_gin ON public.jobs USING gin(stack);

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_salary_range_check
  CHECK (
    salary_min IS NULL
    OR salary_max IS NULL
    OR salary_min <= salary_max
  );

CREATE TABLE IF NOT EXISTS public.job_perk_map (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  perk_id uuid NOT NULL REFERENCES public.job_perks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, perk_id)
);
ALTER TABLE public.job_perk_map ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS job_perk_map_perk_idx ON public.job_perk_map(perk_id);

CREATE OR REPLACE FUNCTION public.refresh_job_benefits_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs
  SET benefits_count = (
    SELECT COUNT(*)
    FROM public.job_perk_map jpm
    WHERE jpm.job_id = COALESCE(NEW.job_id, OLD.job_id)
  )
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_job_benefits_count ON public.job_perk_map;
CREATE TRIGGER trg_refresh_job_benefits_count
AFTER INSERT OR DELETE ON public.job_perk_map
FOR EACH ROW EXECUTE FUNCTION public.refresh_job_benefits_count();

DROP POLICY IF EXISTS "Job perks public read" ON public.job_perks;
CREATE POLICY "Job perks public read"
ON public.job_perks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Job perks admin write" ON public.job_perks;
CREATE POLICY "Job perks admin write"
ON public.job_perks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Job perk map public read" ON public.job_perk_map;
CREATE POLICY "Job perk map public read"
ON public.job_perk_map FOR SELECT USING (true);

DROP POLICY IF EXISTS "Job perk map admin write" ON public.job_perk_map;
CREATE POLICY "Job perk map admin write"
ON public.job_perk_map FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Jobs public read" ON public.jobs;
CREATE POLICY "Jobs public read"
ON public.jobs FOR SELECT
USING (status = 'published' AND is_active = true);

DROP POLICY IF EXISTS "Jobs admin write" ON public.jobs;
CREATE POLICY "Jobs admin write"
ON public.jobs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Jobs own update" ON public.jobs;
CREATE POLICY "Jobs own update"
ON public.jobs FOR UPDATE TO authenticated
USING (auth.uid() = submitted_by)
WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Jobs own delete" ON public.jobs;
CREATE POLICY "Jobs own delete"
ON public.jobs FOR DELETE TO authenticated
USING (auth.uid() = submitted_by);

INSERT INTO public.job_perks (slug, label, category) VALUES
  ('401k', '401(k)', 'compensation'),
  ('distributed-team', 'Distributed team', 'culture'),
  ('async', 'Async', 'culture'),
  ('vision-insurance', 'Vision insurance', 'health'),
  ('dental-insurance', 'Dental insurance', 'health'),
  ('medical-insurance', 'Medical insurance', 'health'),
  ('unlimited-vacation', 'Unlimited vacation', 'time-off'),
  ('paid-time-off', 'Paid time off', 'time-off'),
  ('4-day-workweek', '4 day workweek', 'time-off'),
  ('learning-budget', 'Learning budget', 'growth'),
  ('home-office-budget', 'Home office budget', 'workspace'),
  ('pay-in-crypto', 'Pay in crypto', 'compensation'),
  ('profit-sharing', 'Profit sharing', 'compensation'),
  ('equity-compensation', 'Equity compensation', 'compensation'),
  ('no-whiteboard', 'No whiteboard interview', 'hiring-process'),
  ('no-monitoring', 'No monitoring system', 'culture'),
  ('no-politics', 'No politics at work', 'culture')
ON CONFLICT (slug) DO NOTHING;
