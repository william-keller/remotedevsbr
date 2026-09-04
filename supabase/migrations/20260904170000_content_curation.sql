-- Content curation pass for the seeded content tables.
--
-- Goals:
--   1. Replace placeholder / rickroll class videos with real, embeddable,
--      publicly available YouTube content that matches each title.
--   2. Give every resource a working external URL so it never falls back to
--      the "Conteudo em breve" toast, and expand the catalog with high-value,
--      free, verified links.
--   3. Expand the curated companies list with more remote-first companies that
--      are known to hire Brazilian developers, and refresh the hiring flags
--      on the existing seed rows.
--
-- All URLs were verified at authoring time. Nothing here uses placeholder data.
-- Inserts are guarded so the migration is safe to apply against a database that
-- already contains some of this content (via unique indexes or NOT EXISTS).

-- ---------------------------------------------------------
-- CLASSES: point the seeded videos at real content.
-- The original seed used one placeholder URL (dQw4w9WgXcQ) for every class.
-- ---------------------------------------------------------

-- Free class: BR dev going remote overview (Lucas Siqueira, 2026 market guide).
UPDATE public.classes
SET video_url = 'https://www.youtube.com/embed/dH0OKAa-ewo',
    thumbnail_url = 'https://i.ytimg.com/vi/dH0OKAa-ewo/hqdefault.jpg'
WHERE category = 'foundations'
  AND title_pt = 'Visão geral do mercado remoto US';

-- Pro class: ATS resume (Jeff Su "Write an Incredible Resume: 5 Golden Rules").
UPDATE public.classes
SET video_url = 'https://www.youtube.com/embed/Tt08KmFfIYQ',
    thumbnail_url = 'https://i.ytimg.com/vi/Tt08KmFfIYQ/hqdefault.jpg'
WHERE category = 'resume'
  AND title_pt = 'Construindo um currículo ATS';

-- Pro class: System design (ByteByteGo: a step-by-step interview framework).
UPDATE public.classes
SET video_url = 'https://www.youtube.com/embed/i7twT3x5yv8',
    thumbnail_url = 'https://i.ytimg.com/vi/i7twT3x5yv8/hqdefault.jpg'
WHERE category = 'interview'
  AND title_pt = 'System design para mid-level';

-- Pro class: English for standups (EnglishNotNull: a real daily standup).
UPDATE public.classes
SET video_url = 'https://www.youtube.com/embed/MsxcpZr1LpM',
    thumbnail_url = 'https://i.ytimg.com/vi/MsxcpZr1LpM/hqdefault.jpg'
WHERE category = 'english'
  AND title_pt = 'English for standups';

-- Add new classes to fill categories that had no content at all.
-- (portfolio, applying, interviewing, negotiating). Unique on (category, title_pt).
INSERT INTO public.classes
  (category, title_pt, title_en, description_pt, description_en, video_url, duration_min, is_pro, thumbnail_url)
VALUES
  ('portfolio', 'Otimizando seu LinkedIn como dev', 'Optimizing your LinkedIn as a dev',
   'Perfil que recrutadores encontram: headline, about e projetos.', 'A profile recruiters find: headline, about and projects.',
   'https://www.youtube.com/embed/5mkr5DXV-IQ', 12, false,
   'https://i.ytimg.com/vi/5mkr5DXV-IQ/hqdefault.jpg'),
  ('negotiating', 'Como negociar salário em dólar', 'How to negotiate salary in USD',
   'Dicas de ex-recrutadora FAANG sobre expectativa salarial e pedir mais.', 'Ex-FAANG recruiter tips on expectations and asking for more.',
   'https://www.youtube.com/embed/u9BoG1n1948', 12, true,
   'https://i.ytimg.com/vi/u9BoG1n1948/hqdefault.jpg'),
  ('interviewing', 'Behavioral interview com STAR', 'Behavioral interviews with STAR',
   'Estruture respostas com Situação, Tarefa, Ação e Resultado.', 'Structure answers with Situation, Task, Action, Result.',
   'https://www.youtube.com/embed/xulpDyBxDgk', 10, false,
   'https://i.ytimg.com/vi/xulpDyBxDgk/hqdefault.jpg'),
  ('applying', 'Empresas contratando devs BR em 2026', 'Companies hiring BR devs in 2026',
   'Onde aplicar direto e quais empresas estão contratando agora.', 'Where to apply directly and which companies are hiring now.',
   'https://www.youtube.com/embed/fRH9sMXdv7Y', 20, false,
   'https://i.ytimg.com/vi/fRH9sMXdv7Y/hqdefault.jpg')
