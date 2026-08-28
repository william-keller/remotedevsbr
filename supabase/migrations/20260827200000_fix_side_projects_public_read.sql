-- Fix anonymous read access for approved side projects.
-- The combined SELECT policy called has_role(), which anon cannot execute.

DROP POLICY IF EXISTS "Projects select policy" ON public.side_projects;

CREATE POLICY "Projects read approved" ON public.side_projects
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Projects read own" ON public.side_projects
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Projects read admin" ON public.side_projects
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
