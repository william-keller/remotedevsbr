-- Feature Toggles database table foundation
-- Allow public select so frontend can query features anonymously, but restrict writes to admin.

CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Feature toggles public read" ON public.feature_toggles;
CREATE POLICY "Feature toggles public read"
ON public.feature_toggles FOR SELECT
USING (true);

-- Allow admins to perform all operations
DROP POLICY IF EXISTS "Feature toggles admin write" ON public.feature_toggles;
CREATE POLICY "Feature toggles admin write"
ON public.feature_toggles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to touch updated_at
DROP TRIGGER IF EXISTS feature_toggles_touch ON public.feature_toggles;
CREATE TRIGGER feature_toggles_touch
  BEFORE UPDATE ON public.feature_toggles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
