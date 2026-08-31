"use client";

import Image from "next/image";
import { useEffect } from "react";

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

interface InvoicePreviewProps {
  data: InvoiceData;
  t: (key: string) => string;
  locale: string;
  isPrint?: boolean;
}

const mapLocale = (locale: string) => (locale === "pt" ? "pt-BR" : "en-US");

const formatDate = (isoDate: string | undefined, locale: string) => {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(mapLocale(locale), { month: "long", day: "numeric", year: "numeric" });
};

export const SUPPORTED_INVOICE_CURRENCIES = ["BRL", "USD", "EUR"] as const;
export type InvoiceCurrency = (typeof SUPPORTED_INVOICE_CURRENCIES)[number];

export function normalizeInvoiceCurrency(currency: string): InvoiceCurrency {
  const normalized = currency?.toUpperCase();
  return SUPPORTED_INVOICE_CURRENCIES.includes(normalized as InvoiceCurrency) ? (normalized as InvoiceCurrency) : "USD";
}

const formatCurrency = (value: number, currency: string, locale: string) =>
  new Intl.NumberFormat(mapLocale(locale), { style: "currency", currency: normalizeInvoiceCurrency(currency) }).format(
    Number.isFinite(value) ? value : 0
  );

export function calculateSubtotal(items: InvoiceItem[]) {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
}

const isFieldEmptyOrPlaceholder = (value: string | undefined, placeholder: string) => {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === placeholder.trim();
};

const getFieldValue = (value: string | undefined, placeholder: string, isPrint: boolean) => {
  if (isPrint) {
    if (!value) return "";
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === placeholder.trim()) {
      return "";
    }
    return value;
  }
  return value || placeholder;
};

const shouldHideField = (value: string | undefined, placeholder: string, isPrint: boolean) => {
  if (!isPrint) return false;
  return isFieldEmptyOrPlaceholder(value, placeholder);
};