ON CONFLICT (category, title_pt) DO NOTHING;

-- ---------------------------------------------------------
-- RESOURCES: replace NULL-url rows with working links and add more.
-- ---------------------------------------------------------

-- Give the two NULL-url seed rows real destinations.
UPDATE public.resources SET url = 'https://resumeworded.com/'
WHERE kind = 'article' AND title_pt = 'Modelo de currículo ATS';

UPDATE public.resources SET url = 'https://www.themuse.com/advice/star-interview-method'
WHERE kind = 'pdf' AND title_pt = 'Guia de behavioral interview';

INSERT INTO public.resources
  (kind, category, title_pt, title_en, summary_pt, summary_en, url, is_pro)
VALUES
  ('link', 'english', 'Pratique entrevistas em inglês (grátis)', 'Practice English interviews (free)',
   'Simulações de entrevista com peer, agora gratuitas via Exponent.', 'Peer interview simulations, now free via Exponent.',
   'https://www.pramp.com', false),
  ('article', 'salary', 'Referência de salários para dev remoto', 'Salary benchmark for remote devs',
   'Dados de compensação reais por cargo, nível e região.', 'Real compensation data by role, level and region.',
   'https://www.levels.fyi/t/software-engineer', false),
  ('link', 'jobs', 'Arc.dev - vagas remotas para devs', 'Arc.dev - remote jobs for devs',
   'Plataforma gratuita para freelancers e full-time remoto.', 'Free platform for freelance and full-time remote.',
   'https://arc.dev/talent', false),
  ('article', 'negotiation', 'Como responder expectativa salarial', 'How to answer salary expectations',
   'Estratégia para não se desvalorizar no phone screen.', 'Strategy so you do not underprice yourself in the phone screen.',
   'https://www.levels.fyi/services/', true),
  ('video', 'showcase', 'Exemplo de standup em inglês', 'Example standup in English',
   'Como dar update claro e conciso na daily.', 'How to give a clear, concise daily update.',
   'https://www.youtube.com/embed/MsxcpZr1LpM', false)
ON CONFLICT (kind, title_pt) DO NOTHING;

-- ---------------------------------------------------------
-- COMPANIES: refresh hiring flags and add remote-first hirers.
-- ---------------------------------------------------------

UPDATE public.companies SET hiring = true
WHERE name = 'Vercel' AND website = 'https://vercel.com';

UPDATE public.companies SET hiring = true
WHERE name = 'GitLab' AND website = 'https://gitlab.com';

UPDATE public.companies SET hiring = true
WHERE name = 'Doist' AND website = 'https://doist.com';

UPDATE public.companies SET hiring = true
WHERE name = 'Automattic' AND website = 'https://automattic.com';

INSERT INTO public.companies (name, website, description_pt, description_en, tags, hiring)
SELECT v.name, v.website, v.description_pt, v.description_en, v.tags, v.hiring
FROM (VALUES
  ('Remote', 'https://remote.com', 'Plataforma global de RH e payroll (EOR).','Global HR and payroll platform (EOR).', ARRAY['EOR','platform']::TEXT[], false),
  ('Deel', 'https://www.deel.com', 'Contratação global e payroll para remotos.','Global hiring and payroll for remote workers.', ARRAY['EOR','B2B']::TEXT[], false),
  ('Uber', 'https://www.uber.com', 'Contrata engenheiros remotos em várias regiões.','Hires remote engineers across regions.', ARRAY['tech','scale']::TEXT[], false),
  ('Stripe', 'https://stripe.com', 'Pagamentos; contrata remoto latam em alguns times.','Payments; hires LatAm remote in some teams.', ARRAY['fintech','tech']::TEXT[], false),
  ('Shopify', 'https://www.shopify.com', 'Digital by default, contrata remoto.','Digital by default, hires remote.', ARRAY['ecommerce','tech']::TEXT[], false),
  ('Toptal', 'https://www.toptal.com', 'Rede de talentos remotos; cadastro gratuito.','Remote talent network; free to join.', ARRAY['marketplace','network']::TEXT[], true),
  ('X-Team', 'https://x-team.com', 'Comunidade de devs remotos alocados em clientes.','Remote dev community placed at clients.', ARRAY['network','community']::TEXT[], true),
  ('Near', 'https://near.com.br', 'Conexão de talentos latam com empresas globais.','Connects LatAm talent with global companies.', ARRAY['latam','network']::TEXT[], true)
) AS v(name, website, description_pt, description_en, tags, hiring)
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies c WHERE c.name = v.name
);