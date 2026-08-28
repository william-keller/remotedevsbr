-- =========================================================
-- MOCK INTERVIEW SYSTEM
-- =========================================================

-- Packages (admin-configurable pricing tiers)
CREATE TABLE public.mock_interview_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_pt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  session_count INT NOT NULL DEFAULT 1,
  price_cents INT NOT NULL,
  discount_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_interview_packages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mock_interview_packages_touch BEFORE UPDATE ON public.mock_interview_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Interviewers (multiple people can conduct interviews)
CREATE TABLE public.mock_interview_interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  bio_pt TEXT,
  bio_en TEXT,
  avatar_url TEXT,
  specialties TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_interview_interviewers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mock_interview_interviewers_touch BEFORE UPDATE ON public.mock_interview_interviewers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Purchases (user buys a package of credits)
CREATE TABLE public.mock_interview_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.mock_interview_packages(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  sessions_total INT NOT NULL DEFAULT 1,
  sessions_used INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_interview_purchases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mock_interview_purchases_touch BEFORE UPDATE ON public.mock_interview_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Availability (admin sets 1-hour slots per interviewer)
CREATE TABLE public.mock_interview_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interviewer_id UUID NOT NULL REFERENCES public.mock_interview_interviewers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_interview_availability ENABLE ROW LEVEL SECURITY;

-- Appointments (booked sessions)
CREATE TABLE public.mock_interview_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.mock_interview_purchases(id) ON DELETE CASCADE,
  availability_id UUID NOT NULL REFERENCES public.mock_interview_availability(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES public.mock_interview_interviewers(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  admin_notes TEXT,
  instructions TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mock_interview_appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mock_interview_appointments_touch BEFORE UPDATE ON public.mock_interview_appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Packages: public read active, admin full CRUD
CREATE POLICY "MockPkg public read" ON public.mock_interview_packages
  FOR SELECT USING (true);
CREATE POLICY "MockPkg admin write" ON public.mock_interview_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Interviewers: public read active, admin full CRUD
CREATE POLICY "MockInterviewer public read" ON public.mock_interview_interviewers
  FOR SELECT USING (true);
CREATE POLICY "MockInterviewer admin write" ON public.mock_interview_interviewers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Purchases: user reads own, admin reads all
CREATE POLICY "MockPurchase read own" ON public.mock_interview_purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "MockPurchase insert own" ON public.mock_interview_purchases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "MockPurchase admin update" ON public.mock_interview_purchases
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Availability: public read, admin write
CREATE POLICY "MockAvail public read" ON public.mock_interview_availability
  FOR SELECT USING (true);
CREATE POLICY "MockAvail admin write" ON public.mock_interview_availability
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Appointments: user reads own, admin full CRUD
CREATE POLICY "MockAppt read own" ON public.mock_interview_appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "MockAppt insert own" ON public.mock_interview_appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "MockAppt update" ON public.mock_interview_appointments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "MockAppt admin delete" ON public.mock_interview_appointments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SEED DATA: default packages
-- =========================================================
INSERT INTO public.mock_interview_packages (name_pt, name_en, description_pt, description_en, session_count, price_cents, discount_label, sort_order) VALUES
  ('Sessao Avulsa', 'Single Session', '1 sessao de mock interview de 60 minutos com feedback personalizado.', '1 x 60-minute mock interview session with personalized feedback.', 1, 14900, NULL, 1),
  ('Pacote 3 Sessoes', '3-Session Pack', '3 sessoes de mock interview de 60 minutos. Ideal para pratica completa.', '3 x 60-minute mock interview sessions. Ideal for thorough practice.', 3, 39900, 'ECONOMIZE 7%', 2),
  ('Pacote 5 Sessoes', '5-Session Pack', '5 sessoes de mock interview de 60 minutos. Melhor custo-beneficio.', '5 x 60-minute mock interview sessions. Best value.', 5, 64900, 'ECONOMIZE 13%', 3);
