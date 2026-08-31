-- Remove the company blacklist feature.
-- The list_type column ('golden'/'black') and its enum are no longer used;
-- companies are now a single curated "hiring Brazilians" list.

-- 1. Delete placeholder blacklist entries. They only exist to demo the
--    removed concept and should not surface on the public companies page.
DELETE FROM public.companies WHERE list_type = 'black';

-- 2. Drop the list_type column (the remaining rows are all the curated list).
ALTER TABLE public.companies DROP COLUMN IF EXISTS list_type;

-- 3. Drop the now-unused enum type.
DROP TYPE IF EXISTS public.company_list_type;
