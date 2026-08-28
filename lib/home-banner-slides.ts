export type HomeBannerSlide = {
  id: string;
  html_pt: string;
  html_en: string;
};

const slideShell = (inner: string) =>
  `<section class="relative gradient-hero text-foreground dark:text-foreground overflow-hidden min-h-[calc(100dvh-4rem)] md:min-h-0 flex flex-col justify-center">
  <div class="absolute inset-0 opacity-30 [background-image:radial-gradient(hsl(var(--primary-glow)/0.3)_1px,transparent_1px)] [background-size:24px_24px]"></div>
  <div class="container relative py-12 md:py-36 max-w-4xl">
    ${inner}
  </div>
</section>`;

const sparklesSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

const arrowRightSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

const btnPrimary =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-11 px-8 gradient-gold text-gold-foreground hover:opacity-90 shadow-glow";

const btnOutline =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-11 px-8 border bg-white/10 border-white/30 text-white hover:bg-white/20";

const btnEmerald =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-11 px-8 bg-emerald-600 text-white hover:bg-emerald-700 shadow-glow";

const defaultHeroPt = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold mb-6">
      ${sparklesSvg} Para devs brasileiros
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Sua jornada para uma vaga remota nos EUA começa aqui.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Currículo ATS com IA, lista de empresas que contratam BR, aulas, ferramentas, vagas e uma jornada passo a passo. Tudo em um só lugar.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/analyze" class="${btnPrimary}">${sparklesSvg} Analisar meu currículo</a>
      <a href="/auth" class="${btnOutline}">Entrar na comunidade ${arrowRightSvg}</a>
    </div>
    <p class="mt-3 text-xs text-white/70">Sem login. Receba seu Readiness Score em segundos.</p>`);

const defaultHeroEn = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold mb-6">
      ${sparklesSvg} For Brazilian developers
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Your journey to a remote US job starts here.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      AI ATS resume, list of companies hiring Brazilians, classes, tools, jobs and a step-by-step journey. All in one place.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/analyze" class="${btnPrimary}">${sparklesSvg} Analyze my resume</a>
      <a href="/auth" class="${btnOutline}">Join the community ${arrowRightSvg}</a>
    </div>
    <p class="mt-3 text-xs text-white/70">No login required. Get your Readiness Score in seconds.</p>`);

const jobsHeroPt = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-6">
      Vagas remotas
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Vagas remotas que pagam em dólar.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Mural atualizado, filtros por stack e senioridade, e tracker de candidaturas para organizar sua busca.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/jobs" class="${btnPrimary}">Ver vagas ${arrowRightSvg}</a>
      <a href="/journey" class="${btnOutline}">Ver a jornada</a>
    </div>`);

const jobsHeroEn = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-6">
      Remote jobs
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Remote jobs that pay in USD.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Updated job board, stack and seniority filters, and an application tracker to stay on top of your search.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/jobs" class="${btnPrimary}">Browse jobs ${arrowRightSvg}</a>
      <a href="/journey" class="${btnOutline}">See the journey</a>
    </div>`);

const toolsHeroPt = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300 mb-6">
      Ferramentas grátis
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Ferramentas grátis com IA.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Currículo, LinkedIn, carta de apresentação e calculadora salarial - tudo pensado para devs BR no mercado US.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/tools" class="${btnPrimary}">Explorar ferramentas ${arrowRightSvg}</a>
      <a href="/tools/resume" class="${btnOutline}">Currículo ATS</a>
    </div>`);

const toolsHeroEn = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300 mb-6">
      Free tools
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Free AI-powered tools.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Resume, LinkedIn, cover letter, and salary calculator - built for Brazilian devs targeting the US market.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/tools" class="${btnPrimary}">Explore tools ${arrowRightSvg}</a>
      <a href="/tools/resume" class="${btnOutline}">ATS resume</a>
    </div>`);

const recruiterHeroPt = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-6">
      Para recrutadores
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Contrate os melhores desenvolvedores do Brasil.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Tenha acesso direto a engenheiros seniores, fluentes em inglês e prontos para trabalhar no fuso horário dos EUA. Sem intermediários ou taxas de contratação.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/recruiter/auth" class="${btnEmerald}">Contratar talentos ${arrowRightSvg}</a>
      <a href="/recruiter/pricing" class="${btnOutline}">Ver planos</a>
    </div>`);

const recruiterHeroEn = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 mb-6">
      For recruiters
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Hire top Brazilian developers.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Get direct access to senior, English-fluent engineers ready for US timezone overlap. No middlemen, no placement fees.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="/recruiter/auth" class="${btnEmerald}">Start hiring ${arrowRightSvg}</a>
      <a href="/recruiter/pricing" class="${btnOutline}">View plans</a>
    </div>`);

const companyHeroPt = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300 mb-6">
      Abertura PJ Grátis + 10% de desconto
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Abra sua empresa PJ de graça e receba em dólar.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Economize impostos ao receber do exterior. Abertura de CNPJ 100% gratuita e desconto exclusivo de 10% na mensalidade com a Groovy Contabilidade.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="https://www.groovybr.com/parceiros/br-remote-devs" target="_blank" rel="noopener noreferrer nofollow" class="${btnPrimary}">Garantir 10% de desconto ${arrowRightSvg}</a>
      <a href="https://www.groovybr.com/calculadora-de-impostos-pj" target="_blank" rel="noopener noreferrer nofollow" class="${btnOutline}">Simulador de impostos</a>
    </div>`);

const companyHeroEn = slideShell(`
    <span class="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300 mb-6">
      Free PJ Setup + 10% Discount
    </span>
    <h1 class="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05]">
      Open your Brazilian PJ company for free.
    </h1>
    <p class="mt-6 text-lg md:text-xl text-white/80 max-w-2xl">
      Optimize your taxes when receiving USD. 100% free CNPJ registration and an exclusive 10% discount in partnership with Groovy.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <a href="https://www.groovybr.com/parceiros/br-remote-devs" target="_blank" rel="noopener noreferrer nofollow" class="${btnPrimary}">Claim 10% discount ${arrowRightSvg}</a>
      <a href="https://www.groovybr.com/calculadora-de-impostos-pj" target="_blank" rel="noopener noreferrer nofollow" class="${btnOutline}">Tax simulator</a>
    </div>`);

export const HOME_BANNER_SLIDES: HomeBannerSlide[] = [
  {
    id: "default-hero",
    html_pt: defaultHeroPt,
    html_en: defaultHeroEn,
  },
  {
    id: "recruiter-hero",
    html_pt: recruiterHeroPt,
    html_en: recruiterHeroEn,
  },
  {
    id: "jobs-hero",
    html_pt: jobsHeroPt,
    html_en: jobsHeroEn,
  },
  {
    id: "tools-hero",
    html_pt: toolsHeroPt,
    html_en: toolsHeroEn,
  },
  {
    id: "company-hero",
    html_pt: companyHeroPt,
    html_en: companyHeroEn,
  },
];

export const BANNER_AUTOPLAY_DELAY_MS = 6000;
