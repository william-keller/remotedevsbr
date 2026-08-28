-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.locale AS ENUM ('pt', 'en');
CREATE TYPE public.subscription_status AS ENUM ('free', 'pro', 'canceled');
CREATE TYPE public.application_status AS ENUM ('saved', 'applied', 'interviewing', 'offer', 'rejected');
CREATE TYPE public.company_list_type AS ENUM ('golden', 'black');
CREATE TYPE public.resource_kind AS ENUM ('article', 'link', 'pdf', 'sheet', 'video');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  locale public.locale NOT NULL DEFAULT 'pt',
  english_level TEXT,
  stack TEXT[],
  goals TEXT,
  bio TEXT,
  subscription_status public.subscription_status NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_pro(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND subscription_status = 'pro'
  )
$$;

-- =========================================================
-- TRIGGER: new user -> profile + member role
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- JOURNEY
-- =========================================================
CREATE TABLE public.journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  position INT NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.journey_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.journey_stages(id) ON DELETE CASCADE,
  position INT NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_pt TEXT,
  body_en TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.journey_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_id)
);
ALTER TABLE public.journey_progress ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RESOURCES (articles/links/pdfs/sheets)
-- =========================================================
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.resource_kind NOT NULL DEFAULT 'article',
  category TEXT,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_pt TEXT,
  summary_en TEXT,
  content_pt TEXT,
  content_en TEXT,
  url TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- CLASSES (recorded video classes)
-- =========================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  video_url TEXT NOT NULL,
  duration_min INT,
  is_pro BOOLEAN NOT NULL DEFAULT true,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.class_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  watched_seconds INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id)
);
ALTER TABLE public.class_progress ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- ENGLISH LESSONS
-- =========================================================
CREATE TABLE public.english_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_pt TEXT,
  body_en TEXT,
  audio_url TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.english_lessons ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- HELP ARTICLES (interview prep & help center)
-- =========================================================
CREATE TABLE public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_pt TEXT,
  body_en TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- JOBS
-- =========================================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  seniority TEXT,
  stack TEXT[],
  comp_min INT,
  comp_max INT,
  comp_currency TEXT DEFAULT 'USD',
  location TEXT DEFAULT 'Remote',
  description TEXT,
  apply_url TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status public.application_status NOT NULL DEFAULT 'saved',
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- COMPANIES (golden/black list)
-- =========================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_type public.company_list_type NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  description_pt TEXT,
  description_en TEXT,
  tags TEXT[],
  hiring BOOLEAN DEFAULT false,
  upvotes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
ALTER TABLE public.company_votes ENABLE ROW LEVEL SECURITY;

-- Maintain upvote count
CREATE OR REPLACE FUNCTION public.bump_company_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.companies SET upvotes = upvotes + 1 WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.companies SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER company_votes_count
  AFTER INSERT OR DELETE ON public.company_votes
  FOR EACH ROW EXECUTE FUNCTION public.bump_company_votes();

-- =========================================================
-- SIDE PROJECTS
-- =========================================================
CREATE TABLE public.side_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  url TEXT,
  image_url TEXT,
  stack TEXT[],
  upvotes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.side_projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.side_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);
ALTER TABLE public.project_votes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_project_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.side_projects SET upvotes = upvotes + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.side_projects SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER project_votes_count
  AFTER INSERT OR DELETE ON public.project_votes
  FOR EACH ROW EXECUTE FUNCTION public.bump_project_votes();

-- =========================================================
-- RESUMES (AI-built)
-- =========================================================
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My resume',
  target_role TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_markdown TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER resumes_touch BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles: owner can read/update their own; anyone authenticated can read basic profile
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: admin read all" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: user can read own; admin manages all
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Roles: admin all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public catalog (anyone can read): journey, resources, classes, lessons, help, jobs, companies, side_projects
CREATE POLICY "Stages public read" ON public.journey_stages FOR SELECT USING (true);
CREATE POLICY "Stages admin write" ON public.journey_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Steps public read" ON public.journey_steps FOR SELECT USING (true);
CREATE POLICY "Steps admin write" ON public.journey_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Resources public read" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Resources admin write" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Classes public read" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Classes admin write" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "English public read" ON public.english_lessons FOR SELECT USING (true);
CREATE POLICY "English admin write" ON public.english_lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Help public read" ON public.help_articles FOR SELECT USING (true);
CREATE POLICY "Help admin write" ON public.help_articles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Jobs public read" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Jobs admin write" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Companies public read" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Companies admin write" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Projects public read" ON public.side_projects FOR SELECT USING (true);
CREATE POLICY "Projects insert own" ON public.side_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects update own" ON public.side_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Projects delete own or admin" ON public.side_projects FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Per-user tables
CREATE POLICY "Journey progress own" ON public.journey_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Class progress own" ON public.class_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Applications own" ON public.applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Resumes own" ON public.resumes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Votes
CREATE POLICY "Company votes read" ON public.company_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Company votes insert own" ON public.company_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Company votes delete own" ON public.company_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Project votes read" ON public.project_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Project votes insert own" ON public.project_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Project votes delete own" ON public.project_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- SEED DATA
-- =========================================================

