-- The initial content seed ran more than once, so the seeded content tables
-- carry exact duplicate rows (same category/level/kind and title). The public
-- pages render every row, so users see each duplicated item twice. Keep the
-- oldest copy of each group, preserve user progress, and block future
-- duplicates with unique indexes.

-- Classes: consolidate class_progress from the duplicate copy onto the kept
-- copy before deleting anything (class_progress has UNIQUE (user_id, class_id)
-- and ON DELETE CASCADE, so deleting first could lose user progress).

-- Users with progress on both copies: merge into the kept row.
UPDATE public.class_progress kept_cp
SET completed = kept_cp.completed OR dup_cp.completed,
    watched_seconds = GREATEST(kept_cp.watched_seconds, dup_cp.watched_seconds),
    updated_at = now()
FROM public.class_progress dup_cp
JOIN public.classes dup ON dup.id = dup_cp.class_id
JOIN public.classes kept ON kept.id <> dup.id
  AND kept.category IS NOT DISTINCT FROM dup.category
  AND kept.title_pt = dup.title_pt
  AND (kept.created_at, kept.ctid) < (dup.created_at, dup.ctid)
WHERE kept_cp.class_id = kept.id
  AND kept_cp.user_id = dup_cp.user_id;

-- Rows left on the duplicate copy for users that also have a kept row are now
-- redundant and must go, otherwise the re-point below violates the unique
-- constraint.
DELETE FROM public.class_progress dup_cp
USING public.classes kept, public.classes dup
WHERE kept.id <> dup.id
  AND kept.category IS NOT DISTINCT FROM dup.category
  AND kept.title_pt = dup.title_pt
  AND (kept.created_at, kept.ctid) < (dup.created_at, dup.ctid)
  AND dup_cp.class_id = dup.id
  AND EXISTS (
    SELECT 1 FROM public.class_progress k
    WHERE k.class_id = kept.id AND k.user_id = dup_cp.user_id
  );

-- Progress that only exists on the duplicate: re-point it to the kept copy.
UPDATE public.class_progress cp
SET class_id = kept.id
FROM public.classes kept, public.classes dup
WHERE kept.id <> dup.id
  AND kept.category IS NOT DISTINCT FROM dup.category
  AND kept.title_pt = dup.title_pt
  AND (kept.created_at, kept.ctid) < (dup.created_at, dup.ctid)
  AND cp.class_id = dup.id;

-- Drop duplicate rows, keeping the oldest copy of each group.
DELETE FROM public.help_articles a
USING public.help_articles b
WHERE a.category = b.category
  AND a.title_pt = b.title_pt
  AND (a.created_at, a.ctid) > (b.created_at, b.ctid);

DELETE FROM public.classes a
USING public.classes b
WHERE a.category IS NOT DISTINCT FROM b.category
  AND a.title_pt = b.title_pt
  AND (a.created_at, a.ctid) > (b.created_at, b.ctid);

DELETE FROM public.resources a
USING public.resources b
WHERE a.kind = b.kind
  AND a.title_pt = b.title_pt
  AND (a.created_at, a.ctid) > (b.created_at, b.ctid);

DELETE FROM public.english_lessons a
USING public.english_lessons b
WHERE a.level IS NOT DISTINCT FROM b.level
  AND a.title_pt = b.title_pt
  AND (a.created_at, a.ctid) > (b.created_at, b.ctid);

-- Prevent the same content from being inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS help_articles_category_title_key
  ON public.help_articles (category, title_pt);

CREATE UNIQUE INDEX IF NOT EXISTS classes_category_title_key
  ON public.classes (category, title_pt);

CREATE UNIQUE INDEX IF NOT EXISTS resources_kind_title_key
  ON public.resources (kind, title_pt);

CREATE UNIQUE INDEX IF NOT EXISTS english_lessons_level_title_key
  ON public.english_lessons (level, title_pt);
