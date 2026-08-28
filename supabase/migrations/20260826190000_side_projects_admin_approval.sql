-- Side Projects Admin Approval Workflow Migration
-- Adds status column, sets existing projects to approved, creates index, and updates RLS policies.

ALTER TABLE public.side_projects
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for allowed status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'side_projects_status_check'
  ) THEN
    ALTER TABLE public.side_projects
    ADD CONSTRAINT side_projects_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Mark existing projects as approved so they remain visible on showcase
UPDATE public.side_projects
SET status = 'approved'
WHERE status = 'pending';

-- Create index for status and created_at ordering
CREATE INDEX IF NOT EXISTS side_projects_status_created_idx ON public.side_projects (status, created_at DESC);

-- Update RLS Policies
DROP POLICY IF EXISTS "Projects public read" ON public.side_projects;
DROP POLICY IF EXISTS "Projects select policy" ON public.side_projects;

CREATE POLICY "Projects select policy" ON public.side_projects
FOR SELECT USING (
  status = 'approved'
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Projects update own" ON public.side_projects;
DROP POLICY IF EXISTS "Projects update policy" ON public.side_projects;

CREATE POLICY "Projects update policy" ON public.side_projects
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Projects delete own or admin" ON public.side_projects;
DROP POLICY IF EXISTS "Projects delete policy" ON public.side_projects;

CREATE POLICY "Projects delete policy" ON public.side_projects
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
