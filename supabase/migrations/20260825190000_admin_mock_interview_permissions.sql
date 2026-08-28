-- RLS permissions update for Admin management of mock interview purchases & appointments

-- Purchases policies for admin
DROP POLICY IF EXISTS "MockPurchase insert own" ON public.mock_interview_purchases;
CREATE POLICY "MockPurchase insert" ON public.mock_interview_purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "MockPurchase admin delete" ON public.mock_interview_purchases;
CREATE POLICY "MockPurchase admin delete" ON public.mock_interview_purchases
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Appointments policies for admin
DROP POLICY IF EXISTS "MockAppt insert own" ON public.mock_interview_appointments;
CREATE POLICY "MockAppt insert" ON public.mock_interview_appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
