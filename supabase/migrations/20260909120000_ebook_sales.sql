-- =========================================================
-- EBOOK SALES
-- =========================================================

-- One row per completed ebook checkout. Written by the stripe-webhook edge
-- function (service role). RLS is enabled with no client policies, so the
-- anon/authenticated roles cannot read raw rows (no personal data exposure);
-- public counters go through get_ebook_sales_summary() below.
CREATE TABLE public.ebook_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  customer_email TEXT,
  currency TEXT NOT NULL CHECK (currency IN ('brl', 'usd')),
  amount_cents INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ebook_sales ENABLE ROW LEVEL SECURITY;

-- Aggregate sales summary exposed to the anon key for the /ebook counters.
-- Returns counts and revenue per currency only, never personal data.
CREATE OR REPLACE FUNCTION public.get_ebook_sales_summary()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_copies', (SELECT count(*)::int FROM public.ebook_sales),
    'today_copies', (SELECT count(*)::int FROM public.ebook_sales
      WHERE created_at >= (now() AT TIME ZONE 'utc')::date),
    'total_brl_cents', (SELECT COALESCE(sum(amount_cents), 0)::int FROM public.ebook_sales
      WHERE currency = 'brl'),
    'total_usd_cents', (SELECT COALESCE(sum(amount_cents), 0)::int FROM public.ebook_sales
      WHERE currency = 'usd'),
    'today_brl_cents', (SELECT COALESCE(sum(amount_cents), 0)::int FROM public.ebook_sales
      WHERE currency = 'brl' AND created_at >= (now() AT TIME ZONE 'utc')::date),
    'today_usd_cents', (SELECT COALESCE(sum(amount_cents), 0)::int FROM public.ebook_sales
      WHERE currency = 'usd' AND created_at >= (now() AT TIME ZONE 'utc')::date)
  );
$$;

REVOKE ALL ON FUNCTION public.get_ebook_sales_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ebook_sales_summary() TO anon, authenticated;

-- Baseline: 3 copies already sold before the counter launched (all BRL).
INSERT INTO public.ebook_sales (stripe_session_id, customer_email, currency, amount_cents) VALUES
  ('seed-1', NULL, 'brl', 6790),
  ('seed-2', NULL, 'brl', 6790),
  ('seed-3', NULL, 'brl', 6790);