# Ebook Landing Page - Design Spec

## Product

LinkedIn Performance Playbook. A digital ebook for Brazilian developers targeting international remote roles. Sold as a standalone product (no account required). Buyer receives both pt-BR and EN versions after purchase.

## Pricing

- BRL 67.90 (Brazil)
- USD 19.00 (International)
- Single price card with currency toggle, not a pricing grid.

## Delivery

- Stripe one-time payment (mode: "payment")
- Success page with download links for both language versions
- Free preview PDFs available before purchase (per current locale)
- No account required for purchase

## Design tokens

Uses existing project tokens only. No new CSS variables.

| Token | Usage |
|---|---|
| `--primary` (green) | Buy button, interactive elements |
| `--gold` | Premium signal: cover border, price badge |
| `--background` | Page base |
| `--card` | Content containers (pricing card only) |
| `--muted-foreground` | Body copy, descriptions |
| `--foreground` | Headlines |

Typography: Space Grotesk (headlines), Inter (body). Both already loaded.

## Page structure

### Hero (left-aligned, asymmetric)

Two-column on desktop, stacked on mobile.

**Left:** Ebook cover image with floating shadow effect. CSS `transform: perspective(800px) rotateY(-3deg)` for subtle 3D depth. Gold border (`border-gold/30`).

**Right:**
- Headline: `text-4xl md:text-5xl font-bold` in Space Grotesk
- One-line value proposition
- Two CTAs: "Download Preview" (outline) + "Buy Now - R$67.90" (gradient-gold)

No eyebrow label. No chip/badge above the headline.

### Content Preview (key differentiator)

Accordion-style chapter list. Each chapter expands to show a brief preview of what's inside. This replaces the traditional "benefits grid" as the primary trust-building element. Treats the reader as an evaluator, not an impulse buyer.

Chapters (from the PDF structure):
1. Headline Optimization
2. Profile Architecture
3. Networking Strategy
4. Content Strategy
5. Visibility Tactics

### What You'll Learn

2-column grid of 4 benefit items. No cards, no borders. Just icon + heading + one-line description. Plain, direct.

### Pricing

Single centered card. BRL/USD toggle above the price. Price displayed at `text-5xl md:text-6xl font-bold`. Below price: two included items (both versions, instant download). Buy button: `gradient-gold text-gold-foreground`.

### FAQ

3-4 questions in accordion format. Follows the same pattern as `/mock-interview` FAQ section.

### Final CTA

`gradient-go` card with centered text. "Start optimizing your LinkedIn today" or similar direct CTA.

## Multi-currency approach

Two options for implementation:

**Option A (Recommended):** Single Stripe product, two prices. Frontend detects locale (pt = BRL, en = USD) and sends the appropriate `price_data` to the edge function. Stripe handles currency.

**Option B:** Two separate Stripe products (one per currency). More admin overhead but clearer reporting.

Recommend Option A for simplicity. The edge function accepts a `currency` parameter ("brl" or "usd") and constructs the price_data accordingly.

## Edge function

New function: `supabase/functions/ebook-checkout/index.ts`

Modeled on `mock-interview-checkout`:
- No auth required (standalone product)
- Accepts `{ currency: "brl" | "usd" }`
- Creates Stripe checkout session with mode: "payment"
- success_url: `${siteUrl}/ebook?success=1`
- cancel_url: `${siteUrl}/ebook?canceled=1`
- metadata: `{ type: "ebook", currency }`
- Returns `{ url: session.url }`

Note: Since no auth is required, the function cannot use `supabase.auth.getUser()`. Instead, it accepts an optional `email` parameter for Stripe customer lookup, or creates a session without a customer.

## Webhook update

Update `stripe-webhook/index.ts` to handle `type: "ebook"` in checkout.session.completed metadata. Minimal handling: log the purchase. No database table needed since delivery is via the success page.

## i18n keys

All new keys under `ebook.*` namespace in both `pt` and `en` dictionaries in `lib/i18n-dicts.ts`.

## Files to create/modify

1. `app/ebook/page.tsx` - Server component (metadata)
2. `app/ebook/ebook-page.tsx` - Client component (page content)
3. `supabase/functions/ebook-checkout/index.ts` - Stripe checkout
4. `supabase/functions/stripe-webhook/index.ts` - Add ebook handling
5. `lib/i18n-dicts.ts` - Add ebook.* keys
6. `app/ebook/download/[lang]/route.ts` - Streams the full PDFs from Vercel Blob

## Download URLs

The full PDFs live in Vercel Blob as **private blobs**, uploaded under the pathnames
`LinkedIn_Performance_Playbook.pdf` (EN) and `LinkedIn_Performance_Playbook_pt-BR.pdf` (PT).
The server route `app/ebook/download/[lang]/route.ts` resolves each language to its blob
pathname, reads it with the `@vercel/blob` `get()` (authenticated server-side via
`BLOB_READ_WRITE_TOKEN`), and streams it back with `Content-Type: application/pdf` and
`Content-Disposition: attachment` so the browser downloads it.

The success page links to `/ebook/download/pt` and `/ebook/download/en`. No public blob
URL is exposed to the browser, and no per-version NEXT_PUBLIC URL env var is needed.

The free preview PDFs are copied to `public/ebook/` (publicly served). The preview URLs can
be overridden via env vars:
- `NEXT_PUBLIC_EBOOK_PREVIEW_URL_PT` - pt-BR preview URL (falls back to `public/ebook/`)
- `NEXT_PUBLIC_EBOOK_PREVIEW_URL_EN` - EN preview URL (falls back to `public/ebook/`)

The success page also persists the purchase marker in `sessionStorage` so the download links
survive a refresh during the same session.

## Constraints

- No new CSS variables or design tokens
- No hardcoded full-PDF URLs in the client: delivery goes through the download route, which
  resolves private Vercel Blobs server-side
- Must work without authentication (guest Stripe checkout, `mode: "payment"`)
- Must handle both BRL (R$ 67,90) and USD (US$ 19) via a currency toggle
- Only previews are served from `/public`
