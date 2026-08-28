-- Migration: Recruiter Monetization System
-- Adds tables and policies for recruiter functionality

-- 1. Create recruiter_profiles table
CREATE TABLE public.recruiter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    company_logo_url TEXT,
    company_website TEXT,
    company_size TEXT,
    industry TEXT,
    hiring_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    roles_hiring TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for recruiter profiles" 
ON public.recruiter_profiles FOR SELECT 
USING (true);

CREATE POLICY "Recruiters can update own profile" 
ON public.recruiter_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert recruiter profiles"
ON public.recruiter_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Create recruiter_subscriptions table
CREATE TABLE public.recruiter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL UNIQUE REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    candidate_views_remaining INTEGER DEFAULT 0,
    candidate_contacts_remaining INTEGER DEFAULT 0,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recruiter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can read own subscription" 
ON public.recruiter_subscriptions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.recruiter_profiles
        WHERE id = recruiter_subscriptions.recruiter_id AND user_id = auth.uid()
    )
);

-- 3. Create candidate_interests table
CREATE TABLE public.candidate_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'interested',
    message TEXT,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(recruiter_id, candidate_id)
);

ALTER TABLE public.candidate_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can see own sent interests" 
ON public.candidate_interests FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.recruiter_profiles
        WHERE id = candidate_interests.recruiter_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Candidates can see interests directed to them" 
ON public.candidate_interests FOR SELECT 
USING (auth.uid() = candidate_id);

CREATE POLICY "Recruiters can insert interests"
ON public.candidate_interests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recruiter_profiles
        WHERE id = candidate_interests.recruiter_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Candidates can update response"
ON public.candidate_interests FOR UPDATE
USING (auth.uid() = candidate_id);

-- 4. Create candidate_searches table
CREATE TABLE public.candidate_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE,
    filters JSONB DEFAULT '{}'::jsonb,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.candidate_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can read own searches" 
ON public.candidate_searches FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.recruiter_profiles
        WHERE id = candidate_searches.recruiter_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Recruiters can insert searches"
ON public.candidate_searches FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recruiter_profiles
        WHERE id = candidate_searches.recruiter_id AND user_id = auth.uid()
    )
);

-- Triggers for updated_at
CREATE TRIGGER recruiter_profiles_touch
    BEFORE UPDATE ON public.recruiter_profiles
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER recruiter_subscriptions_touch
    BEFORE UPDATE ON public.recruiter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER candidate_interests_touch
    BEFORE UPDATE ON public.candidate_interests
    FOR EACH ROW
    EXECUTE FUNCTION touch_updated_at();

-- Add recruiter app role to the enum if needed
-- To modify an enum safely, we add the value if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'member', 'recruiter');
    ELSE
        BEGIN
            ALTER TYPE app_role ADD VALUE 'recruiter';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists
        END;
    END IF;
END
$$;
