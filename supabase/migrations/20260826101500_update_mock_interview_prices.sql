-- Update default prices and discounts for mock interview packages based on R$ 150/session interviewer cost

-- 1 session: R$ 269 (26900 cents) -> Profit R$ 119/session (44% margin)
UPDATE public.mock_interview_packages
SET price_cents = 26900,
    discount_label = NULL,
    updated_at = now()
WHERE session_count = 1;

-- 3 sessions: R$ 699 (69900 cents) (~R$ 233/session) -> Profit R$ 249 total (36% margin)
UPDATE public.mock_interview_packages
SET price_cents = 69900,
    discount_label = 'ECONOMIZE 13%',
    updated_at = now()
WHERE session_count = 3;

-- 5 sessions: R$ 1.099 (109900 cents) (~R$ 220/session) -> Profit R$ 349 total (32% margin)
UPDATE public.mock_interview_packages
SET price_cents = 109900,
    discount_label = 'ECONOMIZE 18%',
    updated_at = now()
WHERE session_count = 5;
