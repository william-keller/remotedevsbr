-- Schedule daily pg_cron job for the Onstrider job scraper edge function.
-- Requires: pg_cron, pg_net extensions enabled, and database settings configured.
--
-- BEFORE RUNNING, set the database settings (run once in SQL Editor):
--   ALTER DATABASE SET "app.settings.supabase_url" = 'https://YOUR_PROJECT_REF.supabase.co';
--   ALTER DATABASE SET "app.settings.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
--
-- The settings persist across restarts and are encrypted at rest in Supabase.

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