export function InvoicePreview({ data, t, locale, isPrint = false }: InvoicePreviewProps) {
  const subtotal = calculateSubtotal(data.items);
  const total = subtotal;

  useEffect(() => {
    if (isPrint) {
      const originalTitle = document.title;
      document.title = `${t("invoice.title")} ${data.invoiceNumber || "1"}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isPrint, data.invoiceNumber, t]);

  return (
    <div className="bg-white text-black w-full max-w-[900px] mx-auto rounded-xl border border-zinc-200 p-8 shadow-sm invoice-preview-root">
      <div className="grid grid-cols-2 gap-10">
        <div>
          {(!isPrint || data.logoDataUrl) && (
            <div className="h-[95px] w-[150px] bg-zinc-100 rounded-md overflow-hidden mb-6 border border-zinc-200 flex items-center justify-center">
              {data.logoDataUrl ? (
                <Image src={data.logoDataUrl} alt={t("invoice.logoAlt")} width={150} height={95} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-zinc-500">{t("invoice.logoPlaceholder")}</span>
              )}
            </div>
          )}
          <div className="space-y-5">
            {!shouldHideField(data.fromText, t("invoice.fromPlaceholder"), isPrint) && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">{t("invoice.from")}</p>
                <p className="text-sm leading-5 whitespace-pre-wrap">
                  {getFieldValue(data.fromText, t("invoice.fromPlaceholder"), isPrint)}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              {!shouldHideField(data.billToText, t("invoice.billToPlaceholder"), isPrint) && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{t("invoice.billTo")}</p>
                  <p className="text-sm leading-5 whitespace-pre-wrap">
                    {getFieldValue(data.billToText, t("invoice.billToPlaceholder"), isPrint)}
                  </p>
                </div>
              )}
              {!shouldHideField(data.shipToText, t("invoice.shipToPlaceholder"), isPrint) && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{t("invoice.shipTo")}</p>
                  <p className="text-sm leading-5 whitespace-pre-wrap">
                    {getFieldValue(data.shipToText, t("invoice.shipToPlaceholder"), isPrint)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="text-right">
            <h1 className="text-5xl leading-none font-semibold tracking-wide text-[#1f2d3d]">{t("invoice.title")}</h1>
            {(!isPrint || data.invoiceNumber) && (
              <p className="text-2xl text-zinc-500 mt-2">
                {data.invoiceNumber ? `# ${data.invoiceNumber}` : (isPrint ? "" : "# 1")}
              </p>
            )}
          </div>

          <div className="mt-8 space-y-2 text-sm">
            {!shouldHideField(data.date, t("invoice.datePlaceholder"), isPrint) && (
              <div className="grid grid-cols-[1fr_auto] gap-5">
                <span className="text-zinc-500">{t("invoice.date")}:</span>
                <span>{formatDate(data.rawDate, locale) || data.date}</span>
              </div>
            )}
            {!shouldHideField(data.paymentTerms, t("invoice.paymentTermsPlaceholder"), isPrint) && (
              <div className="grid grid-cols-[1fr_auto] gap-5">
                <span className="text-zinc-500">{t("invoice.paymentTerms")}:</span>
                <span>{getFieldValue(data.paymentTerms, t("invoice.paymentTermsPlaceholder"), isPrint)}</span>
              </div>
            )}
            {!shouldHideField(data.dueDate, t("invoice.datePlaceholder"), isPrint) && (
              <div className="grid grid-cols-[1fr_auto] gap-5">
                <span className="text-zinc-500">{t("invoice.dueDate")}:</span>
                <span>{formatDate(data.rawDueDate, locale) || data.dueDate}</span>
              </div>
            )}
            {!shouldHideField(data.poNumber, t("invoice.poNumberPlaceholder"), isPrint) && (
              <div className="grid grid-cols-[1fr_auto] gap-5">
                <span className="text-zinc-500">{t("invoice.poNumber")}:</span>
                <span>{getFieldValue(data.poNumber, t("invoice.poNumberPlaceholder"), isPrint)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 bg-zinc-100 rounded-md px-4 py-3 grid grid-cols-[1fr_auto] gap-6 text-xl font-semibold">
            <span>{t("invoice.balanceDue")}:</span>
            <span>{formatCurrency(total, data.currency, locale)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-zinc-800 text-white rounded-md px-4 py-2.5 grid grid-cols-[1fr_90px_110px_120px] gap-3 text-sm font-medium">
          <span>{t("invoice.item")}</span>
          <span className="text-right">{t("invoice.quantity")}</span>
          <span className="text-right">{t("invoice.rate")}</span>
          <span className="text-right">{t("invoice.amount")}</span>
        </div>
        <div className="mt-2 text-sm">
          {data.items.map((item) => {
            const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
            return (
              <div key={item.id} className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-2 border-b border-zinc-200 last:border-b-0">
                <span className="break-words">
                  {getFieldValue(item.description, t("invoice.itemPlaceholder"), isPrint)}
                </span>
                <span className="text-right">{item.quantity || 0}</span>
                <span className="text-right">{formatCurrency(item.rate || 0, data.currency, locale)}</span>
                <span className="text-right">{formatCurrency(amount, data.currency, locale)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-[290px] space-y-1 text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <span className="text-zinc-500">{t("invoice.subtotal")}:</span>
            <span>{formatCurrency(subtotal, data.currency, locale)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-4 text-base font-semibold">
            <span className="text-zinc-500">{t("invoice.total")}:</span>
            <span>{formatCurrency(total, data.currency, locale)}</span>
          </div>
        </div>
      </div>

      {(!shouldHideField(data.notes, t("invoice.notesPlaceholder"), isPrint) ||
        !shouldHideField(data.terms, t("invoice.termsPlaceholder"), isPrint)) && (
        <div className="mt-10 max-w-[520px] space-y-5 text-sm">
          {!shouldHideField(data.notes, t("invoice.notesPlaceholder"), isPrint) && (
            <div>
              <p className="text-zinc-500 mb-1">{t("invoice.notes")}:</p>
              <p className="whitespace-pre-wrap">
                {getFieldValue(data.notes, t("invoice.notesPlaceholder"), isPrint)}
              </p>
            </div>
          )}
          {!shouldHideField(data.terms, t("invoice.termsPlaceholder"), isPrint) && (
            <div>
              <p className="text-zinc-500 mb-1">{t("invoice.terms")}:</p>
              <p className="whitespace-pre-wrap">
                {getFieldValue(data.terms, t("invoice.termsPlaceholder"), isPrint)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
