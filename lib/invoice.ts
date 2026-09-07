export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoiceData {
  logoDataUrl?: string;
  invoiceNumber: string;
  fromText: string;
  billToText: string;
  shipToText: string;
  date: string;
  paymentTerms: string;
  dueDate: string;
  poNumber: string;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  currency: string;
  rawDate?: string;
  rawDueDate?: string;
}

export const SUPPORTED_INVOICE_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type InvoiceCurrency = (typeof SUPPORTED_INVOICE_CURRENCIES)[number];

export function normalizeInvoiceCurrency(currency: string): InvoiceCurrency {
  const normalized = currency?.toUpperCase();
  return SUPPORTED_INVOICE_CURRENCIES.includes(normalized as InvoiceCurrency) ? (normalized as InvoiceCurrency) : "USD";
}

const mapLocale = (locale: string) => (locale === "pt" ? "pt-BR" : "en-US");

export function formatDate(isoDate: string | undefined, locale: string) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(mapLocale(locale), { month: "long", day: "numeric", year: "numeric" });
}

export function formatCurrency(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(mapLocale(locale), {
    style: "currency",
    currency: normalizeInvoiceCurrency(currency),
  }).format(Number.isFinite(value) ? value : 0);
}

export function calculateSubtotal(items: InvoiceItem[]) {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
}