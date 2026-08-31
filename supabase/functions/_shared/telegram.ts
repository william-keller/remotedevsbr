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
