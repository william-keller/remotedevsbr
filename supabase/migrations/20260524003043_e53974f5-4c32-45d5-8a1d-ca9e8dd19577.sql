
CREATE TABLE public.resume_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT,
  file_name TEXT,
  resume_text TEXT,
  partial JSONB NOT NULL DEFAULT '{}'::jsonb,
  full_report JSONB,
  email_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;

-- Owners (logged-in) can read their own analyses
CREATE POLICY "Analyses read own"
ON public.resume_analyses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all
CREATE POLICY "Analyses admin read all"
ON public.resume_analyses FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_resume_analyses_updated
BEFORE UPDATE ON public.resume_analyses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_resume_analyses_email ON public.resume_analyses(email);
CREATE INDEX idx_resume_analyses_user ON public.resume_analyses(user_id);
