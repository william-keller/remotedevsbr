
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS current_job_title text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS salary_expectation_usd integer,
  ADD COLUMN IF NOT EXISTS remote_goals text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
