
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS area_custom text,
  ADD COLUMN IF NOT EXISTS experience_bucket text,
  ADD COLUMN IF NOT EXISTS monthly_income_bucket text,
  ADD COLUMN IF NOT EXISTS pain_point text,
  ADD COLUMN IF NOT EXISTS pain_point_custom text,
  ADD COLUMN IF NOT EXISTS intl_search_stage text;

INSERT INTO public.achievements (key, title, description, icon, category, points)
VALUES ('onboarding_completed', 'Onboarding Completed', 'Completed the onboarding quiz on your first session.', 'Compass', 'onboarding', 20)
ON CONFLICT (key) DO NOTHING;
