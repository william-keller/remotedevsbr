-- Create FAQ voting table
CREATE TABLE public.faq_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faq_id TEXT NOT NULL,
  tool_name TEXT NOT NULL DEFAULT 'cover-letter',
  vote BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and add policy for insertion
ALTER TABLE public.faq_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQ votes insert anyone" 
  ON public.faq_votes FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- Create a secure view for public reviews to avoid exposing sensitive candidate details (resumes, job descriptions, emails)
CREATE OR REPLACE VIEW public.public_cover_letter_reviews AS
  SELECT id, csat_rating, csat_comment, target_role, created_at
  FROM public.cover_letters
  WHERE csat_rating >= 4 AND csat_comment IS NOT NULL AND csat_comment != '';

-- Grant select permission on the view
GRANT SELECT ON public.public_cover_letter_reviews TO anon, authenticated;

-- Enable users to update and delete their own cover letters
CREATE POLICY "Cover letters update own"
  ON public.cover_letters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Cover letters delete own"
  ON public.cover_letters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
