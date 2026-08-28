-- Migration: Engagement Loops & Gamification
-- Adds achievements, activity logs, engagement emails, and profile extensions

-- 1. Create achievements table
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for achievements" 
ON public.achievements FOR SELECT 
USING (true);

-- 2. Create user_achievements table
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements" 
ON public.user_achievements FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Create activity_log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity log" 
ON public.activity_log FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity log"
ON public.activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Create engagement_emails table
CREATE TABLE public.engagement_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.engagement_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own engagement emails" 
ON public.engagement_emails FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Add columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS visible_to_recruiters BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;

-- 6. Insert Seed Data for achievements
INSERT INTO public.achievements (key, title, description, icon, category, points) VALUES
('profile_master', 'Profile Master', 'Achieved 100% profile completeness.', 'UserCheck', 'profile', 50),
('resume_analyzed', 'Resume Analyst', 'Analyzed your resume for the first time.', 'FileSearch', 'tools', 20),
('linkedin_tuned', 'LinkedIn Tuner', 'Optimized your LinkedIn profile.', 'Linkedin', 'tools', 20),
('english_checked', 'English Checked', 'Assessed your English level.', 'Languages', 'tools', 20),
('first_application', 'First Application', 'Tracked your first job application.', 'Briefcase', 'career', 30),
('7_day_streak', '7-Day Streak', 'Logged in for 7 consecutive days.', 'Flame', 'engagement', 50),
('pro_member', 'Pro Member', 'Upgraded to Pro membership.', 'Star', 'engagement', 100),
('first_interest', 'Recruiter Interest', 'A recruiter expressed interest in your profile.', 'Eye', 'career', 50)
ON CONFLICT (key) DO NOTHING;

-- Trigger to update profiles on activity insert
CREATE OR REPLACE FUNCTION handle_user_activity() 
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET last_active_at = NEW.created_at
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_insert ON public.activity_log;
CREATE TRIGGER on_activity_insert
    AFTER INSERT ON public.activity_log
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_activity();
