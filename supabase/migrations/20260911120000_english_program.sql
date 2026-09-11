-- =========================================================
-- ENGLISH PROGRAM LEADS
-- =========================================================

-- One row per English program interest form submission. Written by the
-- english-lead edge function (service role). RLS is enabled with no client
-- policies, so neither anon nor authenticated clients can read raw rows (no
-- personal data exposure). Frontend only submits; it never reads back.
CREATE TABLE public.english_program_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_type TEXT NOT NULL CHECK (interest_type IN ('career', 'start', 'global', 'squad', 'team')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  current_level TEXT NOT NULL CHECK (current_level IN ('beginner', 'intermediate', 'upper_intermediate', 'advanced', 'unsure')),
  schedule_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.english_program_leads ENABLE ROW LEVEL SECURITY;