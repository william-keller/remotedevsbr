-- Job submission admin approval: let users read their own submissions.
-- The existing "Jobs public read" policy only allows published+active rows, so
-- submitters need a policy to view their own pending/rejected jobs in the
-- "Your Submissions" section (mirrors the side_projects flow).
DROP POLICY IF EXISTS "Jobs own read" ON public.jobs;
CREATE POLICY "Jobs own read"
ON public.jobs FOR SELECT TO authenticated
USING (auth.uid() = submitted_by);

-- Add the "rejected" state to job_status so moderators can mark submissions.
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'rejected';
