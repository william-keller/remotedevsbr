-- Set search_path on remaining functions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.bump_company_votes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.companies SET upvotes = upvotes + 1 WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.companies SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.company_id;
  END IF; RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.bump_project_votes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN UPDATE public.side_projects SET upvotes = upvotes + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN UPDATE public.side_projects SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.project_id;
  END IF; RETURN NULL;
END; $$;

-- Revoke public execute on SECURITY DEFINER helpers; grant only where needed
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_pro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_company_votes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_project_votes() FROM PUBLIC, anon, authenticated;