-- Journey stages
INSERT INTO public.journey_stages (slug, position, title_pt, title_en, description_pt, description_en, icon) VALUES
('foundations', 1, 'Fundamentos', 'Foundations', 'Prepare a base: mentalidade, expectativas e o panorama do trabalho remoto para empresas dos EUA.', 'Set the base: mindset, expectations and the landscape of remote work for US companies.', 'Compass'),
('english', 2, 'Inglês', 'English', 'Atinja o nível de inglês necessário para entrevistas e o dia a dia.', 'Reach the English level needed for interviews and daily work.', 'Languages'),
('resume', 3, 'Currículo', 'Resume', 'Construa um currículo no padrão americano, otimizado para ATS.', 'Build an American-style ATS-optimized resume.', 'FileText'),
('portfolio', 4, 'Portfólio & LinkedIn', 'Portfolio & LinkedIn', 'Mostre seu trabalho e ajuste sua presença online.', 'Show your work and tune your online presence.', 'Globe'),
('applying', 5, 'Aplicando', 'Applying', 'Estratégia de candidaturas: onde, como e em que ritmo.', 'Application strategy: where, how, and at what pace.', 'Send'),
('interviewing', 6, 'Entrevistas', 'Interviewing', 'Behavioral, system design, coding e cultura.', 'Behavioral, system design, coding and culture.', 'MessagesSquare'),
('negotiating', 7, 'Negociação', 'Negotiating', 'Negocie salário, benefícios e contrato (PJ x CLT x EOR).', 'Negotiate salary, benefits and contract (PJ vs CLT vs EOR).', 'Scale'),
('onboarding', 8, 'Onboarding & Crescimento', 'Onboarding & Growth', 'Comece bem e cresça na empresa estrangeira.', 'Start well and grow inside the foreign company.', 'Rocket');

-- Steps (3 per stage as a starter)
WITH s AS (SELECT id, slug FROM public.journey_stages)
INSERT INTO public.journey_steps (stage_id, position, title_pt, title_en, body_pt, body_en, is_pro)
SELECT s.id, 1,
  CASE s.slug
    WHEN 'foundations' THEN 'Por que mirar nos EUA' WHEN 'english' THEN 'Diagnóstico de nível'
    WHEN 'resume' THEN 'Estrutura ATS' WHEN 'portfolio' THEN 'GitHub e site pessoal'
    WHEN 'applying' THEN 'Lista de empresas alvo' WHEN 'interviewing' THEN 'Behavioral & STAR'
    WHEN 'negotiating' THEN 'Pesquisa de mercado' WHEN 'onboarding' THEN 'Primeiros 30 dias'
  END,
  CASE s.slug
    WHEN 'foundations' THEN 'Why aim at the US' WHEN 'english' THEN 'Level assessment'
    WHEN 'resume' THEN 'ATS structure' WHEN 'portfolio' THEN 'GitHub and personal site'
    WHEN 'applying' THEN 'Target company list' WHEN 'interviewing' THEN 'Behavioral & STAR'
    WHEN 'negotiating' THEN 'Market research' WHEN 'onboarding' THEN 'First 30 days'
  END,
  'Conteúdo introdutório desta etapa.', 'Intro content for this step.', false
FROM s;

WITH s AS (SELECT id, slug FROM public.journey_stages)
INSERT INTO public.journey_steps (stage_id, position, title_pt, title_en, body_pt, body_en, is_pro)
SELECT s.id, 2,
  'Passo 2: ' || s.slug, 'Step 2: ' || s.slug,
  'Aprofundamento prático.', 'Practical deep dive.', false
FROM s;

WITH s AS (SELECT id, slug FROM public.journey_stages)
INSERT INTO public.journey_steps (stage_id, position, title_pt, title_en, body_pt, body_en, is_pro)
SELECT s.id, 3,
  'Passo 3: ' || s.slug, 'Step 3: ' || s.slug,
  'Exercícios e checklist final.', 'Exercises and final checklist.', true
FROM s;

