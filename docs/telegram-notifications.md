# Telegram Event Notifications Setup Guide

RemoteDevs BR supports real-time Telegram alerts for key community and operational events:
- **Project Submissions:** When a developer submits a side project for approval.
- **Mock Interviews Booked:** When a candidate books an interview slot.
- **Mock Interview Purchases:** When a user buys a session package.
- **Pro Subscriptions:** When a user subscribes to RemoteDevs Pro.
- **Recruiter Interest:** When a recruiter reaches out to a candidate.

---

## 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts to choose a name and username (e.g., `RemoteDevsAlertsBot`).
3. BotFather will provide an API token that looks like:
   ```text
   7123456789:AAHKl...xyz123
   ```
4. Save this token: it is your `TELEGRAM_BOT_TOKEN`.
5. Open your newly created bot in Telegram and click **Start** (or send `/start`) so the bot is allowed to message you.

---

## 2. Get Your Telegram Chat ID

### Option A: Personal Chat ID
1. Search for [@userinfobot](https://t.me/userinfobot) in Telegram and click **Start**.
2. The bot will reply with your user ID number (e.g., `123456789`).
3. This is your `TELEGRAM_CHAT_ID`.

### Option B: Channel or Group Chat ID
1. Create a Telegram group or channel (e.g., "RemoteDevs BR Alerts").
2. Add your bot to the group/channel as an administrator.
3. Send a test message in the group.
4. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser.
5. Look for `"chat":{"id": -100xxxxxxxxxx}` in the JSON response. That negative number is your `TELEGRAM_CHAT_ID`.

---

## 3. Configure Supabase Secrets

Set the secrets in your Supabase project using either method below.

### Method A: Using Supabase CLI
Run the following command from the project root:
```bash
supabase secrets set TELEGRAM_BOT_TOKEN="your_bot_token_here" TELEGRAM_CHAT_ID="your_chat_id_here"
```

### Method B: Using Supabase Dashboard
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Navigate to **Project Settings** -> **Edge Functions** -> **Secrets**.
4. Add the following secrets:
   - Name: `TELEGRAM_BOT_TOKEN`, Value: `<YOUR_BOT_TOKEN>`
   - Name: `TELEGRAM_CHAT_ID`, Value: `<YOUR_CHAT_ID>`

---

## 4. Deploy Edge Functions

Deploy the updated edge functions to Supabase:
```bash
supabase functions deploy send-notification
supabase functions deploy stripe-webhook
supabase functions deploy recruiter-interest
```

---

## 5. Safe Fallback Behavior

If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing from the environment:
- The system will log a helpful notice in function logs (`[telegram] Skipping notification: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured`).
- User actions (such as submitting projects or booking slots) will complete normally without errors or interruptions.
