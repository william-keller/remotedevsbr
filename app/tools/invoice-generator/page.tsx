import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { pt } from "@/lib/i18n-dicts";
import { InvoiceGeneratorPage } from "./invoice-generator-page";

export const metadata: Metadata = buildMetadata({
  title: pt("invoice.seoTitle"),
  description: pt("invoice.seoDesc"),
  canonicalPath: "/tools/invoice-generator",
});

export default function Page() {
  return <InvoiceGeneratorPage />;
}