-- Resources
INSERT INTO public.resources (kind, category, title_pt, title_en, summary_pt, summary_en, url, is_pro) VALUES
('article','resume','Modelo de currículo ATS','ATS resume template','Modelo limpo, focado em conversão.','Clean, conversion-focused template.', NULL, false),
('sheet','tools','Planilha de tracking de aplicações','Application tracking sheet','Acompanhe candidaturas, follow-ups e status.','Track applications, follow-ups and status.', 'https://docs.google.com/spreadsheets', false),
('pdf','interview','Guia de behavioral interview','Behavioral interview guide','Perguntas mais comuns e respostas STAR.','Most common questions and STAR answers.', NULL, true),
('link','english','Anki deck de vocabulário tech','Tech vocabulary Anki deck','500 termos essenciais.','500 essential terms.', 'https://ankiweb.net', false),
('article','negotiation','Como pedir aumento em USD','How to ask for a raise in USD','Scripts e benchmarks.','Scripts and benchmarks.', NULL, true);

-- Classes
INSERT INTO public.classes (category, title_pt, title_en, description_pt, description_en, video_url, duration_min, is_pro) VALUES
('foundations','Visão geral do mercado remoto US','Remote US market overview','Panorama de 2026.','2026 landscape.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, false),
('resume','Construindo um currículo ATS','Building an ATS resume','Workshop completo.','Full workshop.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 42, true),
('interview','System design para mid-level','System design for mid-level','Padrões essenciais.','Essential patterns.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 55, true),
('english','English for standups','English for standups','Frases prontas e prática.','Ready-made phrases and practice.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, true);

-- English lessons
INSERT INTO public.english_lessons (level, title_pt, title_en, body_pt, body_en, is_pro) VALUES
('B1','Apresentação pessoal','Self introduction','Pratique sua intro de 60s.','Practice your 60s intro.', false),
('B2','Vocabulário de code review','Code review vocabulary','Termos comuns em PRs.','Common PR terms.', true),
('C1','Negociando em inglês','Negotiating in English','Linguagem assertiva e educada.','Assertive yet polite language.', true);

-- Help articles
INSERT INTO public.help_articles (category, title_pt, title_en, body_pt, body_en, is_pro) VALUES
('interview','Como responder "Tell me about yourself"','How to answer "Tell me about yourself"','Estrutura presente-passado-futuro.','Present-past-future structure.', false),
('interview','Top 20 perguntas behavioral','Top 20 behavioral questions','Lista comentada.','Annotated list.', true),
('legal','PJ vs CLT vs EOR','PJ vs CLT vs EOR','Comparativo prático.','Practical comparison.', false),
('faq','Como usar a plataforma','How to use the platform','Tour rápido.','Quick tour.', false);

-- Jobs
INSERT INTO public.jobs (company_name, role, seniority, stack, comp_min, comp_max, description, apply_url) VALUES
('Vercel','Senior Frontend Engineer','Senior', ARRAY['React','Next.js','TypeScript'], 140000, 180000, 'Build the future of the web.', 'https://vercel.com/careers'),
('GitLab','Backend Engineer','Mid', ARRAY['Ruby','Go','Postgres'], 110000, 150000, 'All-remote since day one.', 'https://about.gitlab.com/jobs/'),
('Doist','Full-stack Engineer','Senior', ARRAY['Python','React'], 120000, 160000, 'Async-first remote culture.', 'https://doist.com/careers'),
('Automattic','Code Wrangler','Mid', ARRAY['PHP','JavaScript'], 100000, 140000, 'Makers of WordPress.com.', 'https://automattic.com/work-with-us/');

-- Companies (golden + black)
INSERT INTO public.companies (list_type, name, website, description_pt, description_en, tags, hiring) VALUES
('golden','Vercel','https://vercel.com','Contrata BR via EOR. Cultura forte.','Hires BR via EOR. Strong culture.', ARRAY['EOR','frontend'], true),
('golden','GitLab','https://gitlab.com','100% remoto, contrata via Deel.','100% remote, hires via Deel.', ARRAY['all-remote'], true),
('golden','Doist','https://doist.com','Async-first, paga em USD.','Async-first, pays in USD.', ARRAY['async','EOR'], true),
('golden','Automattic','https://automattic.com','Trial pago, contrata BR.','Paid trial, hires BR.', ARRAY['EOR'], true),
('black','Acme Co (placeholder)',NULL,'Não respondeu candidatos por meses.','Ghosted candidates for months.', ARRAY['no-feedback'], false),
('black','XYZ Inc (placeholder)',NULL,'Processo abusivo (8+ etapas).','Abusive process (8+ stages).', ARRAY['long-process'], false);