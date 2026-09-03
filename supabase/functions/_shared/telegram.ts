// Telegram Notification Helper for RemoteDevs BR
// Sends HTML formatted messages via Telegram Bot API.

export interface TelegramMessageOptions {
  botToken?: string;
  chatId?: string;
  disableWebPagePreview?: boolean;
}

export async function sendTelegramMessage(
  htmlText: string,
  options?: TelegramMessageOptions
): Promise<boolean> {
  const token = options?.botToken ?? Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = options?.chatId ?? Deno.env.get("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    console.warn(
      "[telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured."
    );
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: options?.disableWebPagePreview ?? false,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[telegram] API error (${res.status}): ${errBody}`);
      return false;
    }

    console.log("[telegram] Message sent successfully");
    return true;
  } catch (err: any) {
    console.error("[telegram] Failed to send Telegram message:", err.message);
    return false;
  }
}

// Utility to escape HTML special characters for Telegram HTML mode
export function escapeHtml(str: string = ""): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Formatted event helpers
export async function notifyProjectSubmitted(data: {
  title: string;
  tagline?: string;
  url?: string;
  stack?: string[] | string;
  userEmail?: string;
  userId?: string;
}) {
  const title = escapeHtml(data.title);
  const tagline = escapeHtml(data.tagline || "");
  const url = data.url ? escapeHtml(data.url) : "";
  const user = escapeHtml(data.userEmail || data.userId || "Anonymous");
  const stack = Array.isArray(data.stack)
    ? escapeHtml(data.stack.join(", "))
    : escapeHtml(String(data.stack || ""));

  const message = [
    `🚀 <b>New Project Submitted!</b>`,
    ``,
    `📌 <b>Title:</b> ${title}`,
    tagline ? `📝 <b>Tagline:</b> ${tagline}` : null,
    url ? `🔗 <b>URL:</b> ${url}` : null,
    stack ? `🛠 <b>Stack:</b> ${stack}` : null,
    `👤 <b>Submitted by:</b> ${user}`,
    `⏳ <b>Status:</b> Pending Approval in Admin Panel`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}

export async function notifyMockInterviewBooked(data: {
  date: string;
  startTime: string;
  endTime: string;
  interviewerName?: string;
  userEmail?: string;
  userId?: string;
}) {
  const user = escapeHtml(data.userEmail || data.userId || "User");
  const interviewer = escapeHtml(data.interviewerName || "Assigned Interviewer");
  const date = escapeHtml(data.date);
  const time = `${escapeHtml(data.startTime.slice(0, 5))} - ${escapeHtml(data.endTime.slice(0, 5))}`;

  const message = [
    `🎙 <b>Mock Interview Scheduled!</b>`,
    ``,
    `📅 <b>Date:</b> ${date}`,
    `⏰ <b>Time:</b> ${time}`,
    `👨‍🏫 <b>Interviewer:</b> ${interviewer}`,
    `👤 <b>Candidate:</b> ${user}`,
  ].join("\n");

  return sendTelegramMessage(message);
}

export async function notifyMockInterviewPurchased(data: {
  packageName?: string;
  sessionCount?: number | string;
  userEmail?: string;
  amountCents?: number;
}) {
  const user = escapeHtml(data.userEmail || "Customer");
  const pkg = escapeHtml(data.packageName || "Mock Interview Package");
  const sessions = data.sessionCount || 1;
  const amountStr = data.amountCents
    ? `R$ ${(data.amountCents / 100).toFixed(2)}`
    : "";

  const message = [
    `💳 <b>Mock Interview Package Purchased!</b>`,
    ``,
    `📦 <b>Package:</b> ${pkg} (${sessions} session${Number(sessions) > 1 ? "s" : ""})`,
    amountStr ? `💰 <b>Amount:</b> ${amountStr}` : null,
    `👤 <b>User:</b> ${user}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}

