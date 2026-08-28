-- Allow any authenticated user to upvote by running the counter trigger as definer.
-- Without SECURITY DEFINER, only project owners/admins can update side_projects.upvotes.

CREATE OR REPLACE FUNCTION public.bump_project_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.side_projects SET upvotes = upvotes + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.side_projects SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_project_votes() FROM PUBLIC, anon, authenticated;
