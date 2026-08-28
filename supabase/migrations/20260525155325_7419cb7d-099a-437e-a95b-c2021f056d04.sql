
-- Profiles: engagement + visibility fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz,
  ADD COLUMN IF NOT EXISTS visible_to_recruiters boolean NOT NULL DEFAULT false;

-- Achievements catalog
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'engagement',
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_read_all" ON public.achievements;
CREATE POLICY "achievements_read_all" ON public.achievements FOR SELECT USING (true);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recruiter profiles
CREATE TABLE IF NOT EXISTS public.recruiter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  company_website text,
  company_size text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recruiter_profiles_own" ON public.recruiter_profiles;
CREATE POLICY "recruiter_profiles_own" ON public.recruiter_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Recruiter subscriptions
CREATE TABLE IF NOT EXISTS public.recruiter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  candidate_contacts_remaining integer NOT NULL DEFAULT 5,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recruiter_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recruiter_subs_own" ON public.recruiter_subscriptions;
CREATE POLICY "recruiter_subs_own" ON public.recruiter_subscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.recruiter_profiles rp WHERE rp.id = recruiter_id AND rp.user_id = auth.uid()));

-- Candidate searches log
CREATE TABLE IF NOT EXISTS public.candidate_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.candidate_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate_searches_own" ON public.candidate_searches;
CREATE POLICY "candidate_searches_own" ON public.candidate_searches
  FOR ALL USING (EXISTS (SELECT 1 FROM public.recruiter_profiles rp WHERE rp.id = recruiter_id AND rp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recruiter_profiles rp WHERE rp.id = recruiter_id AND rp.user_id = auth.uid()));

-- Candidate interests (recruiter contacted candidate)
CREATE TABLE IF NOT EXISTS public.candidate_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, candidate_id)
);
ALTER TABLE public.candidate_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "candidate_interests_recruiter" ON public.candidate_interests;
CREATE POLICY "candidate_interests_recruiter" ON public.candidate_interests
  FOR ALL USING (EXISTS (SELECT 1 FROM public.recruiter_profiles rp WHERE rp.id = recruiter_id AND rp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recruiter_profiles rp WHERE rp.id = recruiter_id AND rp.user_id = auth.uid()));
DROP POLICY IF EXISTS "candidate_interests_candidate_view" ON public.candidate_interests;
CREATE POLICY "candidate_interests_candidate_view" ON public.candidate_interests
  FOR SELECT USING (auth.uid() = candidate_id);
