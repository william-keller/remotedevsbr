-- Schedule daily pg_cron job for the Onstrider job scraper edge function.
-- Requires: pg_cron + pg_net extensions, and two database-level settings
-- configured beforehand (see "Prerequisite one-time setup" below). Values are
-- read at run time via current_setting() so no secrets are committed here.
--
-- PREREQUISITE ONE-TIME SETUP (run once in Supabase SQL Editor as a single
-- batch, replacing the placeholders):
--
--   SET "app.settings.supabase_url" = 'https://YOUR_PROJECT_REF.supabase.co';
--   SET "app.settings.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
--   ALTER DATABASE "postgres" SET "app.settings.supabase_url" = 'https://YOUR_PROJECT_REF.supabase.co';
--   ALTER DATABASE "postgres" SET "app.settings.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
--   RESET "app.settings.supabase_url";
--   RESET "app.settings.service_role_key";
--
-- The leading SET statements register the custom GUCs as placeholders in the
-- session; without them the ALTER DATABASE SET calls fail with
-- 'option "..." not recognized'. RESET drops the session-only values so the
-- persisted database defaults apply. New sessions (including each pg_cron run)
-- read them via current_setting().

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule first if it already exists (idempotent).
SELECT cron.unschedule('daily-scrape-onstrider')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-scrape-onstrider'
);

SELECT cron.schedule(
  'daily-scrape-onstrider',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scrape-onstrider',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);