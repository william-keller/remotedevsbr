-- Bind votes to auth.uid(), hide other users' vote rows, lock upvotes to the counter trigger.

CREATE OR REPLACE FUNCTION public.bump_project_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.maintain_project_upvotes', 'on', true);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.side_projects SET upvotes = upvotes + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.side_projects SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.project_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_project_votes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.project_votes_bind_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to vote';
  END IF;
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_votes_bind_user ON public.project_votes;
CREATE TRIGGER project_votes_bind_user
  BEFORE INSERT ON public.project_votes
  FOR EACH ROW EXECUTE FUNCTION public.project_votes_bind_user();

REVOKE ALL ON FUNCTION public.project_votes_bind_user() FROM PUBLIC, anon, authenticated;

-- Repair drift before the protect trigger starts blocking client updates of upvotes.
UPDATE public.side_projects sp
SET upvotes = sub.vote_count
FROM (
  SELECT p.id, COUNT(pv.id)::int AS vote_count
  FROM public.side_projects p
  LEFT JOIN public.project_votes pv ON pv.project_id = p.id
  GROUP BY p.id
) sub
WHERE sp.id = sub.id AND sp.upvotes IS DISTINCT FROM sub.vote_count;

CREATE OR REPLACE FUNCTION public.protect_side_project_upvotes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.upvotes IS DISTINCT FROM OLD.upvotes
     AND current_setting('app.maintain_project_upvotes', true) IS DISTINCT FROM 'on' THEN
    NEW.upvotes := OLD.upvotes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_side_project_upvotes ON public.side_projects;
CREATE TRIGGER protect_side_project_upvotes
  BEFORE UPDATE ON public.side_projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_side_project_upvotes();

REVOKE ALL ON FUNCTION public.protect_side_project_upvotes() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.project_votes
  ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Project votes read" ON public.project_votes;
DROP POLICY IF EXISTS "Project votes read own" ON public.project_votes;
CREATE POLICY "Project votes read own" ON public.project_votes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Project votes insert own" ON public.project_votes;
CREATE POLICY "Project votes insert own" ON public.project_votes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.side_projects p
    WHERE p.id = project_id AND p.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Project votes delete own" ON public.project_votes;
CREATE POLICY "Project votes delete own" ON public.project_votes
FOR DELETE TO authenticated
USING (auth.uid() = user_id);