export async function notifyJobSubmitted(data: {
  role: string;
  companyName: string;
  location?: string;
  workFormat?: string;
  seniority?: string;
  jobType?: string;
  salary?: string;
  stack?: string[];
  applyUrl?: string;
  userEmail?: string;
  userId?: string;
}) {
  const role = escapeHtml(data.role);
  const company = escapeHtml(data.companyName);
  const location = escapeHtml(data.location || "");
  const workFormat = escapeHtml(data.workFormat || "");
  const seniority = escapeHtml(data.seniority || "");
  const jobType = escapeHtml(data.jobType || "");
  const salary = escapeHtml(data.salary || "");
  const stack = Array.isArray(data.stack)
    ? escapeHtml(data.stack.join(", "))
    : escapeHtml(String(data.stack || ""));
  const url = data.applyUrl ? escapeHtml(data.applyUrl) : "";
  const user = escapeHtml(data.userEmail || data.userId || "Anonymous");

  const message = [
    `💼 <b>New Job Submitted!</b>`,
    ``,
    `📌 <b>Role:</b> ${role}`,
    `🏢 <b>Company:</b> ${company}`,
    location ? `📍 <b>Location:</b> ${location}` : null,
    workFormat ? `🖥 <b>Work format:</b> ${workFormat}` : null,
    seniority ? `📊 <b>Seniority:</b> ${seniority}` : null,
    jobType ? `🗓 <b>Type:</b> ${jobType}` : null,
    salary ? `💰 <b>Salary:</b> ${salary}` : null,
    stack ? `🛠 <b>Stack:</b> ${stack}` : null,
    url ? `🔗 <b>Apply URL:</b> ${url}` : null,
    `👤 <b>Submitted by:</b> ${user}`,
    `⏳ <b>Status:</b> Pending Approval in Admin Panel`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}

export async function notifyJobRejected(data: {
  role: string;
  companyName: string;
  userEmail?: string;
  userId?: string;
}) {
  const role = escapeHtml(data.role);
  const company = escapeHtml(data.companyName);
  const user = escapeHtml(data.userEmail || data.userId || "Anonymous");

  const message = [
    `❌ <b>Job Submission Rejected</b>`,
    ``,
    `📌 <b>Role:</b> ${role}`,
    `🏢 <b>Company:</b> ${company}`,
    `👤 <b>Submitted by:</b> ${user}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}

export async function notifyProSubscription(data: {
  userEmail?: string;
  plan?: string;
}) {
  const user = escapeHtml(data.userEmail || "Customer");
  const plan = escapeHtml(data.plan || "monthly");

  const message = [
    `⭐ <b>New Pro Subscriber!</b>`,
    ``,
    `👤 <b>User:</b> ${user}`,
    `🏷 <b>Plan:</b> ${plan.toUpperCase()}`,
  ].join("\n");

  return sendTelegramMessage(message);
}

export async function notifyRecruiterInterest(data: {
  companyName: string;
  candidateId: string;
  message?: string;
}) {
  const company = escapeHtml(data.companyName);
  const candidateId = escapeHtml(data.candidateId);
  const note = data.message ? escapeHtml(data.message) : "";

  const message = [
    `💼 <b>Recruiter Reached Out to Candidate!</b>`,
    ``,
    `🏢 <b>Company:</b> ${company}`,
    `🎯 <b>Candidate ID:</b> ${candidateId}`,
    note ? `💬 <b>Message:</b> <i>${note.slice(0, 200)}</i>` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}

export async function notifyOnstriderScrape(data: {
  inserted: number;
  updated: number;
  deactivated: number;
  fetched: number;
}) {
  const message = [
    `🔄 <b>Onstrider Scrape Complete</b>`,
    ``,
    `📥 <b>Fetched:</b> ${data.fetched}`,
    `✅ <b>Inserted:</b> ${data.inserted}`,
    `🔄 <b>Updated:</b> ${data.updated}`,
    `⏸ <b>Deactivated:</b> ${data.deactivated}`,
  ].join("\n");

  return sendTelegramMessage(message);
}

export async function notifyOnstriderScrapeFailed(error: string) {
  const msg = escapeHtml(error || "Unknown error");

  const message = [
    `⚠️ <b>Onstrider Scrape Failed</b>`,
    ``,
    `🛑 <b>Error:</b> ${msg}`,
  ].join("\n");

  return sendTelegramMessage(message);
}

const AREA_LABELS: Record<string, string> = {
  dev: "Desenvolvedor(a)",
  tech_lead: "Tech Lead",
  designer_qa: "Designer/QA",
  data: "Área de Dados",
  product: "Área de Produto",
  other_it: "Outros cargos de TI",
  not_it: "Não trabalho como TI",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  lt_1_5: "Até 1 ano e meio",
  r1_5_2: "De 1 ano e meio a 2 anos",
  r2_3: "De 2 a 3 anos",
  r3_5: "De 3 a 5 anos",
  r5_10: "De 5 a 10 anos",
  r10_20: "De 10 a 20 anos",
  gt_20: "Mais de 20 anos",
};

const INCOME_LABELS: Record<string, string> = {
  lt_5k: "Até 5k / mês",
  r5_6_5k: "5k - 6,5k / mês",
  r6_5_8k: "6,5k - 8k / mês",
  r8_10k: "8k - 10k / mês",
  r10_15k: "10k - 15k / mês",
  r15_20k: "15k - 20k / mês",
  gt_20k: "Mais de 20k / mês",
};

const PAIN_LABELS: Record<string, string> = {
  english: "Inglês",
  recruiter_contacts: "Receber contatos de recrutadores",
  find_international_jobs: "Encontrar vagas internacionais",
  technical_interviews: "Passar nas entrevistas técnicas",
  other: "Outra dificuldade",
};

const STAGE_LABELS: Record<string, string> = {
  not_started_preparing: "Não comecei, quero me preparar agora",
  searching_need_help: "Buscando vaga, preciso de ajuda",
  in_market_seeking_better: "No mercado, quero algo melhor",
  researching_not_priority: "Ainda pesquisando, não é prioridade",
};

function labelOr(map: Record<string, string>, key: unknown, fallback: string): string {
  const mapped =
    typeof key === "string" && key in map ? map[key] : "";
  const raw = mapped || (typeof key === "string" ? key : "") || fallback;
  return escapeHtml(raw);
}

export async function notifyOnboardingCompleted(data: {
  userEmail?: string;
  userId?: string;
  answers?: Record<string, unknown>;
}) {
  const a = data.answers ?? {};
  const user = escapeHtml(data.userEmail || data.userId || "Anonymous");

  const area = labelOr(AREA_LABELS, a.area, "Não informado");
  const experience = labelOr(EXPERIENCE_LABELS, a.experience_bucket, "Não informado");
  const income = labelOr(INCOME_LABELS, a.monthly_income_bucket, "Não informado");
  const pain = labelOr(PAIN_LABELS, a.pain_point, "Não informado");
  const stage = labelOr(STAGE_LABELS, a.intl_search_stage, "Não informado");

  const areaCustom = typeof a.area_custom === "string" && a.area_custom.trim()
    ? escapeHtml(a.area_custom.trim())
    : "";
  const painCustom = typeof a.pain_point_custom === "string" && a.pain_point_custom.trim()
    ? escapeHtml(a.pain_point_custom.trim())
    : "";

  const message = [
    `🧭 <b>New User Completed Onboarding!</b>`,
    ``,
    `👤 <b>User:</b> ${escapeHtml(data.userEmail || "")} (${escapeHtml(data.userId || "")})`,
    ``,
    `🎯 <b>Área de atuação:</b> ${area}`,
    areaCustom ? `    (<i>${areaCustom}</i>)` : null,
    `⏳ <b>Experiência:</b> ${experience}`,
    `💰 <b>Ganho médio/mês:</b> ${income}`,
    `🧩 <b>Maior dificuldade:</b> ${pain}`,
    painCustom ? `    (<i>${painCustom}</i>)` : null,
    `📍 <b>Momento da busca:</b> ${stage}`,
    ``,
    `👤 <b>Cadastrado como:</b> ${user}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}
