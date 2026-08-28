"use client";

import { useEffect, useMemo, useState } from "react";
import { InvoiceData, InvoicePreview } from "@/components/InvoicePreview";
import { useI18n } from "@/lib/i18n";

const PRINT_STORAGE_KEY = "invoice-generator-print-data";

export default function InvoicePrintPage() {
  const { t, locale } = useI18n();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(PRINT_STORAGE_KEY);
    if (!raw) return;
    try {
      setInvoice(JSON.parse(raw) as InvoiceData);
    } catch {
      setInvoice(null);
    }
  }, []);

  useEffect(() => {
    if (!invoice) return;
    const timer = setTimeout(() => {
      window.print();
    }, 80);
    return () => clearTimeout(timer);
  }, [invoice]);

  const body = useMemo(() => {
    if (!invoice) {
      return <div className="p-8 text-sm text-zinc-600">{t("invoice.printDataMissing")}</div>;
    }
    return <InvoicePreview data={invoice} t={t} locale={locale} isPrint />;
  }, [invoice, t, locale]);

  return (
    <main className="min-h-screen bg-white p-4 print:p-0">
      {body}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-preview-root {
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

