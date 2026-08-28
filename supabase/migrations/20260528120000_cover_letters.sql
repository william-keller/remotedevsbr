CREATE TABLE public.cover_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  target_role TEXT,
  job_description TEXT,
  resume_snippet TEXT,
  tone TEXT NOT NULL DEFAULT 'confident',
  language TEXT NOT NULL DEFAULT 'en',
  template_id TEXT,
  generated_text TEXT,
  keyword_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  csat_rating SMALLINT CHECK (csat_rating IS NULL OR (csat_rating >= 1 AND csat_rating <= 5)),
  csat_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cover letters read own"
ON public.cover_letters FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Cover letters admin read all"
ON public.cover_letters FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cover_letters_updated
BEFORE UPDATE ON public.cover_letters
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_cover_letters_email ON public.cover_letters(email);
CREATE INDEX idx_cover_letters_user ON public.cover_letters(user_id);
