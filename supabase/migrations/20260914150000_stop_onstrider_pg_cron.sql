-- Stop pg_cron scheduling of the Onstrider job scraper.
-- The daily trigger moved to Vercel Cron (vercel.json + the
-- /api/cron/scrape-onstrider route), so auth secrets no longer live in the
-- database. Removes the previously scheduled job if it exists.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('daily-scrape-onstrider')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-scrape-onstrider');
  END IF;
END $$;