-- Rate limiting for unauthenticated public AI tools and URL preview fetch.
-- RLS is enabled with no policies: only the service_role (which bypasses RLS)
-- can read or write rows, so the anon and authenticated roles have no access.
CREATE TABLE public.ai_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket text NOT NULL,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX ai_rate_limits_lookup ON public.ai_rate_limits (bucket, client_key, created_at);