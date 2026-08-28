
-- Jobs: add submitter & source
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

-- Allow Pro members to insert jobs (auto-published)
DROP POLICY IF EXISTS "Jobs pro members insert" ON public.jobs;
CREATE POLICY "Jobs pro members insert"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = submitted_by
  AND public.is_pro(auth.uid())
  AND source = 'member'
);

-- Allow members to update/delete only their own submissions
DROP POLICY IF EXISTS "Jobs own update" ON public.jobs;
CREATE POLICY "Jobs own update"
ON public.jobs FOR UPDATE TO authenticated
USING (auth.uid() = submitted_by)
WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Jobs own delete" ON public.jobs;
CREATE POLICY "Jobs own delete"
ON public.jobs FOR DELETE TO authenticated
USING (auth.uid() = submitted_by);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars policies (public read, own write)
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars own insert" ON storage.objects;
CREATE POLICY "Avatars own insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Avatars own update" ON storage.objects;
CREATE POLICY "Avatars own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Avatars own delete" ON storage.objects;
CREATE POLICY "Avatars own delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Resumes policies (private, owner only)
DROP POLICY IF EXISTS "Resumes own read" ON storage.objects;
CREATE POLICY "Resumes own read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Resumes own insert" ON storage.objects;
CREATE POLICY "Resumes own insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Resumes own update" ON storage.objects;
CREATE POLICY "Resumes own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Resumes own delete" ON storage.objects;
CREATE POLICY "Resumes own delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Stripe customer/subscription tracking
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'free',
  plan text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscribers read own" ON public.subscribers;
CREATE POLICY "Subscribers read own"
ON public.subscribers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER subscribers_touch
BEFORE UPDATE ON public.subscribers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
